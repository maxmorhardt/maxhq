package email

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func sampleRecap() *Recap {
	return &Recap{
		ContestID:   uuid.MustParse("6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c"),
		ContestName: "Office Pool",
		AwayTeam:    "Buffalo Bills",
		HomeTeam:    "Kansas City Chiefs",
		AwayAbbr:    "BUF",
		HomeAbbr:    "KC",
		AwayScore:   24,
		HomeScore:   27,
		Started:     true,
		Quarters: []RecapQuarter{
			{Number: 1, AwayScore: 7, HomeScore: 3, Winner: "Max M."},
			{Number: 2, AwayScore: 14, HomeScore: 10},
			{Number: 4, AwayScore: 24, HomeScore: 27, Winner: "Jen K."},
		},
	}
}

func TestRenderRecap_Final(t *testing.T) {
	content, err := RenderRecap("https://squares.example.com/", sampleRecap())
	require.NoError(t, err)

	assert.Equal(t, "Squares: Office Pool final results", content.Subject)
	for _, want := range []string{
		"Final results",
		"Buffalo Bills 24, Kansas City Chiefs 27. Here&#39;s the winning square for each quarter.",
		"Final: BUF 24, KC 27. Q1 Max M. · Q2 Open square · Final Jen K.",
		"<!--[if mso]>",
		"https://squares.example.com/contests/create?utm_source=recap&amp;utm_medium=email",
		"https://squares.example.com/contests/6f2c8c1e-6d2f-4a9e-9c6b-3f0f6f7a1b2c?utm_source=recap&amp;utm_medium=email",
		"https://squares.example.com/squares_logo.png",
		"mailto:support@maxhq.io",
		">squares.example.com</a>",
	} {
		assert.Contains(t, content.HTML, want)
	}
	for _, want := range []string{
		"         BUF  KC   Winner",
		"Q1       7    3    Max M.",
		"Q2       14   10   Open square",
		"Final    24   27   Jen K.",
		"Start your next contest: https://squares.example.com/contests/create?utm_source=recap&utm_medium=email",
		"Feedback or ideas? Email support@maxhq.io.",
	} {
		assert.Contains(t, content.Text, want)
	}
}

func TestRenderRecap_EscapesContestNames(t *testing.T) {
	recap := sampleRecap()
	recap.ContestName = `<script>alert(1)</script>`

	content, err := RenderRecap("https://squares.example.com", recap)
	require.NoError(t, err)

	assert.NotContains(t, content.HTML, "<script>")
}

func TestRenderRecap_Canceled(t *testing.T) {
	recap := sampleRecap()
	recap.Canceled = true

	content, err := RenderRecap("https://squares.example.com", recap)
	require.NoError(t, err)

	assert.Equal(t, "Squares: Office Pool game canceled", content.Subject)
	assert.Contains(t, content.HTML, "Buffalo Bills 24, Kansas City Chiefs 27 when the game was canceled. Quarters that were played keep their winners.")
	assert.Contains(t, content.Text, "Q1       7    3    Max M.")
	assert.Contains(t, content.Text, "Final    24   27   Jen K.")

	recap.Started, recap.Quarters = false, nil
	content, err = RenderRecap("https://squares.example.com", recap)
	require.NoError(t, err)
	assert.Contains(t, content.HTML, "Buffalo Bills at Kansas City Chiefs was canceled before the numbers were drawn. This board has no winners.")
	assert.NotContains(t, content.HTML, ">Winner<")
}

func TestRenderRecap_RemovedPlayersAreMutedLikeOpenSquares(t *testing.T) {
	recap := sampleRecap()
	recap.Quarters[0].Winner = RemovedPlayer

	view := newRecapView("https://squares.example.com", recap)

	assert.True(t, view.Quarters[0].Open)
	assert.Equal(t, RemovedPlayer, view.Quarters[0].Winner)
	assert.False(t, view.Quarters[2].Open)
}

func TestRenderRecap_HidesTheTableWithoutQuarters(t *testing.T) {
	recap := sampleRecap()
	recap.Canceled, recap.Quarters = true, nil

	content, err := RenderRecap("https://squares.example.com", recap)
	require.NoError(t, err)

	assert.NotContains(t, content.HTML, ">Winner<")
	assert.NotContains(t, content.Text, "Winner")

	recap.Canceled = false
	content, err = RenderRecap("https://squares.example.com", recap)
	require.NoError(t, err)
	assert.Contains(t, content.Text, "Buffalo Bills 24, Kansas City Chiefs 27. This board has no winners.")
}

func TestRenderRecap_FallsBackToAwayAndHomeColumns(t *testing.T) {
	recap := sampleRecap()
	recap.AwayAbbr, recap.HomeAbbr = "", ""

	content, err := RenderRecap("https://squares.example.com", recap)
	require.NoError(t, err)

	assert.Contains(t, content.Text, "         Away Home Winner")
	assert.Contains(t, content.HTML, ">Away<")
	assert.Contains(t, content.HTML, "Final: Buffalo Bills 24, Kansas City Chiefs 27.")
}

func TestLabels(t *testing.T) {
	assert.Equal(t, "Q3", quarterLabel(3))
	assert.Equal(t, "Final", quarterLabel(4))
	assert.Equal(t, "Buffalo Bills", teamLabel("", "Buffalo Bills"))
	assert.Equal(t, "not a url", hostOf("not a url"))
}
