package mail

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"net"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/maxmorhardt/maxhq/libs/go/platform/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeSMTP struct {
	addr          *net.TCPAddr
	tls           *tls.Config
	starttls      bool
	ehloReply     string
	rcpt          map[string]string
	dataCmdReply  string
	dataReply     string
	dropOnData    map[string]bool
	closeAfter    int
	stallMail     bool
	stallAfterDot bool

	connections atomic.Int32
	mu          sync.Mutex
	received    []string
	rcpts       []string
	auths       int
}

func startFake(t *testing.T, f *fakeSMTP) *fakeSMTP {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	t.Cleanup(func() { _ = ln.Close() })
	f.addr = ln.Addr().(*net.TCPAddr)

	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			f.connections.Add(1)
			go f.serve(conn)
		}
	}()
	return f
}

func (f *fakeSMTP) serve(conn net.Conn) {
	defer func() { _ = conn.Close() }()
	c := textproto.NewConn(conn)
	_ = c.PrintfLine("220 fake ESMTP")
	secure := false
	sent := 0
	var to string
	for {
		line, err := c.ReadLine()
		if err != nil {
			return
		}
		verb, arg, _ := strings.Cut(line, " ")
		switch strings.ToUpper(verb) {
		case "EHLO":
			if f.ehloReply != "" {
				_ = c.PrintfLine("%s", f.ehloReply)
				return
			}
			_ = c.PrintfLine("250-fake")
			if f.starttls && !secure {
				_ = c.PrintfLine("250-STARTTLS")
			}
			_ = c.PrintfLine("250 AUTH PLAIN")
		case "STARTTLS":
			_ = c.PrintfLine("220 go ahead")
			if f.tls == nil {
				return
			}
			tlsConn := tls.Server(conn, f.tls)
			if tlsConn.Handshake() != nil {
				return
			}
			conn, secure = tlsConn, true
			c = textproto.NewConn(conn)
		case "AUTH":
			f.mu.Lock()
			f.auths++
			f.mu.Unlock()
			_ = c.PrintfLine("235 ok")
		case "MAIL":
			if f.stallMail {
				time.Sleep(time.Minute)
				return
			}
			if f.closeAfter > 0 && sent >= f.closeAfter {
				_ = c.PrintfLine("421 too many messages")
				return
			}
			_ = c.PrintfLine("250 ok")
		case "RSET":
			_ = c.PrintfLine("250 ok")
		case "RCPT":
			to = strings.Trim(strings.TrimPrefix(arg, "TO:"), "<>")
			f.mu.Lock()
			f.rcpts = append(f.rcpts, to)
			f.mu.Unlock()
			reply := "250 ok"
			if r, ok := f.rcpt[to]; ok {
				reply = r
			}
			_ = c.PrintfLine("%s", reply)
		case "DATA":
			if f.dataCmdReply != "" {
				_ = c.PrintfLine("%s", f.dataCmdReply)
				continue
			}
			_ = c.PrintfLine("354 go")
			data, _ := c.ReadDotBytes()
			if f.dropOnData[to] {
				return
			}
			if f.stallAfterDot {
				time.Sleep(time.Minute)
				return
			}
			if f.dataReply != "" {
				_ = c.PrintfLine("%s", f.dataReply)
				continue
			}
			sent++
			f.mu.Lock()
			f.received = append(f.received, string(data))
			f.mu.Unlock()
			_ = c.PrintfLine("250 queued")
		case "QUIT":
			_ = c.PrintfLine("221 bye")
			return
		default:
			_ = c.PrintfLine("502 unknown")
		}
	}
}

func (f *fakeSMTP) client(t *testing.T, user string, trust bool) *smtpClient {
	t.Helper()
	c, err := New(&config.SMTPConfig{Host: "127.0.0.1", Port: f.addr.Port, User: user, Password: "secret", From: "Example <notify@example.com>"})
	require.NoError(t, err)
	sc := c.(*smtpClient)
	if trust && f.tls != nil {
		cert, err := x509.ParseCertificate(f.tls.Certificates[0].Certificate[0])
		require.NoError(t, err)
		pool := x509.NewCertPool()
		pool.AddCert(cert)
		sc.rootCAs = pool
	}
	return sc
}

func (f *fakeSMTP) receivedCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.received)
}

func messages(to ...string) []*Message {
	msgs := make([]*Message, 0, len(to))
	for _, addr := range to {
		msgs = append(msgs, &Message{To: addr, Subject: "Weekly report", Text: "hi", HTML: "<p>hi</p>"})
	}
	return msgs
}

