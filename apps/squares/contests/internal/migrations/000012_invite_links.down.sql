DROP TABLE IF EXISTS contest_bans;

CREATE TABLE IF NOT EXISTS contest_invites (
    id uuid PRIMARY KEY,
    contest_id uuid NOT NULL,
    token text NOT NULL,
    max_squares bigint NOT NULL,
    role text NOT NULL DEFAULT 'participant',
    created_by text NOT NULL,
    expires_at timestamptz,
    max_uses bigint NOT NULL DEFAULT 0,
    uses bigint NOT NULL DEFAULT 0,
    created_at timestamptz,
    updated_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_invites_token ON contest_invites (token);
CREATE INDEX IF NOT EXISTS idx_contest_invites_contest_id ON contest_invites (contest_id);

ALTER TABLE contest_participants ADD COLUMN IF NOT EXISTS invite_id uuid;

DROP INDEX IF EXISTS idx_contests_invite_token;
ALTER TABLE contests DROP COLUMN IF EXISTS invite_token;
