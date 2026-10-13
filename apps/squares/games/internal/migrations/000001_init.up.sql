-- adopt the tables the pre-split monolith created in public, on the first boot after the split
DO $$
BEGIN
    IF to_regclass('public.games') IS NOT NULL AND to_regclass('games.games') IS NULL THEN
        -- contests used to reference games directly; contests now keeps its own copy
        ALTER TABLE IF EXISTS public.contests DROP CONSTRAINT IF EXISTS contests_game_id_fkey;
        ALTER TABLE IF EXISTS contests.contests DROP CONSTRAINT IF EXISTS contests_game_id_fkey;
        ALTER TABLE public.games SET SCHEMA games;
        ALTER TABLE public.game_scores SET SCHEMA games;
    END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);
CREATE INDEX IF NOT EXISTS idx_games_game_time ON games (game_time);

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
