package database

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/plugin/dbresolver"
)

type txKey struct{}

type txState struct {
	tx          *gorm.DB
	afterCommit []func()
}

type Transactor interface {
	Do(ctx context.Context, fn func(ctx context.Context) error) error
}

type transactor struct {
	db *gorm.DB
}

func NewTransactor(db *gorm.DB) Transactor {
	return &transactor{db: db}
}

func (t *transactor) Do(ctx context.Context, fn func(ctx context.Context) error) error {
	// already inside a unit of work, so join it rather than nesting a second commit
	if _, ok := ctx.Value(txKey{}).(*txState); ok {
		return fn(ctx)
	}

	state := &txState{}
	err := t.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		state.tx = tx
		return fn(context.WithValue(ctx, txKey{}, state))
	})
	if err != nil {
		return err
	}

	for _, hook := range state.afterCommit {
		hook()
	}

	return nil
}

var ErrNoTransaction = errors.New("repository call needs the caller's transaction")

// for repository writes that lock rows or span statements: they run in the service's unit of work, never their own
func InTx(ctx context.Context, fn func(tx *gorm.DB) error) error {
	state, ok := ctx.Value(txKey{}).(*txState)
	if !ok || state.tx == nil {
		return ErrNoTransaction
	}
	return TranslateError(fn(state.tx.WithContext(ctx)))
}

type primaryKey struct{}

// for reads that must see a write that was just committed, which a lagging replica can miss
func ReadPrimary(ctx context.Context) context.Context {
	return context.WithValue(ctx, primaryKey{}, true)
}

func Conn(ctx context.Context, db *gorm.DB) *gorm.DB {
	if state, ok := ctx.Value(txKey{}).(*txState); ok && state.tx != nil {
		return state.tx.WithContext(ctx)
	}

	if ctx.Value(primaryKey{}) != nil {
		return db.WithContext(ctx).Clauses(dbresolver.Write)
	}

	return db.WithContext(ctx)
}

func AfterCommit(ctx context.Context, fn func()) {
	if state, ok := ctx.Value(txKey{}).(*txState); ok {
		state.afterCommit = append(state.afterCommit, fn)
		return
	}

	fn()
}
