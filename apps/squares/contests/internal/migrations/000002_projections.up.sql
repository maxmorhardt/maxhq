-- local copies of data owned by accounts and games, kept current by their events

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    display_name text NOT NULL DEFAULT '',
    default_initials text NOT NULL DEFAULT '',
    created_at timestamptz,
    updated_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS games (
    id          uuid PRIMARY KEY,
    espn_id     text NOT NULL,
    home_team   text NOT NULL DEFAULT '',
    away_team   text NOT NULL DEFAULT '',
    home_abbr   text NOT NULL DEFAULT '',
    away_abbr   text NOT NULL DEFAULT '',
    game_time   timestamptz NOT NULL,
    week        int NOT NULL DEFAULT 0,
    season      int NOT NULL DEFAULT 0,
    season_type int NOT NULL DEFAULT 2,
    status      text NOT NULL DEFAULT 'scheduled',
    period      int NOT NULL DEFAULT 0,
    home_score  int NOT NULL DEFAULT 0,
    away_score  int NOT NULL DEFAULT 0,
    created_at  timestamptz,
    updated_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_espn_id ON games (espn_id);

CREATE TABLE IF NOT EXISTS game_scores (
    id         uuid PRIMARY KEY,
    game_id    uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE,
    quarter    int NOT NULL,
    home_score int NOT NULL DEFAULT 0,
    away_score int NOT NULL DEFAULT 0,
    created_at timestamptz,
    updated_at timestamptz,
    UNIQUE (game_id, quarter)
);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_id ON game_scores (game_id);

-- seed from wherever the source rows live right now: the owning service's schema once it has
-- migrated, otherwise the monolith's public tables; a table moved mid-statement just falls through
DO $$
BEGIN
    BEGIN
        INSERT INTO users (id, email, display_name, default_initials, created_at, updated_at)
        SELECT id, email, display_name, default_initials, created_at, updated_at FROM accounts.users
        ON CONFLICT (email) DO NOTHING;
    EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
        BEGIN
            INSERT INTO users (id, email, display_name, default_initials, created_at, updated_at)
            SELECT id, email, display_name, default_initials, created_at, updated_at FROM public.users
            ON CONFLICT (email) DO NOTHING;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;
    END;

    BEGIN
        INSERT INTO games SELECT id, espn_id, home_team, away_team, home_abbr, away_abbr, game_time, week,
            season, season_type, status, period, home_score, away_score, created_at, updated_at FROM games.games
        ON CONFLICT (id) DO NOTHING;
        INSERT INTO game_scores SELECT id, game_id, quarter, home_score, away_score, created_at, updated_at FROM games.game_scores
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN undefined_table OR invalid_schema_name THEN
        BEGIN
            INSERT INTO games SELECT id, espn_id, home_team, away_team, home_abbr, away_abbr, game_time, week,
                season, season_type, status, period, home_score, away_score, created_at, updated_at FROM public.games
            ON CONFLICT (id) DO NOTHING;
            INSERT INTO game_scores SELECT id, game_id, quarter, home_score, away_score, created_at, updated_at FROM public.game_scores
            ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;
    END;
END $$;
