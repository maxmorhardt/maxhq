package streams

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/metrics"
	"github.com/maxmorhardt/maxstash/libs/platform/reqctx"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	consumerBatchSize  = 100
	consumerBlock      = 5 * time.Second
	consumerLockedWait = time.Second
	maxRetryGap        = 2 * time.Minute
)

type Handler func(ctx context.Context, entry Entry) error

// Name identifies the consumer's saved position, Stream is the logical stream it reads, and LockKey is a
// postgres advisory lock unique to this consumer that keeps one replica processing at a time
type ConsumerSpec struct {
	Name    string
	Stream  string
	LockKey int64
}

// how far a consumer has read; kept in the consuming service's own schema
type StreamOffset struct {
	Consumer  string `gorm:"primaryKey"`
	LastID    string `gorm:"not null"`
	UpdatedAt time.Time
}

func (StreamOffset) TableName() string {
	return "stream_offsets"
}

// reads a stream in order, one replica at a time, and saves its position in postgres after each batch.
// A failing entry is retried with backoff before anything after it is handled, so ordering holds;
// handlers must tolerate seeing an entry again after a crash
type Consumer struct {
	db      *gorm.DB
	rdb     redis.Cmdable
	spec    ConsumerSpec
	handler Handler
	block   time.Duration
}

func NewConsumer(db *gorm.DB, rdb redis.Cmdable, spec ConsumerSpec, handler Handler) *Consumer {
	return &Consumer{db: db, rdb: rdb, spec: spec, handler: handler, block: consumerBlock}
}

func (c *Consumer) Run(ctx context.Context) {
	log := reqctx.LoggerFromContext(ctx).With("consumer", c.spec.Name, "stream", c.spec.Stream)
	ctx = reqctx.ContextWithLogger(ctx, log)
	log.Info("stream consumer started")

	failures := 0
	for ctx.Err() == nil {
		res, err := c.processBatch(ctx)
		switch {
		case err != nil:
			failures++
			delay := retryDelay(failures)
			log.Warn("stream consumer failed, retrying", "error", err, "delay", delay)
			sleep(ctx, delay)
		case !res.locked:
			// another replica holds the lock; check back soon in case it goes away
			failures = 0
			sleep(ctx, consumerLockedWait)
		case res.handled == 0:
			failures = 0
			c.wait(ctx, res.offset)
		default:
			failures = 0
		}
	}
}

type batchResult struct {
	locked  bool
	handled int
	offset  string
}

// handles entries after the saved position until one fails or the batch ends, then saves the new position
func (c *Consumer) processBatch(ctx context.Context) (batchResult, error) {
	var res batchResult
	var handlerErr error

	txErr := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw("SELECT pg_try_advisory_xact_lock(?)", c.spec.LockKey).Scan(&res.locked).Error; err != nil {
			return err
		}
		if !res.locked {
			return nil
		}

		var saved StreamOffset
		err := tx.Where("consumer = ?", c.spec.Name).Limit(1).Find(&saved).Error
		if err != nil {
			return err
		}
		res.offset = saved.LastID

		entries, err := Range(ctx, c.rdb, c.spec.Stream, res.offset, consumerBatchSize)
		if err != nil {
			return fmt.Errorf("failed to read stream: %w", err)
		}
		if res.offset != "" && len(entries) > 0 {
			c.checkGap(ctx, res.offset)
		}

		for _, entry := range entries {
			// handlers open their own transactions; this one only holds the lock and the position
			if err := c.handle(ctx, entry); err != nil {
				handlerErr = err
				break
			}
			res.offset = entry.ID
			res.handled++
		}

		if res.handled == 0 {
			return nil
		}

		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "consumer"}},
			DoUpdates: clause.AssignmentColumns([]string{"last_id", "updated_at"}),
		}).Create(&StreamOffset{Consumer: c.spec.Name, LastID: res.offset, UpdatedAt: time.Now()}).Error
	})
	if txErr != nil {
		return res, txErr
	}

	return res, handlerErr
}

func (c *Consumer) handle(ctx context.Context, entry Entry) error {
	log := reqctx.LoggerFromContext(ctx).With("entry_id", entry.ID, "type", entry.Type)

	if err := c.handler(reqctx.ContextWithLogger(ctx, log), entry); err != nil {
		metrics.IncConsumerMessage(c.spec.Name, "error")
		return fmt.Errorf("entry %s (%s): %w", entry.ID, entry.Type, err)
	}

	metrics.IncConsumerMessage(c.spec.Name, "success")
	return nil
}

// entries newer than the saved position were trimmed before they were handled, which only happens when the
// consumer was down for longer than the stream retention
func (c *Consumer) checkGap(ctx context.Context, offset string) {
	info, err := c.rdb.XInfoStream(ctx, Key(c.spec.Stream)).Result()
	if err != nil || info.MaxDeletedEntryID == "" || info.MaxDeletedEntryID == "0-0" {
		return
	}

	if CompareIDs(info.MaxDeletedEntryID, offset) > 0 {
		metrics.IncConsumerGap(c.spec.Name)
		reqctx.LoggerFromContext(ctx).Error("stream entries were trimmed before this consumer handled them",
			"offset", offset, "max_deleted_entry_id", info.MaxDeletedEntryID)
	}
}

// blocks until something is appended after offset, the block window passes, or ctx ends
func (c *Consumer) wait(ctx context.Context, offset string) {
	_, err := Read(ctx, c.rdb, map[string]string{c.spec.Stream: offset}, 1, c.block)
	if err != nil && !errors.Is(err, context.Canceled) {
		reqctx.LoggerFromContext(ctx).Warn("failed to wait for stream entries", "error", err)
		sleep(ctx, consumerLockedWait)
	}
}

// back off exponentially so a poison entry cannot hot-loop, capped so a fix is picked up quickly
func retryDelay(failures int) time.Duration {
	delay := time.Second
	for i := 1; i < failures && delay < maxRetryGap; i++ {
		delay *= 2
	}
	return min(delay, maxRetryGap)
}

func sleep(ctx context.Context, d time.Duration) {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
	case <-t.C:
	}
}
