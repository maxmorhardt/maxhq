package service

import (
	"bytes"
	"fmt"
	"html/template"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"net/textproto"
	"strings"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/templates"
)

var contactEmailTmpl = template.Must(template.New("contact_email").Parse(templates.ContactEmailHTML))

// one header line: control characters could start a new header
func oneLine(v string) string {
	return strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return ' '
		}
		return r
	}, v)
}

// BuildContactEmail renders a stored submission as a multipart message to support.
// Submitted text only reaches headers RFC 2047 encoded or as a parsed address,
// and the bodies are quoted-printable, so nothing a visitor types can add a header or a part.
func BuildContactEmail(from, to string, sub *model.ContactSubmission) ([]byte, error) {
	var htmlBody bytes.Buffer
	if err := contactEmailTmpl.Execute(&htmlBody, sub); err != nil {
		return nil, fmt.Errorf("failed to render contact email template: %w", err)
	}

	plainBody := fmt.Sprintf(
		"New contact form submission:\n\nName: %s\nEmail: %s\nSubject: %s\n\nMessage:\n%s\n",
		sub.Name, sub.Email, sub.Subject, sub.Message,
	)

	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\n", oneLine(from))
	fmt.Fprintf(&msg, "To: %s\r\n", oneLine(to))
	fmt.Fprintf(&msg, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", oneLine("Contact Form: "+sub.Subject)))
	// an address that does not parse is left off rather than passed through
	if addr, err := mail.ParseAddress(sub.Email); err == nil {
		fmt.Fprintf(&msg, "Reply-To: %s\r\n", addr.String())
	}
	fmt.Fprintf(&msg, "MIME-Version: 1.0\r\n")

	mpw := multipart.NewWriter(&msg)
	fmt.Fprintf(&msg, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", mpw.Boundary())

	if err := writeMIMEPart(mpw, `text/plain; charset="UTF-8"`, []byte(plainBody)); err != nil {
		return nil, err
	}
	if err := writeMIMEPart(mpw, `text/html; charset="UTF-8"`, htmlBody.Bytes()); err != nil {
		return nil, err
	}

	if err := mpw.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	return msg.Bytes(), nil
}

func writeMIMEPart(mpw *multipart.Writer, contentType string, body []byte) error {
	header := make(textproto.MIMEHeader)
	header.Set("Content-Type", contentType)
	header.Set("Content-Transfer-Encoding", "quoted-printable")

	pw, err := mpw.CreatePart(header)
	if err != nil {
		return fmt.Errorf("failed to create MIME part %q: %w", contentType, err)
	}

	qp := quotedprintable.NewWriter(pw)
	if _, err := qp.Write(body); err != nil {
		return fmt.Errorf("failed to write MIME part %q: %w", contentType, err)
	}
	if err := qp.Close(); err != nil {
		return fmt.Errorf("failed to finish MIME part %q: %w", contentType, err)
	}

	return nil
}
