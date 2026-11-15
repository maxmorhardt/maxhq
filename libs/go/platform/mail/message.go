package mail

import (
	"bytes"
	"errors"
	"fmt"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	netmail "net/mail"
	"net/textproto"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	foldWidth       = 76
	maxSubjectRunes = 300
)

var (
	ErrInvalidRecipient = errors.New("invalid recipient address")
	ErrInvalidReplyTo   = errors.New("invalid reply-to address")
	ErrEmptyMessage     = errors.New("message has neither a text nor an html body")
)

type Message struct {
	To      string
	ReplyTo string
	Subject string
	Text    string
	HTML    string
}

type envelope struct {
	to   string
	body []byte
}

type addresses struct {
	to      *netmail.Address
	replyTo *netmail.Address
}

func (m *Message) validate() (*addresses, error) {
	if m == nil || (m.Text == "" && m.HTML == "") {
		return nil, ErrEmptyMessage
	}
	to, err := netmail.ParseAddress(m.To)
	if err != nil {
		return nil, fmt.Errorf("%w %q: %w", ErrInvalidRecipient, m.To, err)
	}
	addrs := &addresses{to: to}
	if m.ReplyTo != "" {
		if addrs.replyTo, err = netmail.ParseAddress(m.ReplyTo); err != nil {
			return nil, fmt.Errorf("%w %q: %w", ErrInvalidReplyTo, m.ReplyTo, err)
		}
	}
	return addrs, nil
}

func (m *Message) build(from *netmail.Address, addrs *addresses) *envelope {
	var out bytes.Buffer
	parts := multipart.NewWriter(&out)
	header := func(key, value string) {
		out.WriteString(fold(key + ": " + oneLine(value)))
		out.WriteString("\r\n")
	}
	header("From", from.String())
	header("To", (&netmail.Address{Address: addrs.to.Address}).String())
	if addrs.replyTo != nil {
		header("Reply-To", addrs.replyTo.String())
	}
	header("Subject", subject(m.Subject))
	header("Date", time.Now().Format(time.RFC1123Z))
	header("Message-ID", fmt.Sprintf("<%s@%s>", uuid.NewString(), domainOf(from.Address)))
	header("MIME-Version", "1.0")
	header("Content-Type", fmt.Sprintf("multipart/alternative; boundary=%q", parts.Boundary()))
	out.WriteString("\r\n")

	for _, part := range []struct{ contentType, content string }{
		{"text/plain; charset=utf-8", m.Text},
		{"text/html; charset=utf-8", m.HTML},
	} {
		if part.content == "" {
			continue
		}
		w, _ := parts.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {part.contentType},
			"Content-Transfer-Encoding": {"quoted-printable"},
		})
		qp := quotedprintable.NewWriter(w)
		_, _ = qp.Write([]byte(part.content))
		_ = qp.Close()
	}
	_ = parts.Close()
	return &envelope{to: addrs.to.Address, body: out.Bytes()}
}

func subject(s string) string {
	s = oneLine(s)
	if runes := []rune(s); len(runes) > maxSubjectRunes {
		s = string(runes[:maxSubjectRunes])
	}
	s = strings.ReplaceAll(s, "=?", "=\u200b?")
	return mime.QEncoding.Encode("utf-8", s)
}

func oneLine(v string) string {
	return strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return ' '
		}
		return r
	}, v)
}

func fold(line string) string {
	var out strings.Builder
	width, words := 0, 0
	first := true
	for i, word := range strings.Split(line, " ") {
		if i > 0 {
			canBreak := words > 1 || (!first && words > 0)
			if canBreak && width+1+len(word) > foldWidth {
				out.WriteString("\r\n")
				width, words, first = 0, 0, false
			}
			out.WriteString(" ")
			width++
		}
		out.WriteString(word)
		width += len(word)
		words++
	}
	return out.String()
}

func domainOf(address string) string {
	if _, domain, ok := strings.Cut(address, "@"); ok && domain != "" {
		return domain
	}
	return "localhost"
}
