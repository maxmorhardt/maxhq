package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func projectedUserRows(email, initials string) *sqlmock.Rows {
	return sqlmock.NewRows([]string{"id", "email", "display_name", "default_initials", "created_at", "updated_at"}).
		AddRow(uuid.New(), email, "Max Morhardt", initials, time.Now(), time.Now())
}

func TestUserProjection_GetOrCreate_Existing(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "users" WHERE email = \$1`).WillReturnRows(projectedUserRows("a@b.com", "MM"))

	user, err := NewUserProjectionRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max Morhardt", "MM")

	require.NoError(t, err)
	assert.Equal(t, "MM", user.DefaultInitials)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserProjection_GetOrCreate_CreatesMissing(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.MatchExpectationsInOrder(true)
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users" .* ON CONFLICT \("email"\) DO NOTHING`).WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(projectedUserRows("a@b.com", "MM"))

	user, err := NewUserProjectionRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max Morhardt", "MM")

	require.NoError(t, err)
	assert.Equal(t, "a@b.com", user.Email)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserProjection_GetOrCreate_Errors(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnError(errors.New("db"))

	_, err := NewUserProjectionRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max", "M")
	require.Error(t, err)

	gdb, mock = newMockDB(t)
	mock.MatchExpectationsInOrder(true)
	mock.ExpectQuery(`SELECT \* FROM "users"`).WillReturnRows(sqlmock.NewRows([]string{"id"}))
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users"`).WillReturnError(errors.New("insert"))
	mock.ExpectRollback()

	_, err = NewUserProjectionRepository(gdb).GetOrCreate(context.Background(), "a@b.com", "Max", "M")
	require.Error(t, err)
}

func TestUserProjection_Upsert(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "users" .* ON CONFLICT \("email"\) DO UPDATE SET "display_name"="excluded"."display_name","default_initials"="excluded"."default_initials"`).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := NewUserProjectionRepository(gdb).Upsert(context.Background(), &model.User{Email: "a@b.com", DefaultInitials: "XY"})

	require.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserProjection_CascadeInitials(t *testing.T) {
	gdb, mock := newMockDB(t)
	contestID := uuid.New()
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares" SET "value"=\$1,"version"=version \+ 1,"updated_at"=\$2 WHERE owner = \$\d+ AND value != \$\d+ AND contest_id IN \(SELECT "id" FROM "contests" WHERE status NOT IN`).
		WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectQuery(`SELECT \* FROM "squares" WHERE owner = \$1`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "value", "owner"}).
			AddRow(uuid.New(), contestID, "XY", "a@b.com").
			AddRow(uuid.New(), contestID, "XY", "a@b.com"))
	mock.ExpectCommit()

	squares, err := NewUserProjectionRepository(gdb).CascadeInitials(context.Background(), "a@b.com", "XY")

	require.NoError(t, err)
	assert.Len(t, squares, 2)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserProjection_CascadeInitials_Error(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	_, err := NewUserProjectionRepository(gdb).CascadeInitials(context.Background(), "a@b.com", "XY")

	require.Error(t, err)
}

func TestUserProjection_GetStats(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT count\(\*\) FROM "contests"`).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))
	mock.ExpectQuery(`SELECT count\(\*\) FROM "contest_participants"`).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(7))
	mock.ExpectQuery(`SELECT count\(\*\) FROM "squares"`).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(42))
	mock.ExpectQuery(`SELECT count\(\*\) FROM "quarter_results"`).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))
	mock.ExpectQuery(`SELECT COUNT\(\*\)\s+FROM quarter_results q`).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(20))

	stats, err := NewUserProjectionRepository(gdb).GetStats(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.Equal(t, &model.UserStatsResponse{ContestsCreated: 3, ContestsJoined: 7, SquaresClaimed: 42, QuarterWins: 5, QuartersPlayed: 20}, stats)
}

func TestUserProjection_GetStats_EachQueryCanFail(t *testing.T) {
	queries := []string{
		`SELECT count\(\*\) FROM "contests"`,
		`SELECT count\(\*\) FROM "contest_participants"`,
		`SELECT count\(\*\) FROM "squares"`,
		`SELECT count\(\*\) FROM "quarter_results"`,
		`SELECT COUNT\(\*\)\s+FROM quarter_results q`,
	}

	for failAt := range queries {
		gdb, mock := newMockDB(t)
		mock.MatchExpectationsInOrder(true)
		for i, q := range queries[:failAt+1] {
			if i == failAt {
				mock.ExpectQuery(q).WillReturnError(errors.New("db"))
				continue
			}
			mock.ExpectQuery(q).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
		}

		_, err := NewUserProjectionRepository(gdb).GetStats(context.Background(), "a@b.com")
		require.Error(t, err, "query %d", failAt)
	}
}

func TestUserProjection_GetActiveContests(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT c.id, c.name, c.owner`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "owner", "role"}).AddRow(uuid.NewString(), "C1", "a@b.com", "owner"))

	active, err := NewUserProjectionRepository(gdb).GetActiveContests(context.Background(), "a@b.com")

	require.NoError(t, err)
	assert.Len(t, active, 1)

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT c.id`).WillReturnError(errors.New("db"))
	_, err = NewUserProjectionRepository(gdb).GetActiveContests(context.Background(), "a@b.com")
	require.Error(t, err)
}

func TestUserProjection_FirstActivity(t *testing.T) {
	first := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	gdb, mock := newMockDB(t)
	mock.ExpectQuery(`SELECT MIN\(t\)`).WillReturnRows(sqlmock.NewRows([]string{"min"}).AddRow(first))

	got, err := NewUserProjectionRepository(gdb).FirstActivity(context.Background(), "a@b.com")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.True(t, first.Equal(*got))

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT MIN\(t\)`).WillReturnRows(sqlmock.NewRows([]string{"min"}).AddRow(nil))
	got, err = NewUserProjectionRepository(gdb).FirstActivity(context.Background(), "a@b.com")
	require.NoError(t, err)
	assert.Nil(t, got)

	gdb, mock = newMockDB(t)
	mock.ExpectQuery(`SELECT MIN\(t\)`).WillReturnError(errors.New("db"))
	_, err = NewUserProjectionRepository(gdb).FirstActivity(context.Background(), "a@b.com")
	require.Error(t, err)
}

func TestUserProjection_ScrubUserData(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares" SET .*"owner"=\$\d+.*WHERE owner = \$\d+ AND contest_id IN`).WillReturnResult(sqlmock.NewResult(0, 1))
	for range 10 {
		mock.ExpectExec(`UPDATE "(squares|quarter_results|contests|contest_invites)" SET`).WillReturnResult(sqlmock.NewResult(0, 0))
	}
	mock.ExpectExec(`DELETE FROM "contest_participants"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`DELETE FROM "users"`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	require.NoError(t, NewUserProjectionRepository(gdb).ScrubUserData(context.Background(), "a@b.com"))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUserProjection_ScrubUserData_RollsBackOnError(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "squares"`).WillReturnError(errors.New("db"))
	mock.ExpectRollback()

	require.Error(t, NewUserProjectionRepository(gdb).ScrubUserData(context.Background(), "a@b.com"))
}
