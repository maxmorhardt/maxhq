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

DROP INDEX IF EXISTS idx_contests_invite_token;
ALTER TABLE contests DROP COLUMN IF EXISTS invite_token;

ALTER TABLE contest_players ADD COLUMN IF NOT EXISTS invite_id uuid;
UPDATE contest_players SET role = 'participant' WHERE role = 'player';

ALTER INDEX IF EXISTS idx_contest_players_contest_user RENAME TO idx_contest_participants_contest_user;
ALTER INDEX IF EXISTS idx_contest_players_user_id RENAME TO idx_contest_participants_user_id;
ALTER INDEX IF EXISTS idx_contest_players_contest_id RENAME TO idx_contest_participants_contest_id;
ALTER TABLE contest_players RENAME CONSTRAINT contest_players_pkey TO contest_participants_pkey;
ALTER TABLE contest_players RENAME TO contest_participants;
