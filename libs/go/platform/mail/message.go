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

const foldWidth = 76

var (
	ErrInvalidRecipient = errors.New("invalid recipient address")
	ErrEmptyMessage     = errors.New("message has neither a text nor an html body")
)

type Message struct {
	To      string
	ReplyTo string
	Subject string
	Text    string
	HTML    string
}

func (m *Message) recipient() (*netmail.Address, error) {
	addr, err := netmail.ParseAddress(m.To)
	if err != nil {
		return nil, fmt.Errorf("%w %q: %w", ErrInvalidRecipient, m.To, err)
	}
	return addr, nil
}

func (m *Message) encode(from, to *netmail.Address, now time.Time) ([]byte, error) {
	if m.Text == "" && m.HTML == "" {
		return nil, ErrEmptyMessage
	}

	var body bytes.Buffer
	parts := multipart.NewWriter(&body)
	for _, part := range []struct{ contentType, content string }{
		{"text/plain; charset=utf-8", m.Text},
		{"text/html; charset=utf-8", m.HTML},
	} {
		if part.content == "" {
			continue
		}
		w, err := parts.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {part.contentType},
			"Content-Transfer-Encoding": {"quoted-printable"},
		})
		if err != nil {
			return nil, err
		}
		qp := quotedprintable.NewWriter(w)
		if _, err := qp.Write([]byte(part.content)); err != nil {
			return nil, err
		}
		if err := qp.Close(); err != nil {
			return nil, err
		}
	}
	if err := parts.Close(); err != nil {
		return nil, err
	}

	var out bytes.Buffer
	header := func(key, value string) {
		out.WriteString(fold(key + ": " + oneLine(value)))
		out.WriteString("\r\n")
	}
	header("From", from.String())
	header("To", (&netmail.Address{Address: to.Address}).String())
	if addr, err := netmail.ParseAddress(m.ReplyTo); err == nil {
		header("Reply-To", addr.String())
	}
	header("Subject", mime.QEncoding.Encode("utf-8", oneLine(m.Subject)))
	header("Date", now.Format(time.RFC1123Z))
	header("Message-ID", fmt.Sprintf("<%s@%s>", uuid.NewString(), domainOf(from.Address)))
	header("MIME-Version", "1.0")
	header("Content-Type", fmt.Sprintf("multipart/alternative; boundary=%q", parts.Boundary()))
	out.WriteString("\r\n")
	out.Write(body.Bytes())
	return out.Bytes(), nil
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
	width := 0
	for i, word := range strings.Split(line, " ") {
		if i > 0 {
			if width+1+len(word) > foldWidth {
				out.WriteString("\r\n")
				width = 0
			}
			out.WriteString(" ")
			width++
		}
		out.WriteString(word)
		width += len(word)
	}
	return out.String()
}

func domainOf(address string) string {
	if _, domain, ok := strings.Cut(address, "@"); ok && domain != "" {
		return domain
	}
	return "localhost"
}
