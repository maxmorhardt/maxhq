package streams

import (
	"context"
	"database/sql"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/libs/go/platform/cache"
	"github.com/maxmorhardt/maxhq/libs/go/platform/logging"
	"github.com/maxmorhardt/maxhq/libs/go/platform/metrics"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	relayBatchSize     = 100
	relayPollInterval  = time.Second
	relayCleanupEvery  = time.Hour
	publishedRetention = 24 * time.Hour

	// a retried append inside this window returns the entry the first attempt wrote
	dedupeWindow = time.Hour
)

// KEYS[1] stream, KEYS[2] dedupe marker
// ARGV[1] min id to keep, ARGV[2] stream ttl ms, ARGV[3] dedupe ttl ms, ARGV[4] type, ARGV[5] data, ARGV[6] event id
var appendScript = redis.NewScript(`
local existing = redis.call('GET', KEYS[2])
if existing then
  return existing
end
local id = redis.call('XADD', KEYS[1], 'MINID', '~', ARGV[1], '*', 'type', ARGV[4], 'data', ARGV[5], 'event_id', ARGV[6])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], id, 'PX', ARGV[3])
return id
`)

type Relay struct {
	db        *gorm.DB
	rdb       redis.Scripter
	lockKey   int64
	retention time.Duration
	interval  time.Duration
	wake      chan struct{}
}

func NewRelay(db *gorm.DB, rdb redis.Scripter, lockKey int64, retention time.Duration) *Relay {
	return &Relay{
		db:        db,
		rdb:       rdb,
		lockKey:   lockKey,
		retention: retention,
		interval:  relayPollInterval,
		wake:      make(chan struct{}, 1),
	}
}

func (r *Relay) Notify() {
	select {
	case r.wake <- struct{}{}:
	default:
	}
}

func (r *Relay) Run(ctx context.Context) {
	log := logging.FromContext(ctx).With("component", "outbox-relay")
	ctx = logging.NewContext(ctx, log)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	cleanup := time.NewTicker(relayCleanupEvery)
	defer cleanup.Stop()

	r.Flush(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-r.wake:
			r.Flush(ctx)
		case <-ticker.C:
			r.Flush(ctx)
			r.recordBacklog(ctx)
		case <-cleanup.C:
			r.cleanup(ctx)
		}
	}
}

func (r *Relay) Flush(ctx context.Context) {
	for {
		published, more, err := r.publishBatch(ctx)
		if err != nil {
			logging.FromContext(ctx).Warn("outbox relay pass failed, retrying next tick", "error", err, "published", published)
			return
		}
		if !more {
			return
		}
	}
}

func (r *Relay) publishBatch(ctx context.Context) (published int, more bool, err error) {
	var publishErr error

	txErr := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var locked bool
		if err := tx.Raw("SELECT pg_try_advisory_xact_lock(?)", r.lockKey).Scan(&locked).Error; err != nil {
			return err
		}
		if !locked {
			return nil
		}

		var batch []OutboxEvent
		if err := tx.Where("published_at IS NULL").Order("seq ASC").Limit(relayBatchSize).Find(&batch).Error; err != nil {
			return err
		}

		ids := make([]uuid.UUID, 0, len(batch))
		for i := range batch {
			event := &batch[i]
			if err := r.appendEvent(ctx, event); err != nil {
				metrics.IncOutboxPublished(false)
				publishErr = err
				break
			}
			metrics.IncOutboxPublished(true)
			ids = append(ids, event.ID)
		}

		if len(ids) > 0 {
			if err := tx.Model(&OutboxEvent{}).Where("id IN ?", ids).Update("published_at", time.Now()).Error; err != nil {
				return err
			}
		}

		published = len(ids)
		more = publishErr == nil && len(batch) == relayBatchSize
		return nil
	})
	if txErr != nil {
		return 0, false, txErr
	}

	return published, more, publishErr
}

func (r *Relay) recordBacklog(ctx context.Context) {
	var backlog struct {
		Pending int64
		Oldest  sql.NullTime
	}
	if err := r.db.WithContext(ctx).Model(&OutboxEvent{}).
		Select("COUNT(*) AS pending, MIN(created_at) AS oldest").
		Where("published_at IS NULL").
		Scan(&backlog).Error; err != nil {
		logging.FromContext(ctx).Warn("failed to measure outbox backlog", "error", err)
		return
	}

	age := 0.0
	if backlog.Oldest.Valid {
		age = time.Since(backlog.Oldest.Time).Seconds()
	}
	metrics.SetOutboxBacklog(backlog.Pending, age)
}

func (r *Relay) cleanup(ctx context.Context) {
	res := r.db.WithContext(ctx).
		Where("published_at < ?", time.Now().Add(-publishedRetention)).
		Delete(&OutboxEvent{})
	if res.Error != nil {
		logging.FromContext(ctx).Warn("failed to prune published outbox events", "error", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		logging.FromContext(ctx).Info("pruned published outbox events", "count", res.RowsAffected)
	}
}

// the outbox id is the dedupe key, so a batch retried after a failed commit is not appended twice
func (r *Relay) appendEvent(ctx context.Context, event *OutboxEvent) error {
	minID := strconv.FormatInt(time.Now().Add(-r.retention).UnixMilli(), 10) + "-0"

	return appendScript.Run(ctx, r.rdb,
		[]string{Key(event.Stream), cache.Key("outbox", event.ID.String())},
		minID,
		r.retention.Milliseconds(),
		dedupeWindow.Milliseconds(),
		event.Type,
		string(event.Payload),
		event.ID.String(),
	).Err()
}
