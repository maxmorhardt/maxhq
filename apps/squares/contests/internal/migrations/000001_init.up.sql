-- adopt the tables the pre-split monolith created in public, on the first boot after the split
DO $$
BEGIN
    IF to_regclass('public.contests') IS NOT NULL AND to_regclass('contests.contests') IS NULL THEN
        ALTER TABLE public.contests SET SCHEMA contests;
        ALTER TABLE public.squares SET SCHEMA contests;
        ALTER TABLE public.quarter_results SET SCHEMA contests;
        ALTER TABLE public.contest_participants SET SCHEMA contests;
        ALTER TABLE public.contest_invites SET SCHEMA contests;
    END IF;
END $$;

-- a fresh database gets the shape the monolith's migrations ended at
CREATE TABLE IF NOT EXISTS contests (
    id uuid PRIMARY KEY,
    name text,
    x_labels jsonb,
    y_labels jsonb,
    home_team text,
    away_team text,
    owner text,
    visibility text NOT NULL DEFAULT 'private',
    status text NOT NULL DEFAULT 'ACTIVE',
    game_id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    created_by text,
    updated_by text
);
CREATE INDEX IF NOT EXISTS idx_contests_game_id ON contests (game_id);

CREATE TABLE IF NOT EXISTS squares (
    id uuid PRIMARY KEY,
    contest_id uuid REFERENCES contests (id) ON DELETE CASCADE,
    "row" bigint,
    col bigint,
    value text,
    owner text,
    owner_name text,
    created_at timestamptz,
    updated_at timestamptz,
    created_by text,
    updated_by text
);
CREATE INDEX IF NOT EXISTS idx_squares_contest_id ON squares (contest_id);
CREATE INDEX IF NOT EXISTS idx_squares_owner ON squares (owner);

CREATE TABLE IF NOT EXISTS quarter_results (
    id uuid PRIMARY KEY,
    contest_id uuid NOT NULL REFERENCES contests (id) ON DELETE CASCADE,
    quarter integer NOT NULL,
    home_team_score bigint,
    away_team_score bigint,
    winner_row bigint,
    winner_col bigint,
    winner text,
    winner_name text,
    created_at timestamptz,
    updated_at timestamptz,
    created_by text,
    updated_by text
);
CREATE INDEX IF NOT EXISTS idx_quarter_results_contest_id ON quarter_results (contest_id);
CREATE INDEX IF NOT EXISTS idx_quarter_results_winner ON quarter_results (winner);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quarter_results_contest_quarter ON quarter_results (contest_id, quarter);

CREATE TABLE IF NOT EXISTS contest_participants (
    id uuid PRIMARY KEY,
    contest_id uuid NOT NULL,
    user_id text NOT NULL,
    role text NOT NULL,
    max_squares bigint NOT NULL DEFAULT 0,
    invite_id uuid,
    joined_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest_id ON contest_participants (contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user_id ON contest_participants (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_participants_contest_user ON contest_participants (contest_id, user_id);

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

-- games now belongs to the games service, so contests keeps its own copy rather than a cross-schema foreign key
ALTER TABLE contests DROP CONSTRAINT IF EXISTS contests_game_id_fkey;
