ALTER TABLE contests ADD COLUMN IF NOT EXISTS invite_token text;
UPDATE contests SET invite_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE invite_token IS NULL;
ALTER TABLE contests ALTER COLUMN invite_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contests_invite_token ON contests (invite_token);

UPDATE contest_participants SET role = 'participant', max_squares = 0 WHERE role = 'viewer';
ALTER TABLE contest_participants DROP COLUMN IF EXISTS invite_id;

DROP TABLE IF EXISTS contest_invites;

CREATE TABLE IF NOT EXISTS contest_bans (
    contest_id uuid NOT NULL REFERENCES contests (id) ON DELETE CASCADE,
    user_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (contest_id, user_id)
);
