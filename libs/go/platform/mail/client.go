package mail

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net"
	netmail "net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
)

const (
	implicitTLSPort = 465
	dialTimeout     = 10 * time.Second
	stepTimeout     = 30 * time.Second
	acceptTimeout   = 5 * time.Minute
	quitTimeout     = 5 * time.Second
	helloName       = "localhost"
)

var (
	ErrNoTLS          = errors.New("the smtp server does not offer STARTTLS, so mail would go out in plaintext")
	ErrMaybeDelivered = errors.New("the connection failed after the message was sent, so the server may have accepted it")
	ErrSession        = errors.New("the smtp session failed")
)

type Client interface {
	Send(ctx context.Context, msg *Message) error
	SendAll(ctx context.Context, msgs []*Message) []error
}

type smtpClient struct {
	cfg        config.SMTPConfig
	from       *netmail.Address
	requireTLS bool
	rootCAs    *x509.CertPool
}

func New(cfg *config.SMTPConfig) (Client, error) {
	if cfg.Host == "" {
		return nil, errors.New("SMTP_HOST is required")
	}
	if cfg.Port < 1 || cfg.Port > 65535 {
		return nil, fmt.Errorf("SMTP_PORT must be between 1 and 65535, got %d", cfg.Port)
	}
	from, err := netmail.ParseAddress(cfg.Sender())
	if err != nil {
		return nil, fmt.Errorf("EMAIL_FROM (or SMTP_USER when it is unset) must be an email address: %w", err)
	}
	return &smtpClient{cfg: *cfg, from: from, requireTLS: !loopback(cfg.Host)}, nil
}

func Permanent(err error) bool {
	var reply *textproto.Error
	switch {
	case errors.Is(err, ErrSession):
		return false
	case errors.Is(err, ErrInvalidRecipient), errors.Is(err, ErrInvalidReplyTo), errors.Is(err, ErrEmptyMessage):
		return true
	case errors.As(err, &reply):
		return reply.Code >= 500
	}
	return false
}

func MaybeDelivered(err error) bool {
	return errors.Is(err, ErrMaybeDelivered)
}

func Retryable(err error) bool {
	return err != nil && !Permanent(err) && !MaybeDelivered(err)
}

func (c *smtpClient) Send(ctx context.Context, msg *Message) error {
	return c.SendAll(ctx, []*Message{msg})[0]
}

func (c *smtpClient) SendAll(ctx context.Context, msgs []*Message) []error {
	errs := make([]error, len(msgs))
	parsed := make([]*addresses, len(msgs))
	pending := make([]int, 0, len(msgs))
	for i, msg := range msgs {
		if parsed[i], errs[i] = msg.validate(); errs[i] == nil {
			pending = append(pending, i)
		}
	}

	var s *session
	defer func() {
		if s != nil {
			s.close()
		}
	}()

	for n, i := range pending {
		for attempt := 0; ; attempt++ {
			if err := ctx.Err(); err != nil {
				failAll(errs, pending[n:], err)
				return errs
			}
			if s == nil {
				var err error
				if s, err = c.open(ctx); err != nil {
					failAll(errs, pending[n:], err)
					return errs
				}
			}

			errs[i] = s.transact(ctx, msgs[i].build(c.from, parsed[i]))
			if errs[i] == nil {
				break
			}
			if !s.broken {
				if errors.Is(errs[i], ErrSession) {
					failAll(errs, pending[n+1:], errs[i])
					return errs
				}
				break
			}
			s.close()
			s = nil
			if attempt > 0 || !Retryable(errs[i]) {
				break
			}
		}
	}
	return errs
}

func failAll(errs []error, indexes []int, err error) {
	for _, i := range indexes {
		errs[i] = err
	}
}

func (c *smtpClient) open(ctx context.Context) (*session, error) {
	addr := net.JoinHostPort(c.cfg.Host, strconv.Itoa(c.cfg.Port))
	raw, err := (&net.Dialer{Timeout: dialTimeout}).DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("%w: connect to %s: %w", ErrSession, c.cfg.Host, err)
	}

	s := &session{client: c, raw: raw}
	s.stopCancel = context.AfterFunc(ctx, func() { _ = raw.SetDeadline(time.Now()) })
	if err := s.start(ctx, &tls.Config{ServerName: c.cfg.Host, MinVersion: tls.VersionTLS12, RootCAs: c.rootCAs}); err != nil {
		s.broken = true
		s.close()
		return nil, fmt.Errorf("%w: %w", ErrSession, err)
	}
	return s, nil
}

