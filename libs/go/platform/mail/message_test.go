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

const crlf = "\r\n"

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
	addrs, err := msg.validate()
	require.NoError(t, err)
	return msg.build(from, addrs)
}

func headerOf(env *envelope) string {
	head, _, _ := strings.Cut(string(env.body), crlf+crlf)
	return head
}

func TestMessage_Build(t *testing.T) {
	msg := &Message{
		To:      "Max <max@example.com>",
		ReplyTo: "Jen <jen@example.com>",
		Subject: "Weekly report 📈" + crlf + "Bcc: evil@example.com",
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

func TestMessage_BuildSkipsEmptyParts(t *testing.T) {
	env := prepared(t, &Message{To: "max@example.com", HTML: "<p>hi</p>"}, &netmail.Address{Address: "nobody"})
	parsed, bodies := decode(t, env.body)

	assert.Empty(t, parsed.Header.Get("Reply-To"))
	assert.True(t, strings.HasSuffix(parsed.Header.Get("Message-ID"), "@localhost>"))
	assert.Equal(t, []string{"text/html; charset=utf-8|<p>hi</p>"}, bodies)
}

func TestMessage_SubjectCannotSmuggleEncodedWords(t *testing.T) {
	env := prepared(t, &Message{To: "max@example.com", Subject: "=?utf-8?b?RmFrZQ==?=", Text: "hi"}, &netmail.Address{Address: "notify@example.com"})
	parsed, _ := decode(t, env.body)

	decoded, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
	require.NoError(t, err)
	zwsp := string(rune(0x200b))
	assert.Equal(t, "="+zwsp+"?utf-8?b?RmFrZQ=="+zwsp+"?=", decoded)
}

func TestMessage_TruncatesLongSubjectsAndKeepsTheKeyLine(t *testing.T) {
	env := prepared(t, &Message{To: "max@example.com", Subject: strings.Repeat("x", 500), Text: "hi"}, &netmail.Address{Address: "notify@example.com"})

	head := headerOf(env)
	assert.NotContains(t, head, "Subject:"+crlf)
	assert.Contains(t, head, "Subject: "+strings.Repeat("x", maxSubjectRunes)+crlf)
}

func TestMessage_FoldNeverLeavesAWhitespaceOnlyLine(t *testing.T) {
	s := strings.Repeat("a", 60) + "  " + strings.Repeat("b", 75) + "  " + strings.Repeat("c", 75)
	env := prepared(t, &Message{To: "max@example.com", Subject: s, Text: "hi"}, &netmail.Address{Address: "notify@example.com"})

	for _, line := range strings.Split(headerOf(env), crlf) {
		assert.NotEmpty(t, strings.TrimSpace(line))
		assert.False(t, strings.HasSuffix(line, " "), line)
	}
}

func TestMessage_CapsLongReplyToNames(t *testing.T) {
	name := strings.Repeat("n", 1200)
	env := prepared(t, &Message{To: "max@example.com", ReplyTo: name + " <jen@example.com>", Text: "hi"}, &netmail.Address{Address: "notify@example.com"})

	for _, line := range strings.Split(headerOf(env), crlf) {
		assert.LessOrEqual(t, len(line), 998)
	}
	parsed, _ := decode(t, env.body)
	replyTo, err := netmail.ParseAddress(parsed.Header.Get("Reply-To"))
	require.NoError(t, err)
	assert.Len(t, replyTo.Name, maxNameRunes)
	assert.Equal(t, "jen@example.com", replyTo.Address)
}

func TestMessage_ValidateRejectsNil(t *testing.T) {
	var msg *Message
	_, err := msg.validate()
	assert.ErrorIs(t, err, ErrEmptyMessage)
}

func TestMessage_FoldsLongSubjects(t *testing.T) {
	subject := strings.Repeat("quarterly numbers for the whole team ", 6)
	for _, s := range []string{subject, subject + "📈"} {
		env := prepared(t, &Message{To: "max@example.com", Subject: s, Text: "hi"}, &netmail.Address{Address: "notify@example.com"})

		lines := strings.Split(headerOf(env), crlf)
		for _, line := range lines {
			assert.LessOrEqual(t, len(line), len("Subject: ")+75, line)
		}
		assert.Greater(t, len(lines), 9)
		parsed, _ := decode(t, env.body)
		decoded, err := new(mime.WordDecoder).DecodeHeader(parsed.Header.Get("Subject"))
		require.NoError(t, err)
		assert.Equal(t, strings.Join(strings.Fields(s), " "), strings.Join(strings.Fields(decoded), " "))
	}
}
