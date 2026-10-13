-- events written in the same transaction as the change they describe; the relay appends them to redis streams in seq order
CREATE TABLE IF NOT EXISTS outbox (
    id           uuid PRIMARY KEY,
    seq          bigserial NOT NULL,
    stream       text NOT NULL,
    type         text NOT NULL,
    payload      jsonb NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox (seq) WHERE published_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_published_at ON outbox (published_at) WHERE published_at IS NOT NULL;
