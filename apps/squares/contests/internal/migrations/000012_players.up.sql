ALTER TABLE contest_participants RENAME TO contest_players;
ALTER TABLE contest_players RENAME CONSTRAINT contest_participants_pkey TO contest_players_pkey;
ALTER INDEX IF EXISTS idx_contest_participants_contest_id RENAME TO idx_contest_players_contest_id;
ALTER INDEX IF EXISTS idx_contest_participants_user_id RENAME TO idx_contest_players_user_id;
ALTER INDEX IF EXISTS idx_contest_participants_contest_user RENAME TO idx_contest_players_contest_user;

UPDATE contest_players SET max_squares = 0 WHERE role = 'viewer';
UPDATE contest_players SET role = 'player' WHERE role IN ('participant', 'viewer');
ALTER TABLE contest_players DROP COLUMN IF EXISTS invite_id;

ALTER TABLE contests ADD COLUMN IF NOT EXISTS invite_token text;
UPDATE contests SET invite_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE invite_token IS NULL;
ALTER TABLE contests ALTER COLUMN invite_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contests_invite_token ON contests (invite_token);

DROP TABLE IF EXISTS contest_invites;

CREATE TABLE IF NOT EXISTS contest_bans (
    contest_id uuid NOT NULL REFERENCES contests (id) ON DELETE CASCADE,
    user_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (contest_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_contest_bans_user_id ON contest_bans (user_id);
