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

func TestRecapEmailRepository_CreateAll(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO "recap_emails" .* ON CONFLICT \("contest_id","user_id"\) DO NOTHING`).WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()

	repo := NewRecapEmailRepository(gdb)
	require.NoError(t, repo.CreateAll(context.Background(), []model.RecapEmail{{ContestID: uuid.New(), UserID: "a@x.com"}, {ContestID: uuid.New(), UserID: "b@x.com"}}))
	require.NoError(t, repo.CreateAll(context.Background(), nil))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRecapEmailRepository_ClaimDueLeasesWithSkipLocked(t *testing.T) {
	gdb, mock := newMockDB(t)
	id := uuid.New()
	mock.ExpectQuery(`UPDATE recap_emails SET attempts = attempts \+ 1.*FOR UPDATE SKIP LOCKED.*RETURNING \*`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "contest_id", "user_id", "status", "attempts"}).AddRow(id, uuid.New(), "a@x.com", "pending", 1))

	claimed, err := NewRecapEmailRepository(gdb).ClaimDue(context.Background(), time.Now(), time.Now().Add(time.Minute), 10)

	require.NoError(t, err)
	require.Len(t, claimed, 1)
	assert.Equal(t, id, claimed[0].ID)
	assert.Equal(t, 1, claimed[0].Attempts)
}

func TestRecapEmailRepository_FinishAndReschedule(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "recap_emails" SET .*"sent_at"=.*WHERE id IN`).WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "recap_emails" SET "last_error"=.*"status"=.*WHERE id IN`).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "recap_emails" SET "last_error"=.*"next_attempt_at"=.*WHERE id = `).WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	repo := NewRecapEmailRepository(gdb)
	require.NoError(t, repo.Finish(context.Background(), []uuid.UUID{uuid.New(), uuid.New()}, model.RecapEmailSent, "", time.Now()))
	require.NoError(t, repo.Finish(context.Background(), []uuid.UUID{uuid.New()}, model.RecapEmailFailed, "550", time.Now()))
	require.NoError(t, repo.Finish(context.Background(), nil, model.RecapEmailFailed, "", time.Now()))
	require.NoError(t, repo.Reschedule(context.Background(), uuid.New(), "timeout", time.Now().Add(time.Minute)))
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestRecapEmailRepository_ExpireAndPrune(t *testing.T) {
	gdb, mock := newMockDB(t)
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE "recap_emails" SET .*WHERE status = \$\d+ AND created_at < \$\d+`).WillReturnResult(sqlmock.NewResult(0, 3))
	mock.ExpectCommit()
	mock.ExpectBegin()
	mock.ExpectExec(`DELETE FROM "recap_emails" WHERE status <> \$1 AND updated_at < \$2`).WillReturnResult(sqlmock.NewResult(0, 4))
	mock.ExpectCommit()

	repo := NewRecapEmailRepository(gdb)
	expired, err := repo.ExpirePending(context.Background(), time.Now(), "too old")
	require.NoError(t, err)
	assert.Equal(t, int64(3), expired)
	pruned, err := repo.PruneFinished(context.Background(), time.Now())
	require.NoError(t, err)
	assert.Equal(t, int64(4), pruned)
}

func TestRecapEmailRepository_OldestPending(t *testing.T) {
	gdb, mock := newMockDB(t)
	at := time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC)
	mock.ExpectQuery(`SELECT MIN\(created_at\) FROM "recap_emails" WHERE status = \$1`).WillReturnRows(sqlmock.NewRows([]string{"min"}).AddRow(at))
	mock.ExpectQuery(`SELECT MIN\(created_at\)`).WillReturnRows(sqlmock.NewRows([]string{"min"}).AddRow(nil))
	mock.ExpectQuery(`SELECT MIN\(created_at\)`).WillReturnError(errors.New("db"))

	repo := NewRecapEmailRepository(gdb)
	oldest, err := repo.OldestPending(context.Background())
	require.NoError(t, err)
	assert.True(t, oldest.Equal(at))

	oldest, err = repo.OldestPending(context.Background())
	require.NoError(t, err)
	assert.Nil(t, oldest)

	_, err = repo.OldestPending(context.Background())
	require.Error(t, err)
}
