package database

import (
	"context"

	"gorm.io/gorm"
)

type txKey struct{}

type txState struct {
	tx          *gorm.DB
	afterCommit []func()
}

// lets a service run several repository calls and an outbox write as one unit of work
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

// repositories call Conn so they join the caller's transaction when there is one
func Conn(ctx context.Context, db *gorm.DB) *gorm.DB {
	if state, ok := ctx.Value(txKey{}).(*txState); ok && state.tx != nil {
		return state.tx.WithContext(ctx)
	}

	return db.WithContext(ctx)
}

// runs fn once the surrounding transaction commits, or right away when there is none
func AfterCommit(ctx context.Context, fn func()) {
	if state, ok := ctx.Value(txKey{}).(*txState); ok {
		state.afterCommit = append(state.afterCommit, fn)
		return
	}

	fn()
}
