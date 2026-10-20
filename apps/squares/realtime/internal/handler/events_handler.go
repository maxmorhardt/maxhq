package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/maxmorhardt/maxhq/libs/platform/streams"
	"github.com/maxmorhardt/maxhq/libs/squares/events"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/metrics"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/service"
	"github.com/maxmorhardt/maxhq/libs/platform/api"
	"github.com/maxmorhardt/maxhq/libs/platform/logging"
)

const (
	clientRetry = 3 * time.Second

	HeaderLastEventID = "Last-Event-ID"
	queryLastEventID  = "lastEventId"
)

type EventsHandler interface {
	StreamContest(c *gin.Context)
	StreamGames(c *gin.Context)
}

type eventsHandler struct {
	streams  service.StreamService
	cfg      model.StreamConfig
	shutdown <-chan struct{}
}

func NewEventsHandler(svc service.StreamService, cfg model.StreamConfig, shutdown <-chan struct{}) EventsHandler {
	return &eventsHandler{streams: svc, cfg: cfg, shutdown: shutdown}
}

// @Summary Stream contest events
// @Description Server-sent events for one contest. The first event is a `contest.snapshot` of the contest and its participants, unless the client resumes with Last-Event-ID and the gap is still retained, in which case only the missed events are replayed. Every event carries its stream entry id (`<ms>-<seq>`) as the SSE id. An `access.revoked` event means the viewer lost access and the stream is closing.
// @Tags events
// @Produce text/event-stream
// @Param id path string true "Contest ID"
// @Param Last-Event-ID header string false "Id of the last event the client applied"
// @Param lastEventId query string false "Same as the Last-Event-ID header, for clients that cannot set headers"
// @Success 200 {string} string "text/event-stream; each data line is a JSON contest event"
// @Failure 400 {object} api.APIError
// @Failure 403 {object} api.APIError
// @Failure 404 {object} api.APIError
// @Failure 503 {object} api.APIError
// @Security BearerAuth
// @Router /events/contests/{id} [get]
func (h *eventsHandler) StreamContest(c *gin.Context) {
	log := logging.FromGin(c)

	contestID, ok := api.PathUUID(c, "id")
	if !ok {
		return
	}

	lastEventID, ok := parseLastEventID(c)
	if !ok {
		metrics.RecordStreamResult(model.StreamResultBadRequest)
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Invalid Last-Event-ID", c))
		return
	}

	user := c.GetString(api.UserKey)
	claims := api.ClaimsFromContext(c.Request.Context())
	log = log.With("contest_id", contestID)
	ctx := logging.NewContext(c.Request.Context(), log)

	sub, err := h.streams.Subscribe(ctx, contestID, user, lastEventID)
	if err != nil {
		h.rejectSubscribe(c, err)
		return
	}
	defer sub.Stop()

	w := c.Writer
	startStream(w)

	if _, err := fmt.Fprintf(w, "retry: %d\n\n", clientRetry.Milliseconds()); err != nil {
		return
	}

	if sub.Snapshot != nil {
		snapshot, err := events.NewContestEvent(events.ContestSnapshotType, contestID, events.SystemActor, sub.Snapshot)
		if err != nil {
			log.Error("failed to build the contest snapshot", "error", err)
			return
		}
		if err := writeEvent(w, sub.SnapshotID, snapshot); err != nil {
			log.Info("client went away before the snapshot was written", "error", err)
			return
		}
	}
	w.Flush()

	metrics.RecordStreamResult(model.StreamResultSuccess)
	metrics.IncActiveStreams()
	openedAt := time.Now()
	defer func() {
		metrics.DecActiveStreams()
		metrics.ObserveStreamDuration(time.Since(openedAt))
	}()

	reason := h.serve(ctx, w, sub, contestID, user, claims)
	metrics.RecordStreamClose(reason)
	log.Info("contest stream closed", "reason", reason)
}

// @Summary Stream game scores
// @Description Server-sent `game.updated` events for every NFL game as its status, period, or score changes. Each data line is `{"game": {...}}` in the shape `/games/scoreboard` returns. Public; resumable with Last-Event-ID.
// @Tags events
// @Produce text/event-stream
// @Param Last-Event-ID header string false "Id of the last event the client applied"
// @Param lastEventId query string false "Same as the Last-Event-ID header, for clients that cannot set headers"
// @Success 200 {string} string "text/event-stream; each data line is a JSON game update"
// @Failure 400 {object} api.APIError
// @Failure 503 {object} api.APIError
// @Router /events/games [get]
func (h *eventsHandler) StreamGames(c *gin.Context) {
	log := logging.FromGin(c)

	lastEventID, ok := parseLastEventID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, api.NewAPIError(http.StatusBadRequest, "Invalid Last-Event-ID", c))
		return
	}

	ctx := logging.NewContext(c.Request.Context(), log)
	sub, err := h.streams.SubscribeGames(ctx, lastEventID)
	if err != nil {
		log.Error("failed to open games stream", "error", err)
		c.JSON(http.StatusServiceUnavailable, api.NewAPIError(http.StatusServiceUnavailable, "Real-time updates unavailable", c))
		return
	}
	defer sub.Stop()

	w := c.Writer
	startStream(w)
	if _, err := fmt.Fprintf(w, "retry: %d\n\n", clientRetry.Milliseconds()); err != nil {
		return
	}
	w.Flush()

	heartbeat := time.NewTicker(h.cfg.HeartbeatInterval)
	defer heartbeat.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-h.shutdown:
			return
		case <-heartbeat.C:
			if _, err := w.WriteString(": ping\n\n"); err != nil {
				return
			}
			w.Flush()
		case event, ok := <-sub.Events:
			if !ok {
				return
			}
			if err := writeRaw(w, event.ID, event.Envelope.Type, event.Data); err != nil {
				return
			}
			w.Flush()
			metrics.IncEventSent(event.Envelope.Type)
		}
	}
}

