package model

import (
	"encoding/base64"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/contests/internal/errs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFeedCursor_RoundTrip(t *testing.T) {
	in := FeedCursor{At: time.Date(2026, 10, 13, 18, 30, 0, 123456000, time.UTC), ID: uuid.New()}

	out, err := DecodeFeedCursor(in.Encode())

	require.NoError(t, err)
	assert.True(t, in.At.Equal(out.At))
	assert.Equal(t, in.ID, out.ID)
}

func TestDecodeFeedCursor_Rejects(t *testing.T) {
	enc := func(s string) string { return base64.RawURLEncoding.EncodeToString([]byte(s)) }

	for _, raw := range []string{"%%%", enc("no-separator"), enc("abc:" + uuid.NewString()), enc("123:not-a-uuid")} {
		_, err := DecodeFeedCursor(raw)
		assert.ErrorIs(t, err, errs.ErrInvalidCursor, raw)
	}
}
