package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/errs"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/realtime/service"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
)

const (
	// how long a browser waits before reconnecting after the stream drops
	clientRetry = 3 * time.Second

	HeaderLastEventID = "Last-Event-ID"
	queryLastEventID  = "lastEventId"
)

type EventsHandler interface {
	StreamContest(c *gin.Context)
}

type eventsHandler struct {
	streams  service.StreamService
	cfg      model.StreamConfig
	shutdown <-chan struct{}
}

// shutdown closes every open stream so clients reconnect to another replica with their Last-Event-ID
func NewEventsHandler(streams service.StreamService, cfg model.StreamConfig, shutdown <-chan struct{}) EventsHandler {
	return &eventsHandler{streams: streams, cfg: cfg, shutdown: shutdown}
}

// @Summary Stream contest events
// @Description Server-sent events for one contest. The first event is a `connected` snapshot of the contest and its participants, unless the client resumes with Last-Event-ID and the gap is still retained, in which case only the missed events are replayed. Every event carries its stream sequence as the SSE id. A `revoked` event means the viewer lost access and the stream is closing.
// @Tags events
// @Produce text/event-stream
// @Param id path string true "Contest ID"
// @Param Last-Event-ID header string false "Sequence of the last event the client applied"
// @Param lastEventId query string false "Same as the Last-Event-ID header, for clients that cannot set headers"
// @Success 200 {string} string "text/event-stream; each data line is a JSON contest event"
// @Failure 400 {object} model.APIError
// @Failure 403 {object} model.APIError
// @Failure 404 {object} model.APIError
// @Failure 503 {object} model.APIError
// @Security BearerAuth
// @Router /events/contests/{id} [get]
func (h *eventsHandler) StreamContest(c *gin.Context) {
	log := util.LoggerFromGinContext(c)

	contestID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		metrics.RecordStreamResult(model.StreamResultBadRequest)
		c.JSON(http.StatusBadRequest, model.NewAPIError(http.StatusBadRequest, "Invalid contest ID", c))
		return
	}

	lastEventID, err := parseLastEventID(c)
	if err != nil {
		metrics.RecordStreamResult(model.StreamResultBadRequest)
		c.JSON(http.StatusBadRequest, model.NewAPIError(http.StatusBadRequest, "Invalid Last-Event-ID", c))
		return
	}

	user := c.GetString(model.UserKey)
	claims := util.ClaimsFromContext(c.Request.Context())
	log = log.With("contest_id", contestID)
	ctx := util.ContextWithLogger(c.Request.Context(), log)

	sub, err := h.streams.Subscribe(ctx, contestID, user, lastEventID)
	if err != nil {
		h.rejectSubscribe(c, err)
		return
	}
	defer sub.Stop()

	w := c.Writer
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// keeps proxies from buffering the stream until it ends
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	if _, err := fmt.Fprintf(w, "retry: %d\n\n", clientRetry.Milliseconds()); err != nil {
		return
	}

	if sub.Snapshot != nil {
		connected := model.NewConnectedEvent(contestID, sub.Snapshot.Contest, sub.Snapshot.Participants)
		if err := writeEvent(w, sub.SnapshotSeq, connected); err != nil {
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

func (h *eventsHandler) rejectSubscribe(c *gin.Context, err error) {
	switch {
	case errors.Is(err, errs.ErrContestNotFound):
		metrics.RecordStreamResult(model.StreamResultNotFound)
		c.JSON(http.StatusNotFound, model.NewAPIError(http.StatusNotFound, util.CapitalizeFirstLetter(errs.ErrContestNotFound), c))
	case errors.Is(err, errs.ErrInsufficientRole):
		metrics.RecordStreamResult(model.StreamResultUnauthorized)
		c.JSON(http.StatusForbidden, model.NewAPIError(http.StatusForbidden, "Not authorized to view this contest", c))
	default:
		util.LoggerFromGinContext(c).Error("failed to open contest stream", "error", err)
		metrics.RecordStreamResult(model.StreamResultUnavailable)
		c.JSON(http.StatusServiceUnavailable, model.NewAPIError(http.StatusServiceUnavailable, "Real-time updates unavailable", c))
	}
}

// forwards events until the client leaves, the token lapses, access is revoked, or the server shuts down
func (h *eventsHandler) serve(ctx context.Context, w gin.ResponseWriter, sub *service.Subscription, contestID uuid.UUID, user string, claims *model.Claims) model.StreamCloseReason {
	log := util.LoggerFromContext(ctx)

	heartbeat := time.NewTicker(h.cfg.HeartbeatInterval)
	defer heartbeat.Stop()
	revocationCheck := time.NewTicker(h.cfg.RevocationInterval)
	defer revocationCheck.Stop()

	// the stream outlives no token; the client reconnects with a fresh one and its Last-Event-ID
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
				return model.StreamCloseConsumerFailed
			}

			if service.RequiresAccessCheck(&event.Event, user) && !h.stillAllowed(ctx, contestID, user) {
				_ = writeEvent(w, event.Seq, model.NewRevokedEvent(contestID))
				w.Flush()
				return model.StreamCloseAccessRevoked
			}

			if err := writeRaw(w, event.Seq, event.Event.Type, event.Data); err != nil {
				return model.StreamCloseClient
			}
			w.Flush()
			metrics.IncEventSent(event.Event.Type)

			if event.Event.Type == model.ContestDeletedType {
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
		util.LoggerFromContext(ctx).Warn("access re-check failed, keeping stream open", "error", err)
	}
	return true
}

func tokenLifetime(claims *model.Claims) time.Duration {
	if claims == nil || claims.Expire == 0 {
		return time.Hour
	}

	remaining := time.Until(time.Unix(claims.Expire, 0))
	if remaining <= 0 {
		return time.Millisecond
	}
	return remaining
}

func parseLastEventID(c *gin.Context) (*uint64, error) {
	raw := c.GetHeader(HeaderLastEventID)
	if raw == "" {
		raw = c.Query(queryLastEventID)
	}
	if raw == "" {
		return nil, nil
	}

	seq, err := strconv.ParseUint(raw, 10, 64)
	if err != nil {
		return nil, err
	}
	return &seq, nil
}

func writeEvent(w io.Writer, seq uint64, event *model.ContestEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	return writeRaw(w, seq, event.Type, data)
}

// json.Marshal never emits newlines, so the payload always fits on one data line
func writeRaw(w io.Writer, seq uint64, eventType string, data []byte) error {
	_, err := fmt.Fprintf(w, "id: %d\nevent: %s\ndata: %s\n\n", seq, eventType, data)
	return err
}
