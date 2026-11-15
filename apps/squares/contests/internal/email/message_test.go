package email

import (
	"bytes"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMessage_Encode(t *testing.T) {
	msg := &Message{To: "max@example.com", Subject: "Office Pool 🏈\r\nBcc: evil@example.com", HTML: "<p>Final – 27</p>", Text: "Final – 27"}
	from := &mail.Address{Name: "Squares", Address: "recaps@example.com"}

	raw, err := msg.encode(from, time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC))
	require.NoError(t, err)

	parsed, err := mail.ReadMessage(bytes.NewReader(raw))
	require.NoError(t, err)
	assert.Equal(t, `"Squares" <recaps@example.com>`, parsed.Header.Get("From"))
	assert.Equal(t, "<max@example.com>", parsed.Header.Get("To"))
	assert.Equal(t, FeedbackAddress, parsed.Header.Get("Reply-To"))
	assert.Empty(t, parsed.Header.Get("Bcc"))
	assert.True(t, strings.HasSuffix(parsed.Header.Get("Message-ID"), "@example.com>"))

	subject, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
	require.NoError(t, err)
	assert.Equal(t, "Office Pool 🏈 Bcc: evil@example.com", subject)

	mediaType, params, err := mime.ParseMediaType(parsed.Header.Get("Content-Type"))
	require.NoError(t, err)
	assert.Equal(t, "multipart/alternative", mediaType)

	parts := multipart.NewReader(parsed.Body, params["boundary"])
	var bodies []string
	for {
		part, err := parts.NextRawPart()
		if errors.Is(err, io.EOF) {
			break
		}
		require.NoError(t, err)
		body, err := io.ReadAll(quotedprintable.NewReader(part))
		require.NoError(t, err)
		bodies = append(bodies, part.Header.Get("Content-Type")+"|"+string(body))
	}
	assert.Equal(t, []string{"text/plain; charset=utf-8|Final – 27", "text/html; charset=utf-8|<p>Final – 27</p>"}, bodies)
}

func TestDomainOf(t *testing.T) {
	assert.Equal(t, "example.com", domainOf("a@example.com"))
	assert.Equal(t, "localhost", domainOf("nobody"))
}
