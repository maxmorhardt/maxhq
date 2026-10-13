package e2e

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/libs/go/platform/testkit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	legacyContestID = uuid.MustParse("0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0001")
	legacyGameID    = uuid.MustParse("0b5f7f8e-6f3c-4a43-9d8d-1d1c7f1f0002")
)

// the schema the monolith's nine migrations ended at, all in public
const legacySchema = `
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
`

func seedLegacySchema() error {
	if _, err := rawDB.Exec(legacySchema); err != nil {
		return err
	}

	now := time.Now()
	stmts := []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO users (id, email, display_name, default_initials, created_at, updated_at) VALUES ($1, $2, 'Legacy User', 'LG', $3, $3)`,
			[]any{uuid.New(), legacyUser, now}},
		{`INSERT INTO deleted_accounts (email, deleted_at) VALUES ('gone@squares.test', $1)`, []any{now.Add(-time.Hour)}},
		{`INSERT INTO games (id, espn_id, home_team, away_team, game_time, status, created_at, updated_at) VALUES ($1, 'legacy-401', 'Bills', 'Jets', $2, 'scheduled', $3, $3)`,
			[]any{legacyGameID, now.Add(48 * time.Hour), now}},
		{`INSERT INTO contests (id, name, x_labels, y_labels, owner, status, game_id, created_at, updated_at, created_by, updated_by)
			VALUES ($1, 'Legacy Pool', '[0,1,2,3,4,5,6,7,8,9]', '[0,1,2,3,4,5,6,7,8,9]', $2, 'ACTIVE', $3, $4, $4, $2, $2)`,
			[]any{legacyContestID, legacyUser, legacyGameID, now}},
		{`INSERT INTO contest_participants (id, contest_id, user_id, role, max_squares, joined_at, created_at, updated_at)
			VALUES ($1, $2, $3, 'owner', 100, $4, $4, $4)`, []any{uuid.New(), legacyContestID, legacyUser, now}},
	}
	for _, s := range stmts {
		if _, err := rawDB.Exec(s.sql, s.args...); err != nil {
			return fmt.Errorf("%s: %w", strings.Fields(s.sql)[2], err)
		}
	}

	// a 10x10 grid where the owner already holds one square
	for row := range 10 {
		for col := range 10 {
			value, owner := "", ""
			if row == 0 && col == 0 {
				value, owner = "LG", legacyUser
			}
			if _, err := rawDB.Exec(`INSERT INTO squares (id, contest_id, "row", col, value, owner, owner_name, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, '', $7, $7)`, uuid.New(), legacyContestID, row, col, value, owner, now); err != nil {
				return err
			}
		}
	}
	return nil
}

func tableExists(t *testing.T, qualified string) bool {
	t.Helper()
	var exists bool
	require.NoError(t, rawDB.QueryRow(`SELECT to_regclass($1) IS NOT NULL`, qualified).Scan(&exists))
	return exists
}

func TestLegacy_TablesMoveIntoServiceSchemas(t *testing.T) {
	for _, table := range []string{
		"contests.contests", "contests.squares", "contests.quarter_results", "contests.contest_participants", "contests.contest_invites",
		"games.games", "games.game_scores",
		"accounts.users", "accounts.deleted_accounts", "accounts.contact_submissions",
		"contests.outbox", "games.outbox", "accounts.outbox", "contests.stream_offsets",
	} {
		assert.True(t, tableExists(t, table), table)
	}

	var publicTables int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations'`).Scan(&publicTables))
	assert.Zero(t, publicTables, "nothing is left behind in public")

	var fks int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM pg_constraint WHERE conname = 'contests_game_id_fkey'`).Scan(&fks))
	assert.Zero(t, fks, "contests no longer reaches into the games schema")
}

func TestLegacy_DataSurvivesTheSplit(t *testing.T) {
	// contests seeded its copies from the monolith's users and games before those services moved them
	var initials string
	require.NoError(t, rawDB.QueryRow(`SELECT default_initials FROM contests.users WHERE email = $1`, legacyUser).Scan(&initials))
	assert.Equal(t, "LG", initials)
	var projected int
	require.NoError(t, rawDB.QueryRow(`SELECT COUNT(*) FROM contests.games WHERE id = $1`, legacyGameID).Scan(&projected))
	assert.Equal(t, 1, projected)

	resp := testkit.Call(t, contestsURL, testkit.As(legacyUser), http.MethodGet, "/contests/owner/"+legacyUser+"?page=1&limit=10", nil)
	require.Equal(t, http.StatusOK, resp.Status)
	assert.Contains(t, string(resp.Body), "Legacy Pool")

	profile := testkit.Call(t, accountsURL, testkit.As(legacyUser), http.MethodGet, "/users/me", nil)
	require.Equal(t, http.StatusOK, profile.Status)
	assert.Contains(t, string(profile.Body), `"defaultInitials":"LG"`)

	upcoming := testkit.Call(t, gamesURL, testkit.As(legacyUser), http.MethodGet, "/games/upcoming", nil)
	require.Equal(t, http.StatusOK, upcoming.Status)
	assert.Contains(t, string(upcoming.Body), "legacy-401")
}

func TestLegacy_TombstonesStillRevokeTokens(t *testing.T) {
	// accounts copied the monolith's deleted_accounts into redis on start, so every service rejects them
	stale := testkit.Identity{Email: "gone@squares.test", IssuedAt: time.Now().Add(-2 * time.Hour)}

	assert.Equal(t, http.StatusUnauthorized, testkit.Call(t, contestsURL, stale, http.MethodGet, "/users/me/stats", nil).Status)
}
