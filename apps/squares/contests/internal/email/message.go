package email

import (
	"bytes"
	"fmt"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"net/textproto"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Message struct {
	To      string
	Subject string
	HTML    string
	Text    string
}

func (m *Message) encode(from *mail.Address, now time.Time) ([]byte, error) {
	var body bytes.Buffer
	parts := multipart.NewWriter(&body)
	for _, part := range []struct{ contentType, content string }{
		{"text/plain; charset=utf-8", m.Text},
		{"text/html; charset=utf-8", m.HTML},
	} {
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
		fmt.Fprintf(&out, "%s: %s\r\n", key, headerSafe(value))
	}
	header("From", from.String())
	header("To", (&mail.Address{Address: m.To}).String())
	header("Reply-To", FeedbackAddress)
	header("Subject", mime.QEncoding.Encode("utf-8", headerSafe(m.Subject)))
	header("Date", now.Format(time.RFC1123Z))
	header("Message-ID", fmt.Sprintf("<%s@%s>", uuid.NewString(), domainOf(from.Address)))
	header("MIME-Version", "1.0")
	header("Content-Type", fmt.Sprintf("multipart/alternative; boundary=%q", parts.Boundary()))
	out.WriteString("\r\n")
	out.Write(body.Bytes())
	return out.Bytes(), nil
}

func headerSafe(value string) string {
	return strings.NewReplacer("\r", "", "\n", " ").Replace(value)
}

func domainOf(address string) string {
	if _, domain, ok := strings.Cut(address, "@"); ok && domain != "" {
		return domain
	}
	return "localhost"
}
