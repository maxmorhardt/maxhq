package mail

import (
	"bytes"
	"errors"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	netmail "net/mail"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func decode(t *testing.T, raw []byte) (parsed *netmail.Message, bodies []string) {
	t.Helper()
	parsed, err := netmail.ReadMessage(bytes.NewReader(raw))
	require.NoError(t, err)
	_, params, err := mime.ParseMediaType(parsed.Header.Get("Content-Type"))
	require.NoError(t, err)

	reader := multipart.NewReader(parsed.Body, params["boundary"])
	for {
		part, err := reader.NextRawPart()
		if errors.Is(err, io.EOF) {
			break
		}
		require.NoError(t, err)
		body, err := io.ReadAll(quotedprintable.NewReader(part))
		require.NoError(t, err)
		bodies = append(bodies, part.Header.Get("Content-Type")+"|"+string(body))
	}
	return parsed, bodies
}

func TestMessage_Encode(t *testing.T) {
	msg := &Message{
		To:      "max@example.com",
		ReplyTo: "Jen <jen@example.com>",
		Subject: "Office Pool 🏈\r\nBcc: evil@example.com",
		Text:    "Final – 27",
		HTML:    "<p>Final – 27</p>",
	}
	raw, err := msg.encode(&netmail.Address{Name: "Squares", Address: "recaps@example.com"}, time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC))
	require.NoError(t, err)

	parsed, bodies := decode(t, raw)
	assert.Equal(t, `"Squares" <recaps@example.com>`, parsed.Header.Get("From"))
	assert.Equal(t, "<max@example.com>", parsed.Header.Get("To"))
	assert.Equal(t, `"Jen" <jen@example.com>`, parsed.Header.Get("Reply-To"))
	assert.Empty(t, parsed.Header.Get("Bcc"))
	assert.True(t, strings.HasSuffix(parsed.Header.Get("Message-ID"), "@example.com>"))
	subject, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
	require.NoError(t, err)
	assert.Equal(t, "Office Pool 🏈  Bcc: evil@example.com", subject)
	assert.Equal(t, []string{"text/plain; charset=utf-8|Final – 27", "text/html; charset=utf-8|<p>Final – 27</p>"}, bodies)
}

func TestMessage_EncodeSkipsEmptyPartsAndBadReplyTo(t *testing.T) {
	msg := &Message{To: "max@example.com", ReplyTo: "not an address", HTML: "<p>hi</p>"}
	raw, err := msg.encode(&netmail.Address{Address: "nobody"}, time.Now())
	require.NoError(t, err)

	parsed, bodies := decode(t, raw)
	assert.Empty(t, parsed.Header.Get("Reply-To"))
	assert.True(t, strings.HasSuffix(parsed.Header.Get("Message-ID"), "@localhost>"))
	assert.Equal(t, []string{"text/html; charset=utf-8|<p>hi</p>"}, bodies)
}
