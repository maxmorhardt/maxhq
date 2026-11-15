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

func prepared(t *testing.T, msg *Message, from *netmail.Address) *envelope {
	t.Helper()
	env, err := msg.prepare(from)
	require.NoError(t, err)
	return env
}

func TestMessage_Prepare(t *testing.T) {
	msg := &Message{
		To:      "Max <max@example.com>",
		ReplyTo: "Jen <jen@example.com>",
		Subject: "Weekly report 📈\r\nBcc: evil@example.com",
		Text:    "Total – 27",
		HTML:    "<p>Total – 27</p>",
	}

	env := prepared(t, msg, &netmail.Address{Name: "Example", Address: "notify@example.com"})
	parsed, bodies := decode(t, env.body)

	assert.Equal(t, "max@example.com", env.to)
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

func TestMessage_PrepareSkipsEmptyParts(t *testing.T) {
	env := prepared(t, &Message{To: "max@example.com", HTML: "<p>hi</p>"}, &netmail.Address{Address: "nobody"})
	parsed, bodies := decode(t, env.body)

	assert.Empty(t, parsed.Header.Get("Reply-To"))
	assert.True(t, strings.HasSuffix(parsed.Header.Get("Message-ID"), "@localhost>"))
	assert.Equal(t, []string{"text/html; charset=utf-8|<p>hi</p>"}, bodies)
}

func TestMessage_FoldsLongSubjects(t *testing.T) {
	subject := strings.Repeat("quarterly numbers for the whole team ", 8)
	for _, s := range []string{subject, subject + "📈"} {
		env := prepared(t, &Message{To: "max@example.com", Subject: s, Text: "hi"}, &netmail.Address{Address: "notify@example.com"})

		head, _, _ := strings.Cut(string(env.body), "\r\n\r\n")
		for _, line := range strings.Split(head, "\r\n") {
			assert.LessOrEqual(t, len(line), 78, line)
		}
		parsed, _ := decode(t, env.body)
		decoded, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
		require.NoError(t, err)
		assert.Equal(t, strings.Join(strings.Fields(s), " "), strings.Join(strings.Fields(decoded), " "))
	}
}
