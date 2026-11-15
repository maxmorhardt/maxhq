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
	"sync"
	"time"
)

const (
	implicitTLSPort = 465
	dialTimeout     = 10 * time.Second
	stepTimeout     = 30 * time.Second
	helloName       = "localhost"
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
	from, err := cfg.sender()
	if err != nil {
		return nil, err
	}
	return &client{cfg: *cfg, from: from, now: time.Now}, nil
}

func Permanent(err error) bool {
	var reply *textproto.Error
	var certErr *tls.CertificateVerificationError
	switch {
	case errors.Is(err, ErrNoTLS), errors.Is(err, ErrInvalidRecipient), errors.Is(err, ErrEmptyMessage):
		return true
	case errors.As(err, &certErr):
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
		for attempt := 0; ; attempt++ {
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

			errs[i] = s.send(ctx, msg)
			if errs[i] == nil || !s.broken {
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

func fill(errs []error, err error) {
	for i := range errs {
		errs[i] = err
	}
}

func (c *client) open(ctx context.Context) (*session, error) {
	addr := net.JoinHostPort(c.cfg.Host, strconv.Itoa(c.cfg.Port))
	raw, err := (&net.Dialer{Timeout: dialTimeout}).DialContext(ctx, "tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("connect to %s: %w", c.cfg.Host, err)
	}

	tracked := &trackedConn{Conn: raw}
	s := &session{client: c, raw: tracked, conn: tracked}
	s.stopCancel = context.AfterFunc(ctx, func() { _ = raw.SetDeadline(time.Now()) })
	if err := s.start(ctx, &tls.Config{ServerName: c.cfg.Host, MinVersion: tls.VersionTLS12, RootCAs: c.rootCAs}); err != nil {
		s.broken = true
		s.close()
		return nil, err
	}
	return s, nil
}

type trackedConn struct {
	net.Conn
	mu       sync.Mutex
	writeErr error
}

func (t *trackedConn) Write(p []byte) (int, error) {
	n, err := t.Conn.Write(p)
	if err != nil {
		t.mu.Lock()
		t.writeErr = err
		t.mu.Unlock()
	}
	return n, err
}

func (t *trackedConn) lastWriteErr() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.writeErr
}

func (t *trackedConn) resetWriteErr() {
	t.mu.Lock()
	t.writeErr = nil
	t.mu.Unlock()
}

type session struct {
	client     *client
	raw        *trackedConn
	conn       net.Conn
	smtp       *smtp.Client
	stopCancel func() bool
	broken     bool
}

func (s *session) start(ctx context.Context, tlsConfig *tls.Config) error {
	if err := s.extendDeadline(ctx); err != nil {
		return err
	}

	cfg := &s.client.cfg
	if cfg.Port == implicitTLSPort {
		tlsConn := tls.Client(s.raw, tlsConfig)
		if err := tlsConn.HandshakeContext(ctx); err != nil {
			return fmt.Errorf("tls: %w", err)
		}
		s.conn = tlsConn
	}

	smtpClient, err := smtp.NewClient(s.conn, cfg.Host)
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
	to, err := msg.recipient()
	if err != nil {
		return err
	}
	body, err := msg.encode(s.client.from, to, s.client.now())
	if err != nil {
		return err
	}
	return s.transact(ctx, to.Address, body)
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
	s.raw.resetWriteErr()
	if closeErr := w.Close(); closeErr != nil {
		var reply *textproto.Error
		if errors.As(closeErr, &reply) {
			return s.fail(closeErr)
		}
		s.broken = true
		if writeErr := s.raw.lastWriteErr(); writeErr != nil {
			return fmt.Errorf("finish message: %w", writeErr)
		}
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
	return s.raw.SetDeadline(deadline)
}

func (s *session) close() {
	s.stopCancel()
	if s.smtp != nil && !s.broken {
		_ = s.smtp.Quit()
	}
	_ = s.conn.Close()
}
