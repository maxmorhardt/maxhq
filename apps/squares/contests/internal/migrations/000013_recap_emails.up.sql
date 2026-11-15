CREATE TABLE IF NOT EXISTS recap_emails (
    id uuid PRIMARY KEY,
    contest_id uuid NOT NULL REFERENCES contests (id) ON DELETE CASCADE,
    user_id text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    attempts int NOT NULL DEFAULT 0,
    last_error text NOT NULL DEFAULT '',
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recap_emails_contest_user ON recap_emails (contest_id, user_id);
CREATE INDEX IF NOT EXISTS idx_recap_emails_user_id ON recap_emails (user_id);
CREATE INDEX IF NOT EXISTS idx_recap_emails_due ON recap_emails (next_attempt_at) WHERE status = 'pending';
