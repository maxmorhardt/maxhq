package email

import (
	"context"
	"errors"
	"net"
	"net/textproto"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeServer struct {
	addr     *net.TCPAddr
	starttls bool
	rcpt     string
	dropQuit bool
	received chan string
}

func startFakeSMTP(t *testing.T, s *fakeServer) *fakeServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	t.Cleanup(func() { _ = ln.Close() })

	s.addr, s.received = ln.Addr().(*net.TCPAddr), make(chan string, 1)
	go func() {
		conn, err := ln.Accept()
		if err != nil {
			return
		}
		defer func() { _ = conn.Close() }()
		s.serve(textproto.NewConn(conn))
	}()
	return s
}

func (s *fakeServer) serve(c *textproto.Conn) {
	_ = c.PrintfLine("220 fake ESMTP")
	for {
		line, err := c.ReadLine()
		if err != nil {
			return
		}
		verb := strings.ToUpper(strings.Fields(line + " x")[0])
		switch verb {
		case "EHLO":
			if s.starttls {
				_ = c.PrintfLine("250-fake")
				_ = c.PrintfLine("250 STARTTLS")
			} else {
				_ = c.PrintfLine("250-fake")
				_ = c.PrintfLine("250 AUTH PLAIN")
			}
		case "STARTTLS":
			_ = c.PrintfLine("220 go ahead")
			return
		case "AUTH":
			_ = c.PrintfLine("235 ok")
		case "MAIL":
			_ = c.PrintfLine("250 ok")
		case "RCPT":
			_ = c.PrintfLine("%s", s.rcpt)
		case "DATA":
			_ = c.PrintfLine("354 go")
			data, _ := c.ReadDotBytes()
			s.received <- string(data)
			_ = c.PrintfLine("250 queued")
			if s.dropQuit {
				return
			}
		case "QUIT":
			_ = c.PrintfLine("221 bye")
			return
		default:
			_ = c.PrintfLine("502 unknown")
		}
	}
}

func (s *fakeServer) mailer(t *testing.T, user string) Mailer {
	t.Helper()
	m, err := NewMailer(&Config{From: "Squares <recaps@example.com>", SMTPHost: "127.0.0.1", SMTPPort: s.addr.Port, SMTPUser: user, SMTPPassword: "secret"})
	require.NoError(t, err)
	return m
}

func testMessage() *Message {
	return &Message{To: "max@example.com", Subject: "Office Pool: final results", HTML: "<p>hi</p>", Text: "hi"}
}

func TestMailer_Sends(t *testing.T) {
	s := startFakeSMTP(t, &fakeServer{rcpt: "250 ok"})

	require.NoError(t, s.mailer(t, "").Send(context.Background(), testMessage()))

	data := <-s.received
	assert.Contains(t, data, "Subject: Office Pool: final results")
	assert.Contains(t, data, "To: <max@example.com>")
}

func TestMailer_AcceptedMessageIgnoresAFailedQuit(t *testing.T) {
	s := startFakeSMTP(t, &fakeServer{rcpt: "250 ok", dropQuit: true})

	require.NoError(t, s.mailer(t, "").Send(context.Background(), testMessage()))
	assert.NotEmpty(t, <-s.received)
}

func TestMailer_RefusesCredentialsWithoutTLS(t *testing.T) {
	s := startFakeSMTP(t, &fakeServer{rcpt: "250 ok"})

	err := s.mailer(t, "emailapikey").Send(context.Background(), testMessage())

	require.ErrorIs(t, err, ErrNoTLS)
	assert.ErrorIs(t, err, ErrConnection)
	assert.True(t, IsPermanent(err))
}

func TestMailer_RejectedRecipientIsPermanent(t *testing.T) {
	s := startFakeSMTP(t, &fakeServer{rcpt: "550 mailbox unavailable"})

	err := s.mailer(t, "").Send(context.Background(), testMessage())

	require.Error(t, err)
	assert.True(t, IsPermanent(err))
}

func TestMailer_BusyRecipientIsTransient(t *testing.T) {
	s := startFakeSMTP(t, &fakeServer{rcpt: "451 try later"})

	err := s.mailer(t, "").Send(context.Background(), testMessage())

	require.Error(t, err)
	assert.False(t, IsPermanent(err))
	assert.False(t, IsPermanent(errors.New("connection reset")))
}

func TestMailer_FailedStartTLS(t *testing.T) {
	s := startFakeSMTP(t, &fakeServer{starttls: true, rcpt: "250 ok"})

	err := s.mailer(t, "").Send(context.Background(), testMessage())

	assert.ErrorContains(t, err, "starttls")
}

func TestMailer_ConnectionRefused(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := ln.Addr().(*net.TCPAddr).Port
	require.NoError(t, ln.Close())

	for _, p := range []int{port, implicitTLSPort} {
		m, err := NewMailer(&Config{From: "recaps@example.com", SMTPHost: "127.0.0.1", SMTPPort: p})
		require.NoError(t, err)
		err = m.Send(context.Background(), testMessage())
		assert.ErrorIs(t, err, ErrConnection, strconv.Itoa(p))
	}
}

func TestNewMailer_RejectsABadFrom(t *testing.T) {
	_, err := NewMailer(&Config{From: "not an address"})
	assert.Error(t, err)
}
