-- The schema the pre-split monolith's nine migrations ended at, all in public, with a little data.
-- Each service adopts its own tables from here on its first start; this file is copied into every
-- service's integration tests so each can prove that on its own.

CREATE TABLE games (
    id uuid PRIMARY KEY, espn_id text NOT NULL, home_team text NOT NULL DEFAULT '', away_team text NOT NULL DEFAULT '',
    home_abbr text NOT NULL DEFAULT '', away_abbr text NOT NULL DEFAULT '', game_time timestamptz NOT NULL,
    week int NOT NULL DEFAULT 0, season int NOT NULL DEFAULT 0, season_type int NOT NULL DEFAULT 2,
    status text NOT NULL DEFAULT 'scheduled', period int NOT NULL DEFAULT 0, home_score int NOT NULL DEFAULT 0,
    away_score int NOT NULL DEFAULT 0, created_at timestamptz, updated_at timestamptz
);
CREATE UNIQUE INDEX idx_games_espn_id ON games (espn_id);
CREATE TABLE game_scores (
    id uuid PRIMARY KEY, game_id uuid NOT NULL REFERENCES games (id) ON DELETE CASCADE, quarter int NOT NULL,
    home_score int NOT NULL DEFAULT 0, away_score int NOT NULL DEFAULT 0, created_at timestamptz, updated_at timestamptz,
    UNIQUE (game_id, quarter)
);
CREATE TABLE contests (
    id uuid PRIMARY KEY, name text, x_labels jsonb, y_labels jsonb, home_team text, away_team text, owner text,
    visibility text NOT NULL DEFAULT 'private', status text NOT NULL DEFAULT 'ACTIVE',
    game_id uuid REFERENCES games (id) ON DELETE SET NULL,
    created_at timestamptz, updated_at timestamptz, created_by text, updated_by text
);
CREATE TABLE squares (
    id uuid PRIMARY KEY, contest_id uuid REFERENCES contests (id) ON DELETE CASCADE, "row" bigint, col bigint,
    value text, owner text, owner_name text, created_at timestamptz, updated_at timestamptz, created_by text, updated_by text
);
CREATE TABLE quarter_results (
    id uuid PRIMARY KEY, contest_id uuid NOT NULL REFERENCES contests (id) ON DELETE CASCADE, quarter integer NOT NULL,
    home_team_score bigint, away_team_score bigint, winner_row bigint, winner_col bigint, winner text, winner_name text,
    created_at timestamptz, updated_at timestamptz, created_by text, updated_by text
);
CREATE UNIQUE INDEX idx_quarter_results_contest_quarter ON quarter_results (contest_id, quarter);
CREATE TABLE contest_participants (
    id uuid PRIMARY KEY, contest_id uuid NOT NULL, user_id text NOT NULL, role text NOT NULL,
    max_squares bigint NOT NULL DEFAULT 0, invite_id uuid, joined_at timestamptz, created_at timestamptz, updated_at timestamptz
);
CREATE UNIQUE INDEX idx_contest_participants_contest_user ON contest_participants (contest_id, user_id);
CREATE TABLE contest_invites (
    id uuid PRIMARY KEY, contest_id uuid NOT NULL, token text NOT NULL, max_squares bigint NOT NULL,
    role text NOT NULL DEFAULT 'participant', created_by text NOT NULL, expires_at timestamptz,
    max_uses bigint NOT NULL DEFAULT 0, uses bigint NOT NULL DEFAULT 0, created_at timestamptz, updated_at timestamptz
);
CREATE TABLE users (
    id uuid PRIMARY KEY, email text NOT NULL, display_name text NOT NULL DEFAULT '',
    default_initials text NOT NULL DEFAULT '', created_at timestamptz, updated_at timestamptz
);
CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE TABLE deleted_accounts (email text PRIMARY KEY, deleted_at timestamptz NOT NULL);
CREATE TABLE contact_submissions (
    id uuid PRIMARY KEY, name varchar(100) NOT NULL, email varchar(255) NOT NULL, subject varchar(200) NOT NULL,
    message text NOT NULL, ip_address varchar(45), status varchar(20) DEFAULT 'pending', response text,
    created_at timestamptz, updated_at timestamptz
);
CREATE TABLE schema_migrations (version bigint NOT NULL PRIMARY KEY, dirty boolean NOT NULL);
INSERT INTO schema_migrations VALUES (9, false);

INSERT INTO users (id, email, display_name, default_initials, created_at, updated_at)
VALUES ('0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0003', 'legacy@squares.test', 'Legacy User', 'LG', now(), now());

INSERT INTO deleted_accounts (email, deleted_at) VALUES ('gone@squares.test', now() - interval '1 hour');

INSERT INTO games (id, espn_id, home_team, away_team, game_time, status, created_at, updated_at)
VALUES ('0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0002', 'legacy-401', 'Bills', 'Jets', now() + interval '2 days', 'scheduled', now(), now());

INSERT INTO contests (id, name, x_labels, y_labels, owner, status, game_id, created_at, updated_at, created_by, updated_by)
VALUES ('0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0001', 'Legacy Pool', '[0,1,2,3,4,5,6,7,8,9]', '[0,1,2,3,4,5,6,7,8,9]',
        'legacy@squares.test', 'ACTIVE', '0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0002', now(), now(), 'legacy@squares.test', 'legacy@squares.test');

INSERT INTO contest_participants (id, contest_id, user_id, role, max_squares, joined_at, created_at, updated_at)
VALUES (gen_random_uuid(), '0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0001', 'legacy@squares.test', 'owner', 100, now(), now(), now());

-- a 10x10 grid where the owner already holds the first square
INSERT INTO squares (id, contest_id, "row", col, value, owner, owner_name, created_at, updated_at)
SELECT gen_random_uuid(), '0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0001', r, c,
       CASE WHEN r = 0 AND c = 0 THEN 'LG' ELSE '' END,
       CASE WHEN r = 0 AND c = 0 THEN 'legacy@squares.test' ELSE '' END,
       '', now(), now()
FROM generate_series(0, 9) AS r, generate_series(0, 9) AS c;
