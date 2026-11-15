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

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeSMTP struct {
	addr       *net.TCPAddr
	tls        *tls.Config
	starttls   bool
	ehloReply  string
	rcpt       map[string]string
	dataReply  string
	dropOnData map[string]bool
	closeAfter int
	stallMail  bool

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
			_ = c.PrintfLine("354 go")
			data, _ := c.ReadDotBytes()
			if f.dropOnData[to] {
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

func (f *fakeSMTP) sender(t *testing.T, user string, trust bool) Sender {
	t.Helper()
	s, err := New(&Config{Host: "127.0.0.1", Port: f.addr.Port, User: user, Password: "secret", From: "Example <notify@example.com>"})
	require.NoError(t, err)
	if trust && f.tls != nil {
		cert, err := x509.ParseCertificate(f.tls.Certificates[0].Certificate[0])
		require.NoError(t, err)
		pool := x509.NewCertPool()
		pool.AddCert(cert)
		s.(*client).rootCAs = pool
	}
	return s
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

	errs := f.sender(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com", "c@example.com"))

	assert.Equal(t, []error{nil, nil, nil}, errs)
	assert.Equal(t, int32(1), f.connections.Load())
	assert.Equal(t, 3, f.receivedCount())
}

func TestSendAll_LogsInOverStartTLS(t *testing.T) {
	f := startFake(t, &fakeSMTP{starttls: true, tls: serverTLS(t)})

	errs := f.sender(t, "apikey", true).SendAll(context.Background(), messages("a@example.com", "b@example.com"))

	assert.Equal(t, []error{nil, nil}, errs)
	assert.Equal(t, 1, f.auths)
	assert.Equal(t, 2, f.receivedCount())
}

func TestSendAll_UntrustedCertificateIsPermanent(t *testing.T) {
	f := startFake(t, &fakeSMTP{starttls: true, tls: serverTLS(t)})

	err := f.sender(t, "apikey", false).Send(context.Background(), messages("a@example.com")[0])

	require.ErrorContains(t, err, "starttls")
	assert.True(t, Permanent(err))
}

func TestSendAll_RejectedRecipientDoesNotStopTheRest(t *testing.T) {
	f := startFake(t, &fakeSMTP{rcpt: map[string]string{
		"gone@example.com": "550 mailbox unavailable",
		"busy@example.com": "451 try later",
	}})

	errs := f.sender(t, "", false).SendAll(context.Background(), messages("gone@example.com", "busy@example.com", "ok@example.com"))

	assert.True(t, Permanent(errs[0]))
	assert.True(t, Retryable(errs[1]))
	assert.NoError(t, errs[2])
	assert.Equal(t, int32(1), f.connections.Load())
}

func TestSendAll_InvalidRecipientsArePermanentAndKeepTheConnection(t *testing.T) {
	f := startFake(t, &fakeSMTP{})

	errs := f.sender(t, "", false).SendAll(context.Background(), messages("not an address", "bad\r\n@example.com", "Bob <bob@example.com>"))

	require.ErrorIs(t, errs[0], ErrInvalidRecipient)
	assert.True(t, Permanent(errs[0]))
	assert.True(t, Permanent(errs[1]))
	assert.NoError(t, errs[2])
	assert.Equal(t, []string{"bob@example.com"}, f.rcpts)
	assert.Equal(t, int32(1), f.connections.Load())
}

func TestSendAll_EmptyMessageIsPermanent(t *testing.T) {
	f := startFake(t, &fakeSMTP{})

	err := f.sender(t, "", false).Send(context.Background(), &Message{To: "a@example.com", Subject: "empty"})

	require.ErrorIs(t, err, ErrEmptyMessage)
	assert.True(t, Permanent(err))
}

func TestSendAll_DroppedAfterDataIsMaybeDeliveredAndReconnects(t *testing.T) {
	f := startFake(t, &fakeSMTP{dropOnData: map[string]bool{"b@example.com": true}})

	errs := f.sender(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com", "c@example.com"))

	assert.NoError(t, errs[0])
	assert.True(t, MaybeDelivered(errs[1]))
	assert.False(t, Retryable(errs[1]))
	assert.NoError(t, errs[2])
	assert.Equal(t, int32(2), f.connections.Load())
}

func TestSendAll_RetriesOnAFreshConnectionWhenClosedBeforeData(t *testing.T) {
	f := startFake(t, &fakeSMTP{closeAfter: 2})

	errs := f.sender(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com", "c@example.com"))

	assert.Equal(t, []error{nil, nil, nil}, errs)
	assert.Equal(t, int32(2), f.connections.Load())
	assert.Equal(t, 3, f.receivedCount())
}

func TestSendAll_RejectedMessageBody(t *testing.T) {
	f := startFake(t, &fakeSMTP{dataReply: "554 rejected"})

	errs := f.sender(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com"))

	assert.True(t, Permanent(errs[0]))
	assert.True(t, Permanent(errs[1]))
	assert.Equal(t, int32(1), f.connections.Load())
}

func TestSend_RefusesCredentialsWithoutTLS(t *testing.T) {
	f := startFake(t, &fakeSMTP{})

	err := f.sender(t, "apikey", false).Send(context.Background(), messages("a@example.com")[0])

	require.ErrorIs(t, err, ErrNoTLS)
	assert.True(t, Permanent(err))
}

func TestSend_BusyGreetingIsRetryableNotNoTLS(t *testing.T) {
	f := startFake(t, &fakeSMTP{ehloReply: "421 busy"})

	err := f.sender(t, "apikey", false).Send(context.Background(), messages("a@example.com")[0])

	require.ErrorContains(t, err, "ehlo")
	assert.NotErrorIs(t, err, ErrNoTLS)
	assert.True(t, Retryable(err))
}

func TestSendAll_FailedStartTLS(t *testing.T) {
	f := startFake(t, &fakeSMTP{starttls: true})

	errs := f.sender(t, "", false).SendAll(context.Background(), messages("a@example.com", "b@example.com"))

	assert.ErrorContains(t, errs[0], "starttls")
	assert.Equal(t, errs[0], errs[1])
}

func TestSendAll_ConnectionRefused(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := ln.Addr().(*net.TCPAddr).Port
	require.NoError(t, ln.Close())

	for _, p := range []int{port, implicitTLSPort} {
		s, err := New(&Config{Host: "127.0.0.1", Port: p, From: "notify@example.com"})
		require.NoError(t, err)
		errs := s.SendAll(context.Background(), messages("a@example.com", "b@example.com"))
		assert.Error(t, errs[0])
		assert.True(t, Retryable(errs[1]))
	}
}

func TestSendAll_StopsWhenCanceledBeforeStarting(t *testing.T) {
	f := startFake(t, &fakeSMTP{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	errs := f.sender(t, "", false).SendAll(ctx, messages("a@example.com"))

	assert.ErrorIs(t, errs[0], context.Canceled)
	assert.Equal(t, int32(0), f.connections.Load())
}

func TestSendAll_CancelInterruptsAStalledServer(t *testing.T) {
	f := startFake(t, &fakeSMTP{stallMail: true})
	ctx, cancel := context.WithCancel(context.Background())
	time.AfterFunc(200*time.Millisecond, cancel)

	start := time.Now()
	errs := f.sender(t, "", false).SendAll(ctx, messages("a@example.com", "b@example.com"))

	assert.Less(t, time.Since(start), 5*time.Second)
	assert.ErrorIs(t, errs[1], context.Canceled)
}

func TestSend_HonorsTheContextDeadline(t *testing.T) {
	f := startFake(t, &fakeSMTP{})
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	assert.NoError(t, f.sender(t, "", false).Send(ctx, messages("a@example.com")[0]))
}

func TestNew_RejectsInvalidConfig(t *testing.T) {
	_, err := New(&Config{Host: "smtp.example.com", Port: 587, User: "apikey"})
	assert.ErrorContains(t, err, "EMAIL_FROM")
}

func TestTrackedConn_RemembersTheLastWriteError(t *testing.T) {
	a, b := net.Pipe()
	tracked := &trackedConn{Conn: a}
	require.NoError(t, b.Close())

	_, err := tracked.Write([]byte("x"))

	require.Error(t, err)
	assert.Equal(t, err, tracked.lastWriteErr())
	tracked.resetWriteErr()
	assert.NoError(t, tracked.lastWriteErr())
}

func TestClassification(t *testing.T) {
	assert.False(t, Retryable(nil))
	assert.True(t, Retryable(errors.New("connection reset")))
	assert.False(t, Permanent(&textproto.Error{Code: 421}))
	assert.True(t, Permanent(&textproto.Error{Code: 550}))
}