func serverTLS(t *testing.T) *tls.Config {
	t.Helper()
	srv := httptest.NewUnstartedServer(nil)
	srv.StartTLS()
	t.Cleanup(srv.Close)
	return &tls.Config{Certificates: srv.TLS.Certificates, MinVersion: tls.VersionTLS12}
}

func TestSendAll_UsesOneConnection(t *testing.T) {
	f := startFake(t, &fakeSMTP{})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com", "c@example.com"))

	assert.Equal(t, []error{nil, nil, nil}, errs)
	assert.Equal(t, int32(1), f.connections.Load())
	assert.Equal(t, 3, f.receivedCount())
}

func TestSendAll_LogsInOverStartTLS(t *testing.T) {
	f := startFake(t, &fakeSMTP{starttls: true, tls: serverTLS(t)})
	c := f.client(t, "apikey", true)
	c.requireTLS = true

	errs := c.SendAll(context.Background(), messages("a@example.com", "b@example.com"))

	assert.Equal(t, []error{nil, nil}, errs)
	assert.Equal(t, 1, f.auths)
	assert.Equal(t, 2, f.receivedCount())
}

func TestSend_UntrustedCertificateIsRetryable(t *testing.T) {
	f := startFake(t, &fakeSMTP{starttls: true, tls: serverTLS(t)})

	err := f.client(t, "apikey", false).Send(context.Background(), messages("a@example.com")[0])

	var certErr *tls.CertificateVerificationError
	require.ErrorAs(t, err, &certErr)
	assert.True(t, Retryable(err))
}

func TestSend_RequiresTLSAwayFromLoopback(t *testing.T) {
	f := startFake(t, &fakeSMTP{})
	c := f.client(t, "", false)
	c.requireTLS = true

	err := c.Send(context.Background(), messages("a@example.com")[0])

	require.ErrorIs(t, err, ErrNoTLS)
	assert.True(t, Retryable(err))
	assert.Equal(t, 0, f.receivedCount())
}

func TestSendAll_RejectedRecipientDoesNotStopTheRest(t *testing.T) {
	f := startFake(t, &fakeSMTP{rcpt: map[string]string{
		"gone@example.com": "550 mailbox unavailable",
		"busy@example.com": "451 try later",
	}})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("gone@example.com", "busy@example.com", "ok@example.com"))

	assert.True(t, Permanent(errs[0]))
	assert.True(t, Retryable(errs[1]))
	assert.NoError(t, errs[2])
	assert.Equal(t, int32(1), f.connections.Load())
}

func TestSendAll_InvalidMessagesFailBeforeConnecting(t *testing.T) {
	f := startFake(t, &fakeSMTP{})
	bad := []*Message{
		{To: "not an address", Text: "hi"},
		{To: "bad\r\n@example.com", Text: "hi"},
		{To: "a@example.com", ReplyTo: "not, an address", Text: "hi"},
		{To: "a@example.com", Subject: "empty"},
	}

	errs := f.client(t, "", false).SendAll(context.Background(), bad)

	require.ErrorIs(t, errs[0], ErrInvalidRecipient)
	require.ErrorIs(t, errs[1], ErrInvalidRecipient)
	require.ErrorIs(t, errs[2], ErrInvalidReplyTo)
	require.ErrorIs(t, errs[3], ErrEmptyMessage)
	for _, err := range errs {
		assert.True(t, Permanent(err))
	}
	assert.Equal(t, int32(0), f.connections.Load())
}

func TestSendAll_SkipsInvalidMessagesAndSendsTheRest(t *testing.T) {
	f := startFake(t, &fakeSMTP{})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("not an address", "Bob <bob@example.com>"))

	require.ErrorIs(t, errs[0], ErrInvalidRecipient)
	assert.NoError(t, errs[1])
	assert.Equal(t, []string{"bob@example.com"}, f.rcpts)
}

func TestSendAll_DroppedAfterDataIsMaybeDeliveredAndReconnects(t *testing.T) {
	f := startFake(t, &fakeSMTP{dropOnData: map[string]bool{"b@example.com": true}})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com", "c@example.com"))

	assert.NoError(t, errs[0])
	assert.True(t, MaybeDelivered(errs[1]))
	assert.False(t, Retryable(errs[1]))
	assert.NoError(t, errs[2])
	assert.Equal(t, int32(2), f.connections.Load())
}

func TestSendAll_RetriesOnAFreshConnectionWhenClosedBeforeData(t *testing.T) {
	f := startFake(t, &fakeSMTP{closeAfter: 2})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com", "c@example.com"))

	assert.Equal(t, []error{nil, nil, nil}, errs)
	assert.Equal(t, int32(2), f.connections.Load())
	assert.Equal(t, 3, f.receivedCount())
}