type session struct {
	client     *smtpClient
	raw        net.Conn
	smtp       *smtp.Client
	stopCancel func() bool
	broken     bool
}

func (s *session) start(ctx context.Context, tlsConfig *tls.Config) error {
	if err := s.extendDeadline(ctx, stepTimeout); err != nil {
		return err
	}

	cfg := &s.client.cfg
	conn := s.raw
	if cfg.Port == implicitTLSPort {
		tlsConn := tls.Client(s.raw, tlsConfig)
		if err := tlsConn.HandshakeContext(ctx); err != nil {
			return fmt.Errorf("tls: %w", err)
		}
		conn = tlsConn
	}

	smtpClient, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return err
	}
	s.smtp = smtpClient
	if err := s.smtp.Hello(helloName); err != nil {
		return fmt.Errorf("ehlo: %w", err)
	}

	if cfg.Port != implicitTLSPort {
		if ok, _ := s.smtp.Extension("STARTTLS"); ok {
			if err := s.smtp.StartTLS(tlsConfig); err != nil {
				return fmt.Errorf("starttls: %w", err)
			}
		} else if s.client.requireTLS {
			return ErrNoTLS
		}
	}
	if cfg.User != "" {
		if err := s.extendDeadline(ctx, stepTimeout); err != nil {
			return err
		}
		if err := s.smtp.Auth(smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
	}
	return nil
}

func loopback(host string) bool {
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

func (s *session) transact(ctx context.Context, env *envelope) error {
	if err := s.step(ctx, func() error { return s.smtp.Mail(s.client.from.Address) }); err != nil {
		return fmt.Errorf("%w: mail from: %w", ErrSession, err)
	}
	if err := s.step(ctx, func() error { return s.smtp.Rcpt(env.to) }); err != nil {
		return err
	}
	if err := s.step(ctx, func() error { return s.command(354, "DATA") }); err != nil {
		return err
	}

	w := s.smtp.Text.DotWriter()
	if _, err := w.Write(env.body); err != nil {
		s.broken = true
		return fmt.Errorf("send message: %w", err)
	}
	if err := w.Close(); err != nil {
		s.broken = true
		return fmt.Errorf("finish message: %w", err)
	}

	if err := s.extendDeadline(ctx, acceptTimeout); err != nil {
		s.broken = true
		return fmt.Errorf("%w: %w", ErrMaybeDelivered, err)
	}
	if _, _, err := s.smtp.Text.ReadResponse(250); err != nil {
		var reply *textproto.Error
		if errors.As(err, &reply) {
			return s.fail(err)
		}
		s.broken = true
		return fmt.Errorf("%w: %w", ErrMaybeDelivered, err)
	}
	return nil
}

func (s *session) step(ctx context.Context, fn func() error) error {
	if err := s.extendDeadline(ctx, stepTimeout); err != nil {
		return s.fail(err)
	}
	if err := fn(); err != nil {
		return s.fail(err)
	}
	return nil
}

func (s *session) command(code int, cmd string) error {
	id, err := s.smtp.Text.Cmd("%s", cmd)
	if err != nil {
		return err
	}
	s.smtp.Text.StartResponse(id)
	defer s.smtp.Text.EndResponse(id)
	_, _, err = s.smtp.Text.ReadResponse(code)
	return err
}

func (s *session) fail(err error) error {
	var reply *textproto.Error
	if !errors.As(err, &reply) || s.smtp.Reset() != nil {
		s.broken = true
	}
	return err
}

func (s *session) extendDeadline(ctx context.Context, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	if err := s.raw.SetDeadline(deadline); err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		_ = s.raw.SetDeadline(time.Now())
		return err
	}
	return nil
}

func (s *session) close() {
	canceled := !s.stopCancel()
	if s.smtp != nil && !s.broken && !canceled {
		_ = s.raw.SetDeadline(time.Now().Add(quitTimeout))
		_ = s.smtp.Quit()
	}
	if s.smtp != nil {
		_ = s.smtp.Close()
	}
	_ = s.raw.Close()
}
