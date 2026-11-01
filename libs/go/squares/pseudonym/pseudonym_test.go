package pseudonym

import (
	"strings"
	"testing"

	"github.com/caarlos0/env/v11"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testKey = "0123456789abcdef0123456789abcdef"

func TestConfig_RequiresTheKey(t *testing.T) {
	t.Setenv("PSEUDONYM_KEY", "")
	_, err := env.ParseAs[Config]()
	assert.Error(t, err)

	t.Setenv("PSEUDONYM_KEY", testKey)
	cfg, err := env.ParseAs[Config]()
	require.NoError(t, err)
	assert.Equal(t, testKey, cfg.Key)
}

func TestSetKey(t *testing.T) {
	t.Cleanup(func() { key = nil })

	assert.Error(t, SetKey("short"))
	assert.Error(t, SetKey(testKey+"\r"), "a CRLF from a Windows-made secret")
	assert.Error(t, SetKey(" "+testKey))
	assert.Nil(t, key)
	require.NoError(t, SetKey(testKey))
	assert.Equal(t, []byte(testKey), key)
}

func TestOf(t *testing.T) {
	require.NoError(t, SetKey(testKey))
	t.Cleanup(func() { key = nil })

	id := Of("player@example.com")
	assert.True(t, strings.HasPrefix(id, prefix))
	assert.Len(t, id, len(prefix)+22)
	assert.NotContains(t, id, "@")
	assert.Equal(t, id, Of("player@example.com"))
	assert.NotEqual(t, id, Of("Player@example.com"))
	assert.Equal(t, id, Of(id))

	for _, passthrough := range []string{"", "system", "ghost"} {
		assert.Equal(t, passthrough, Of(passthrough))
	}
}

func TestOfDependsOnKey(t *testing.T) {
	t.Cleanup(func() { key = nil })

	require.NoError(t, SetKey(testKey))
	first := Of("player@example.com")
	require.NoError(t, SetKey(strings.Repeat("k", minKeySize)))
	assert.NotEqual(t, first, Of("player@example.com"))
}

func TestOfPanicsWithoutKey(t *testing.T) {
	key = nil
	assert.Panics(t, func() { Of("player@example.com") })
}

func TestName(t *testing.T) {
	tests := map[string]string{
		"Max Morhardt":             "Max M.",
		"Mary Jane Watson":         "Mary W.",
		"Jordan":                   "Jordan",
		"ada lovelace":             "ada L.",
		"max.morhardt@example.com": "",
		"Test owner@squares.test":  "",
		"Élodie Ünal":              "Élodie Ü.",
		"   ":                      "",
		"@handle":                  "",
		"":                         "",
		"Morhardt, Max":            "Max M.",
		"Smith, John, Jr.":         "John S.",
		"Max,":                     "Max",
		"Max (Dad)":                "Max D.",
		"Max 🏈":                    "Max",
		"Max M.":                   "Max M.",
	}
	for in, want := range tests {
		assert.Equal(t, want, Name(in), in)
	}
}

func TestPublic(t *testing.T) {
	assert.Equal(t, "Max M.", Public("Max Morhardt"))
	assert.Equal(t, Unnamed, Public("pat.player@example.com"))
	assert.Equal(t, Unnamed, Public(""))
}

func TestFullName(t *testing.T) {
	assert.Equal(t, "Max Morhardt", FullName("  Max   Morhardt "))
	assert.Equal(t, "", FullName("pat.player@example.com"))
	assert.Equal(t, "", FullName(""))
}