func TestSendAll_RejectedMessageBody(t *testing.T) {
	f := startFake(t, &fakeSMTP{dataReply: "554 rejected"})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com"))

	assert.True(t, Permanent(errs[0]))
	assert.True(t, Permanent(errs[1]))
	assert.Equal(t, int32(1), f.connections.Load())
}

func TestSendAll_RejectedDataCommandKeepsTheConnection(t *testing.T) {
	f := startFake(t, &fakeSMTP{dataCmdReply: "554 no data"})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com"))

	assert.True(t, Permanent(errs[0]))
	assert.True(t, Permanent(errs[1]))
	assert.Equal(t, int32(1), f.connections.Load())
}

func TestSend_BusyGreetingIsRetryable(t *testing.T) {
	f := startFake(t, &fakeSMTP{ehloReply: "421 busy"})

	err := f.client(t, "apikey", false).Send(context.Background(), messages("a@example.com")[0])

	require.ErrorContains(t, err, "ehlo")
	assert.True(t, Retryable(err))
}

func TestSendAll_FailedStartTLS(t *testing.T) {
	f := startFake(t, &fakeSMTP{starttls: true})

	errs := f.client(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com"))

	assert.ErrorContains(t, errs[0], "starttls")
	assert.Equal(t, errs[0], errs[1])
}

func TestSendAll_ConnectionRefused(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := ln.Addr().(*net.TCPAddr).Port
	require.NoError(t, ln.Close())

	for _, p := range []int{port, implicitTLSPort} {
		c, err := New(&config.SMTPConfig{Host: "127.0.0.1", Port: p, From: "notify@example.com"})
		require.NoError(t, err)
		errs := c.SendAll(context.Background(), messages("a@example.com", "b@example.com"))
		assert.Error(t, errs[0])
		assert.True(t, Retryable(errs[1]))
	}
}

func TestSendAll_StopsWhenCanceledBeforeStarting(t *testing.T) {
	f := startFake(t, &fakeSMTP{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	errs := f.client(t, "", false).SendAll(ctx, messages("a@example.com"))

	assert.ErrorIs(t, errs[0], context.Canceled)
	assert.Equal(t, int32(0), f.connections.Load())
}

func TestSendAll_CancelInterruptsAStalledServer(t *testing.T) {
	for name, f := range map[string]*fakeSMTP{"before data": {stallMail: true}, "after the message": {stallAfterDot: true}} {
		t.Run(name, func(t *testing.T) {
			startFake(t, f)
			ctx, cancel := context.WithCancel(context.Background())
			time.AfterFunc(200*time.Millisecond, cancel)

			start := time.Now()
			errs := f.client(t, "", false).SendAll(ctx, messages("a@example.com", "b@example.com"))

			assert.Less(t, time.Since(start), 5*time.Second)
			assert.ErrorIs(t, errs[1], context.Canceled)
		})
	}
}

func TestSend_HonorsTheContextDeadline(t *testing.T) {
	f := startFake(t, &fakeSMTP{})
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	assert.NoError(t, f.client(t, "", false).Send(ctx, messages("a@example.com")[0]))
}

func TestNew_RejectsInvalidConfig(t *testing.T) {
	cases := map[string]config.SMTPConfig{
		"SMTP_HOST":  {Port: 587, User: "a@example.com"},
		"SMTP_PORT":  {Host: "smtp.example.com", User: "a@example.com"},
		"EMAIL_FROM": {Host: "smtp.example.com", Port: 587, User: "apikey"},
	}
	for want, cfg := range cases {
		_, err := New(&cfg)
		assert.ErrorContains(t, err, want)
	}
	_, err := New(&config.SMTPConfig{Host: "smtp.example.com", Port: 70000, User: "a@example.com"})
	assert.ErrorContains(t, err, "SMTP_PORT")
}

func TestLoopback(t *testing.T) {
	assert.True(t, loopback("localhost"))
	assert.True(t, loopback("127.0.0.1"))
	assert.True(t, loopback("::1"))
	assert.False(t, loopback("smtp.example.com"))
	assert.False(t, loopback("10.0.0.1"))
}

func TestClassification(t *testing.T) {
	assert.False(t, Retryable(nil))
	assert.True(t, Retryable(errors.New("connection reset")))
	assert.False(t, Permanent(&textproto.Error{Code: 421}))
	assert.True(t, Permanent(&textproto.Error{Code: 550}))
}
