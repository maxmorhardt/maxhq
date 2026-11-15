package mail

import (
	"bytes"
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

type Message struct {
	To      string
	ReplyTo string
	Subject string
	Text    string
	HTML    string
}

func (m *Message) encode(from *netmail.Address, now time.Time) ([]byte, error) {
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
		fmt.Fprintf(&out, "%s: %s\r\n", key, oneLine(value))
	}
	header("From", from.String())
	header("To", (&netmail.Address{Address: m.To}).String())
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

func domainOf(address string) string {
	if _, domain, ok := strings.Cut(address, "@"); ok && domain != "" {
		return domain
	}
	return "localhost"
}
