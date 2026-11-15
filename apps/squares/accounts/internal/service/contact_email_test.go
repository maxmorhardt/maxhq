package service_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildContactEmail(t *testing.T) {
	content, err := service.BuildContactEmail(&model.ContactSubmission{
		ID: uuid.New(), Name: "Ann Smith", Email: "ann@x.com", Subject: "Scores look off", Message: "Q2 shows 7–3 <b>twice</b>",
		CreatedAt: time.Date(2026, 11, 15, 21, 30, 0, 0, time.UTC),
	})
	require.NoError(t, err)

	assert.Equal(t, "Squares contact form: Scores look off", content.Subject)
	assert.Contains(t, content.Text, "Message:\nQ2 shows 7–3 <b>twice</b>")
	assert.Contains(t, content.HTML, "&lt;b&gt;twice&lt;/b&gt;", "the html part escapes what the visitor typed")
	assert.Contains(t, content.HTML, `href="mailto:ann@x.com"`)
	assert.Contains(t, content.HTML, "Nov 15, 2026 at 9:30 PM UTC")
	assert.Contains(t, content.HTML, "<!--[if mso]>")
	assert.NotContains(t, content.HTML, "Reply to Ann Smith")
}
