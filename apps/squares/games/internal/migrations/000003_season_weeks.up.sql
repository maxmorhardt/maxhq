-- ESPN's season calendar: every week's name and when it runs, so the scoreboard knows the current week and its neighbours
CREATE TABLE IF NOT EXISTS season_weeks (
    season      int NOT NULL,
    season_type int NOT NULL,
    week        int NOT NULL,
    label       text NOT NULL,
    starts_at   timestamptz NOT NULL,
    ends_at     timestamptz NOT NULL,
    PRIMARY KEY (season, season_type, week)
);
CREATE INDEX IF NOT EXISTS idx_season_weeks_starts_at ON season_weeks (starts_at);
CREATE INDEX IF NOT EXISTS idx_season_weeks_ends_at ON season_weeks (ends_at);