func startStream(w gin.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	// keeps proxies from buffering the stream until it ends
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
}

func (h *eventsHandler) rejectSubscribe(c *gin.Context, err error) {
	switch {
	case errors.Is(err, errs.ErrContestNotFound):
		metrics.RecordStreamResult(model.StreamResultNotFound)
		c.JSON(http.StatusNotFound, api.NewAPIError(http.StatusNotFound, api.Message(errs.ErrContestNotFound), c))
	case errors.Is(err, errs.ErrInsufficientRole):
		metrics.RecordStreamResult(model.StreamResultUnauthorized)
		c.JSON(http.StatusForbidden, api.NewAPIError(http.StatusForbidden, "Not authorized to view this contest", c))
	default:
		logging.FromGin(c).Error("failed to open contest stream", "error", err)
		metrics.RecordStreamResult(model.StreamResultUnavailable)
		c.JSON(http.StatusServiceUnavailable, api.NewAPIError(http.StatusServiceUnavailable, "Real-time updates unavailable", c))
	}
}

func (h *eventsHandler) serve(ctx context.Context, w gin.ResponseWriter, sub *service.Subscription, contestID uuid.UUID, user string, claims *api.Claims) model.StreamCloseReason {
	log := logging.FromContext(ctx)

	heartbeat := time.NewTicker(h.cfg.HeartbeatInterval)
	defer heartbeat.Stop()
	revocationCheck := time.NewTicker(h.cfg.RevocationInterval)
	defer revocationCheck.Stop()

	expiry := time.NewTimer(tokenLifetime(claims))
	defer expiry.Stop()

	for {
		select {
		case <-ctx.Done():
			return model.StreamCloseClient
		case <-h.shutdown:
			return model.StreamCloseServerShutdown
		case <-expiry.C:
			return model.StreamCloseTokenExpired
		case <-heartbeat.C:
			// comment lines keep idle connections open through the gateway
			if _, err := w.WriteString(": ping\n\n"); err != nil {
				return model.StreamCloseClient
			}
			w.Flush()
		case <-revocationCheck.C:
			if claims == nil {
				continue
			}
			revoked, err := h.streams.IsRevoked(ctx, user, claims.IssuedAt)
			if err != nil {
				log.Warn("revocation check failed, keeping stream open", "error", err)
				continue
			}
			if revoked {
				return model.StreamCloseTokenRevoked
			}
		case event, ok := <-sub.Events:
			if !ok {
				return model.StreamCloseFellBehind
			}

			if service.RequiresAccessCheck(&event.Envelope, user) && !h.stillAllowed(ctx, contestID, user) {
				revoked, _ := events.NewContestEvent(events.AccessRevokedType, contestID, events.SystemActor, nil)
				_ = writeEvent(w, event.ID, revoked)
				w.Flush()
				return model.StreamCloseAccessRevoked
			}

			if err := writeRaw(w, event.ID, event.Envelope.Type, event.Data); err != nil {
				return model.StreamCloseClient
			}
			w.Flush()
			metrics.IncEventSent(event.Envelope.Type)

			if event.Envelope.Type == events.ContestDeletedType {
				return model.StreamCloseContestDeleted
			}
		}
	}
}

// a transient failure keeps the viewer connected; only a definite no closes the stream
func (h *eventsHandler) stillAllowed(ctx context.Context, contestID uuid.UUID, user string) bool {
	err := h.streams.CheckAccess(ctx, contestID, user)
	if errors.Is(err, errs.ErrInsufficientRole) || errors.Is(err, errs.ErrContestNotFound) {
		return false
	}
	if err != nil {
		logging.FromContext(ctx).Warn("access re-check failed, keeping stream open", "error", err)
	}
	return true
}

func tokenLifetime(claims *api.Claims) time.Duration {
	if claims == nil || claims.Expire == 0 {
		return time.Hour
	}

	remaining := time.Until(time.Unix(claims.Expire, 0))
	if remaining <= 0 {
		return time.Millisecond
	}
	return remaining
}

func parseLastEventID(c *gin.Context) (string, bool) {
	raw := c.GetHeader(HeaderLastEventID)
	if raw == "" {
		raw = c.Query(queryLastEventID)
	}
	if raw == "" {
		return "", true
	}

	return raw, streams.ValidID(raw)
}

func writeEvent(w io.Writer, id string, event *events.ContestEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return writeRaw(w, id, event.Type, data)
}

// json.Marshal never emits newlines, so the payload always fits on one data line
func writeRaw(w io.Writer, id, eventType string, data []byte) error {
	_, err := fmt.Fprintf(w, "id: %s\nevent: %s\ndata: %s\n\n", id, eventType, data)
	return err
}
