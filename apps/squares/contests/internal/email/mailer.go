package email

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"time"
)

const (
	implicitTLSPort = 465
	dialTimeout     = 10 * time.Second
	sendTimeout     = 30 * time.Second
)

type Mailer interface {
	Send(ctx context.Context, msg *Message) error
}

type smtpMailer struct {
	cfg  Config
	from *mail.Address
	now  func() time.Time
}

func NewMailer(cfg *Config) (Mailer, error) {
	from, err := mail.ParseAddress(cfg.From)
	if err != nil {
		return nil, fmt.Errorf("parse EMAIL_FROM: %w", err)
	}
	return &smtpMailer{cfg: *cfg, from: from, now: time.Now}, nil
}

func (m *smtpMailer) Send(ctx context.Context, msg *Message) error {
	body, err := msg.encode(m.from, m.now())
	if err != nil {
		return fmt.Errorf("encode message: %w", err)
	}

	conn, err := m.dial(ctx)
	if err != nil {
		return fmt.Errorf("%w: connect to %s: %w", ErrConnection, m.cfg.SMTPHost, err)
	}
	defer func() { _ = conn.Close() }()

	deadline := time.Now().Add(sendTimeout)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	if deadlineErr := conn.SetDeadline(deadline); deadlineErr != nil {
		return deadlineErr
	}

	client, err := smtp.NewClient(conn, m.cfg.SMTPHost)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrConnection, err)
	}
	defer func() { _ = client.Close() }()

	return m.deliver(client, msg.To, body)
}

func (m *smtpMailer) deliver(client *smtp.Client, to string, body []byte) error {
	if m.cfg.SMTPPort != implicitTLSPort {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(m.tlsConfig()); err != nil {
				return fmt.Errorf("%w: starttls: %w", ErrConnection, err)
			}
		} else if m.cfg.SMTPUser != "" {
			return fmt.Errorf("%w: %w", ErrConnection, ErrNoTLS)
		}
	}
	if m.cfg.SMTPUser != "" {
		if err := client.Auth(smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPassword, m.cfg.SMTPHost)); err != nil {
			return fmt.Errorf("%w: auth: %w", ErrConnection, err)
		}
	}
	if err := client.Mail(m.from.Address); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}

	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, writeErr := w.Write(body); writeErr != nil {
		return writeErr
	}
	if closeErr := w.Close(); closeErr != nil {
		return closeErr
	}
	_ = client.Quit()
	return nil
}

func (m *smtpMailer) dial(ctx context.Context) (net.Conn, error) {
	addr := net.JoinHostPort(m.cfg.SMTPHost, strconv.Itoa(m.cfg.SMTPPort))
	dialer := &net.Dialer{Timeout: dialTimeout}
	if m.cfg.SMTPPort == implicitTLSPort {
		return (&tls.Dialer{NetDialer: dialer, Config: m.tlsConfig()}).DialContext(ctx, "tcp", addr)
	}
	return dialer.DialContext(ctx, "tcp", addr)
}

func (m *smtpMailer) tlsConfig() *tls.Config {
	return &tls.Config{ServerName: m.cfg.SMTPHost, MinVersion: tls.VersionTLS12}
}

var (
	ErrNoTLS      = errors.New("the smtp server does not offer STARTTLS, so credentials would go out in plaintext")
	ErrConnection = errors.New("could not open an smtp session")
)

func IsPermanent(err error) bool {
	if errors.Is(err, ErrNoTLS) {
		return true
	}
	var reply *textproto.Error
	return errors.As(err, &reply) && reply.Code >= 500
}
