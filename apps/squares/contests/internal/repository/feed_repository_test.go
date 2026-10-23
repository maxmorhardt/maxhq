package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var summaryColumns = []string{
	"id", "name", "home_team", "away_team", "status", "visibility", "owner", "game_id", "version",
	"created_at", "updated_at", "game_time", "home_abbr", "away_abbr", "role", "claimed_squares", "my_squares",
}

func TestFeedRepository_List_AllRoles(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	id, gameID := uuid.New(), uuid.New()
	kickoff := time.Date(2026, 10, 25, 17, 0, 0, 0, time.UTC)
	mock.ExpectQuery(`FROM contests c LEFT JOIN contest_participants cp .* LEFT JOIN games g .* WHERE c.status <> \$4 AND \(c.owner = \$5 OR cp.id IS NOT NULL\) ORDER BY c.updated_at DESC,c.id DESC LIMIT \$6`).
		WithArgs("u", "u", "u", "DELETED", "u", 20).
		WillReturnRows(sqlmock.NewRows(summaryColumns).AddRow(
			id, "Big Case", "Chicago Bears", "New England Patriots", "Q2", "private", "u", gameID, 3,
			kickoff, kickoff, kickoff, "CHI", "NE", "owner", 100, 4))

	rows, err := repo.List(context.Background(), "u", &model.ContestFeedFilter{Limit: 20})

	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, id, rows[0].ID)
	assert.Equal(t, model.ContestStatusQ2, rows[0].Status)
	assert.Equal(t, model.ParticipantRoleOwner, rows[0].Role)
	assert.Equal(t, &gameID, rows[0].GameID)
	assert.Equal(t, "CHI", rows[0].HomeAbbr)
	assert.Equal(t, 100, rows[0].ClaimedSquares)
	assert.Equal(t, 4, rows[0].MySquares)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestFeedRepository_List_Owned(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	mock.ExpectQuery(`WHERE c.status <> \$4 AND c.owner = \$5 ORDER BY`).
		WithArgs("u", "u", "u", "DELETED", "u", 5).
		WillReturnRows(sqlmock.NewRows(summaryColumns))

	rows, err := repo.List(context.Background(), "u", &model.ContestFeedFilter{Role: model.FeedRoleOwned, Limit: 5})

	require.NoError(t, err)
	assert.Empty(t, rows)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestFeedRepository_List_Joined(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	mock.ExpectQuery(`WHERE c.status <> \$4 AND \(c.owner <> \$5 AND cp.id IS NOT NULL\) ORDER BY`).
		WithArgs("u", "u", "u", "DELETED", "u", 5).
		WillReturnRows(sqlmock.NewRows(summaryColumns))

	_, err := repo.List(context.Background(), "u", &model.ContestFeedFilter{Role: model.FeedRoleJoined, Limit: 5})

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestFeedRepository_List_StatusesSearchAndCursor(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	cursor := &model.FeedCursor{At: time.Date(2026, 10, 22, 0, 0, 0, 0, time.UTC), ID: uuid.New()}
	mock.ExpectQuery(`AND c.status IN \(\$6,\$7\) AND c.name ILIKE \$8 AND \(c.updated_at, c.id\) < \(\$9, \$10\) ORDER BY c.updated_at DESC,c.id DESC LIMIT \$11`).
		WithArgs("u", "u", "u", "DELETED", "u", "ACTIVE", "Q1", "%bowl%", cursor.At, cursor.ID, 10).
		WillReturnRows(sqlmock.NewRows(summaryColumns))

	_, err := repo.List(context.Background(), "u", &model.ContestFeedFilter{
		Statuses: []model.ContestStatus{model.ContestStatusActive, model.ContestStatusQ1},
		Search:   "bowl",
		Cursor:   cursor,
		Limit:    10,
	})

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestFeedRepository_List_SearchMatchesWildcardsLiterally(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	mock.ExpectQuery(`c.name ILIKE \$6`).
		WithArgs("u", "u", "u", "DELETED", "u", `%50\%\_off\\%`, 20).
		WillReturnRows(sqlmock.NewRows(summaryColumns))

	_, err := repo.List(context.Background(), "u", &model.ContestFeedFilter{Search: `50%_off\`, Limit: 20})

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestFeedRepository_List_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	mock.ExpectQuery(`FROM contests c`).WillReturnError(errors.New("db"))

	rows, err := repo.List(context.Background(), "u", &model.ContestFeedFilter{Limit: 20})

	require.Error(t, err)
	assert.Nil(t, rows)
}

func TestFeedRepository_Members(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	contestID := uuid.New()
	mock.ExpectQuery(`SELECT user_id FROM contest_participants WHERE contest_id = \$1 UNION SELECT owner FROM contests WHERE id = \$2`).
		WithArgs(contestID, contestID).
		WillReturnRows(sqlmock.NewRows([]string{"user_id"}).AddRow("owner@b.com").AddRow("player@b.com"))

	members, err := repo.Members(context.Background(), contestID)

	require.NoError(t, err)
	assert.ElementsMatch(t, []string{"owner@b.com", "player@b.com"}, members)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestFeedRepository_Members_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	repo := NewFeedRepository(gdb)

	mock.ExpectQuery(`SELECT user_id FROM contest_participants`).WillReturnError(errors.New("db"))

	_, err := repo.Members(context.Background(), uuid.New())

	assert.Error(t, err)
}
