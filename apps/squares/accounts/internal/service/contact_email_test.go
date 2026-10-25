package service_test

import (
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"net/mail"
	"strings"
	"testing"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func parseEmail(t *testing.T, sub *model.ContactSubmission) (msg *mail.Message, parts map[string]string) {
	t.Helper()
	raw, err := service.BuildContactEmail("bot@maxhq.io", "support@maxhq.io", sub)
	require.NoError(t, err)

	msg, err = mail.ReadMessage(strings.NewReader(string(raw)))
	require.NoError(t, err)

	mediaType, params, err := mime.ParseMediaType(msg.Header.Get("Content-Type"))
	require.NoError(t, err)
	require.Equal(t, "multipart/alternative", mediaType)

	// multipart decodes quoted-printable parts on read
	parts = map[string]string{}
	reader := multipart.NewReader(msg.Body, params["boundary"])
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		require.NoError(t, err)
		body, err := io.ReadAll(part)
		require.NoError(t, err)
		contentType, _, _ := mime.ParseMediaType(part.Header.Get("Content-Type"))
		// text parts travel with CRLF line endings
		parts[contentType] = strings.ReplaceAll(string(body), "\r\n", "\n")
	}
	return msg, parts
}

func TestBuildContactEmail(t *testing.T) {
	msg, parts := parseEmail(t, &model.ContactSubmission{
		Name: "Ann Smith", Email: "ann@x.com", Subject: "Scores look off", Message: "Q2 shows 7–3 <b>twice</b>",
	})

	assert.Equal(t, "bot@maxhq.io", msg.Header.Get("From"))
	assert.Equal(t, "support@maxhq.io", msg.Header.Get("To"))
	subject, err := new(mime.WordDecoder).DecodeHeader(msg.Header.Get("Subject"))
	require.NoError(t, err)
	assert.Equal(t, "Contact Form: Scores look off", subject)
	assert.Equal(t, "<ann@x.com>", msg.Header.Get("Reply-To"))

	assert.Contains(t, parts["text/plain"], "Message:\nQ2 shows 7–3 <b>twice</b>")
	assert.Contains(t, parts["text/html"], "&lt;b&gt;twice&lt;/b&gt;", "the html part escapes what the visitor typed")
	assert.Contains(t, parts["text/html"], `href="mailto:ann@x.com?subject=Re%3A%20Scores%20look%20off"`, "the reply button encodes the subject")
}

func TestBuildContactEmail_SubmittedTextCannotAddHeaders(t *testing.T) {
	msg, _ := parseEmail(t, &model.ContactSubmission{
		Name:    "Mallory",
		Email:   "m@x.com\r\nBcc: victim@x.com",
		Subject: "hi\r\nBcc: victim@x.com\r\n\r\nforged body",
		Message: "hello",
	})

	assert.Empty(t, msg.Header.Get("Bcc"))
	assert.Empty(t, msg.Header.Get("Reply-To"), "an address that does not parse is left off")
	subject, err := new(mime.WordDecoder).DecodeHeader(msg.Header.Get("Subject"))
	require.NoError(t, err)
	assert.NotContains(t, subject, "\n")
	assert.Contains(t, subject, "Bcc: victim@x.com", "the attempt stays inside the subject text")
}
