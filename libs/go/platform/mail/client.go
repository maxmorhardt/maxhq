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
)

const (
	implicitTLSPort = 465
	dialTimeout     = 10 * time.Second
	stepTimeout     = 30 * time.Second
)

var (
	ErrNoTLS          = errors.New("the smtp server does not offer STARTTLS, so credentials would go out in plaintext")
	ErrMaybeDelivered = errors.New("the connection failed after the message was sent, so the server may have accepted it")
)

type Sender interface {
	Send(ctx context.Context, msg *Message) error
	SendAll(ctx context.Context, msgs []*Message) []error
}

type client struct {
	cfg     Config
	from    *netmail.Address
	now     func() time.Time
	rootCAs *x509.CertPool
}

func New(cfg *Config) (Sender, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	from, err := netmail.ParseAddress(cfg.Sender())
	if err != nil {
		return nil, err
	}
	return &client{cfg: *cfg, from: from, now: time.Now}, nil
}

func Permanent(err error) bool {
	if errors.Is(err, ErrNoTLS) {
		return true
	}
	var reply *textproto.Error
	return errors.As(err, &reply) && reply.Code >= 500
}

func MaybeDelivered(err error) bool {
	return errors.Is(err, ErrMaybeDelivered)
}

func Retryable(err error) bool {
	return err != nil && !Permanent(err) && !MaybeDelivered(err)
}

func (c *client) Send(ctx context.Context, msg *Message) error {
	return c.SendAll(ctx, []*Message{msg})[0]
}

func (c *client) SendAll(ctx context.Context, msgs []*Message) []error {
	errs := make([]error, len(msgs))
	var s *session
	defer func() {
		if s != nil {
			s.close()
		}
	}()

	for i, msg := range msgs {
		if err := ctx.Err(); err != nil {
			fill(errs[i:], err)
			return errs
		}
		if s == nil {
			var err error
			if s, err = c.open(ctx); err != nil {
				fill(errs[i:], err)
				return errs
			}
		}
		if errs[i] = s.send(ctx, msg); errs[i] != nil && s.broken {
			s.close()
			s = nil
		}
	}
	return errs
}

func fill(errs []error, err error) {
	for i := range errs {
		errs[i] = err
	}
}

func (c *client) open(ctx context.Context) (*session, error) {
	addr := net.JoinHostPort(c.cfg.Host, strconv.Itoa(c.cfg.Port))
	dialer := &net.Dialer{Timeout: dialTimeout}
	tlsConfig := &tls.Config{ServerName: c.cfg.Host, MinVersion: tls.VersionTLS12, RootCAs: c.rootCAs}

	var conn net.Conn
	var err error
	if c.cfg.Port == implicitTLSPort {
		conn, err = (&tls.Dialer{NetDialer: dialer, Config: tlsConfig}).DialContext(ctx, "tcp", addr)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return nil, fmt.Errorf("connect to %s: %w", c.cfg.Host, err)
	}

	s := &session{client: c, conn: conn}
	if err := s.start(ctx, tlsConfig); err != nil {
		s.close()
		return nil, err
	}
	return s, nil
}

type session struct {
	client *client
	conn   net.Conn
	smtp   *smtp.Client
	broken bool
}

func (s *session) start(ctx context.Context, tlsConfig *tls.Config) error {
	if err := s.extendDeadline(ctx); err != nil {
		return err
	}

	smtpClient, err := smtp.NewClient(s.conn, s.client.cfg.Host)
	if err != nil {
		return err
	}
	s.smtp = smtpClient

	cfg := &s.client.cfg
	if cfg.Port != implicitTLSPort {
		if ok, _ := s.smtp.Extension("STARTTLS"); ok {
			if err := s.smtp.StartTLS(tlsConfig); err != nil {
				return fmt.Errorf("starttls: %w", err)
			}
		} else if cfg.User != "" {
			return ErrNoTLS
		}
	}
	if cfg.User != "" {
		if err := s.smtp.Auth(smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
	}
	return nil
}

func (s *session) send(ctx context.Context, msg *Message) error {
	body, err := msg.encode(s.client.from, s.client.now())
	if err != nil {
		return fmt.Errorf("encode message: %w", err)
	}
	return s.transact(ctx, msg.To, body)
}

func (s *session) transact(ctx context.Context, to string, body []byte) error {
	if err := s.extendDeadline(ctx); err != nil {
		return s.fail(err)
	}
	if err := s.smtp.Mail(s.client.from.Address); err != nil {
		return s.fail(err)
	}
	if err := s.smtp.Rcpt(to); err != nil {
		return s.fail(err)
	}

	w, err := s.smtp.Data()
	if err != nil {
		return s.fail(err)
	}
	if _, writeErr := w.Write(body); writeErr != nil {
		return s.fail(writeErr)
	}
	if closeErr := w.Close(); closeErr != nil {
		var reply *textproto.Error
		if errors.As(closeErr, &reply) {
			return s.fail(closeErr)
		}
		s.broken = true
		return fmt.Errorf("%w: %w", ErrMaybeDelivered, closeErr)
	}
	return nil
}

func (s *session) fail(err error) error {
	var reply *textproto.Error
	if !errors.As(err, &reply) || s.smtp.Reset() != nil {
		s.broken = true
	}
	return err
}

func (s *session) extendDeadline(ctx context.Context) error {
	deadline := time.Now().Add(stepTimeout)
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	return s.conn.SetDeadline(deadline)
}

func (s *session) close() {
	if s.smtp != nil && !s.broken {
		_ = s.smtp.Quit()
	}
	_ = s.conn.Close()
}
