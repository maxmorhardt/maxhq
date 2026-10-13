package messaging

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/metrics"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/util"
	"github.com/nats-io/nats.go/jetstream"
	"gorm.io/gorm"
)

const (
	relayBatchSize     = 100
	relayPollInterval  = time.Second
	relayCleanupEvery  = time.Hour
	publishedRetention = 24 * time.Hour
)

type Publisher interface {
	Publish(ctx context.Context, subject string, payload []byte, opts ...jetstream.PublishOpt) (*jetstream.PubAck, error)
}

// moves committed outbox rows to jetstream in insertion order
type Relay struct {
	db       *gorm.DB
	js       Publisher
	lockKey  int64
	interval time.Duration
	wake     chan struct{}
}

// lockKey keeps one replica relaying at a time, which is what preserves publish order
func NewRelay(db *gorm.DB, js Publisher, lockKey int64) *Relay {
	return &Relay{
		db:       db,
		js:       js,
		lockKey:  lockKey,
		interval: relayPollInterval,
		wake:     make(chan struct{}, 1),
	}
}

func (r *Relay) Notify() {
	select {
	case r.wake <- struct{}{}:
	default:
	}
}

func (r *Relay) Run(ctx context.Context) {
	log := util.LoggerFromContext(ctx).With("component", "outbox-relay")
	ctx = util.ContextWithLogger(ctx, log)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	cleanup := time.NewTicker(relayCleanupEvery)
	defer cleanup.Stop()

	// drain anything left behind by a previous process before waiting
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

// publishes until the backlog is empty, the lock is held elsewhere, or jetstream refuses a message
func (r *Relay) Flush(ctx context.Context) {
	for {
		published, more, err := r.publishBatch(ctx)
		if err != nil {
			util.LoggerFromContext(ctx).Warn("outbox relay pass failed, retrying next tick", "error", err, "published", published)
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
			// the outbox id doubles as the jetstream dedupe id, so a retried batch is not delivered twice
			if _, err := r.js.Publish(ctx, event.Subject, event.Payload, jetstream.WithMsgID(event.ID.String())); err != nil {
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
		util.LoggerFromContext(ctx).Warn("failed to measure outbox backlog", "error", err)
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
		util.LoggerFromContext(ctx).Warn("failed to prune published outbox events", "error", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		util.LoggerFromContext(ctx).Info("pruned published outbox events", "count", res.RowsAffected)
	}
}
