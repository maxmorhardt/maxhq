-- optimistic locking: every write bumps version, and a write against a stale version affects no rows
ALTER TABLE contests ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
ALTER TABLE squares ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
