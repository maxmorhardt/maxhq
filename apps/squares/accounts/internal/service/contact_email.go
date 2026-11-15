package service

import (
	"bytes"
	"fmt"
	"html/template"

	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/accounts/internal/templates"
)

const (
	msoOpen  = `<!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->`
	msoClose = `<!--[if mso]></td></tr></table><![endif]-->`
)

var contactEmailTmpl = template.Must(template.New("contact_email").Funcs(template.FuncMap{
	"msoOpen":  func() template.HTML { return msoOpen },
	"msoClose": func() template.HTML { return msoClose },
}).Parse(templates.ContactEmailHTML))

type ContactEmail struct {
	Subject string
	Text    string
	HTML    string
}

func BuildContactEmail(sub *model.ContactSubmission) (*ContactEmail, error) {
	var html bytes.Buffer
	if err := contactEmailTmpl.Execute(&html, sub); err != nil {
		return nil, fmt.Errorf("failed to render contact email template: %w", err)
	}

	return &ContactEmail{
		Subject: "Squares contact form: " + sub.Subject,
		Text: fmt.Sprintf(
			"New contact form submission:\n\nName: %s\nEmail: %s\nSubject: %s\n\nMessage:\n%s\n",
			sub.Name, sub.Email, sub.Subject, sub.Message,
		),
		HTML: html.String(),
	}, nil
}
