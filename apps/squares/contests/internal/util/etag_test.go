package util

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseIfMatch(t *testing.T) {
	five := int64(5)
	tests := []struct {
		header  string
		want    *int64
		wantErr bool
	}{
		{"", nil, false},
		{"*", nil, false},
		{`"5"`, &five, false},
		{`W/"5"`, &five, false},
		{"5", &five, false},
		{`"abc"`, nil, true},
		{`"0"`, nil, true},
		{`"-1"`, nil, true},
	}

	for _, tt := range tests {
		got, err := ParseIfMatch(tt.header)
		if tt.wantErr {
			assert.Error(t, err, tt.header)
			continue
		}
		require.NoError(t, err, tt.header)
		assert.Equal(t, tt.want, got, tt.header)
	}
}
