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

func encode(t *testing.T, msg *Message, from *netmail.Address) []byte {
	t.Helper()
	to, err := msg.recipient()
	require.NoError(t, err)
	raw, err := msg.encode(from, to, time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC))
	require.NoError(t, err)
	return raw
}

func TestMessage_Encode(t *testing.T) {
	msg := &Message{
		To:      "Max <max@example.com>",
		ReplyTo: "Jen <jen@example.com>",
		Subject: "Weekly report 📈\r\nBcc: evil@example.com",
		Text:    "Total – 27",
		HTML:    "<p>Total – 27</p>",
	}

	parsed, bodies := decode(t, encode(t, msg, &netmail.Address{Name: "Example", Address: "notify@example.com"}))

	assert.Equal(t, `"Example" <notify@example.com>`, parsed.Header.Get("From"))
	assert.Equal(t, "<max@example.com>", parsed.Header.Get("To"))
	assert.Equal(t, `"Jen" <jen@example.com>`, parsed.Header.Get("Reply-To"))
	assert.Empty(t, parsed.Header.Get("Bcc"))
	assert.True(t, strings.HasSuffix(parsed.Header.Get("Message-ID"), "@example.com>"))
	subject, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
	require.NoError(t, err)
	assert.Equal(t, "Weekly report 📈  Bcc: evil@example.com", subject)
	assert.Equal(t, []string{"text/plain; charset=utf-8|Total – 27", "text/html; charset=utf-8|<p>Total – 27</p>"}, bodies)
}

func TestMessage_EncodeSkipsEmptyPartsAndBadReplyTo(t *testing.T) {
	msg := &Message{To: "max@example.com", ReplyTo: "not an address", HTML: "<p>hi</p>"}

	parsed, bodies := decode(t, encode(t, msg, &netmail.Address{Address: "nobody"}))

	assert.Empty(t, parsed.Header.Get("Reply-To"))
	assert.True(t, strings.HasSuffix(parsed.Header.Get("Message-ID"), "@localhost>"))
	assert.Equal(t, []string{"text/html; charset=utf-8|<p>hi</p>"}, bodies)
}

func TestMessage_FoldsLongSubjects(t *testing.T) {
	subject := strings.Repeat("quarterly numbers for the whole team ", 8)
	for _, s := range []string{subject, subject + "📈"} {
		raw := encode(t, &Message{To: "max@example.com", Subject: s, Text: "hi"}, &netmail.Address{Address: "notify@example.com"})

		head, _, _ := strings.Cut(string(raw), "\r\n\r\n")
		for _, line := range strings.Split(head, "\r\n") {
			assert.LessOrEqual(t, len(line), 78, line)
		}
		parsed, _ := decode(t, raw)
		decoded, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
		require.NoError(t, err)
		assert.Equal(t, strings.Join(strings.Fields(s), " "), strings.Join(strings.Fields(decoded), " "))
	}
}
