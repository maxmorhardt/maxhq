package testkit

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
)

type Identity struct {
	Email    string
	IssuedAt time.Time
}

func As(email string) Identity {
	return Identity{Email: email, IssuedAt: time.Now().Add(-time.Minute)}
}

var Anonymous = Identity{}

func (id Identity) Apply(req *http.Request) {
	if id.Email == "" {
		return
	}
	req.Header.Set(middleware.HeaderAuthEmail, id.Email)
	req.Header.Set(middleware.HeaderAuthName, "Test "+id.Email)
	req.Header.Set(middleware.HeaderAuthEmailVerified, "true")
	req.Header.Set(middleware.HeaderAuthIssuedAt, strconv.FormatInt(id.IssuedAt.Unix(), 10))
	req.Header.Set(middleware.HeaderAuthExpiresAt, strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10))
}

type Response struct {
	Status int
	Header http.Header
	Body   []byte
}

func (r Response) Decode(t *testing.T, v any) {
	t.Helper()
	if err := json.Unmarshal(r.Body, v); err != nil {
		t.Fatalf("failed to decode %d response %q: %v", r.Status, string(r.Body), err)
	}
}

func Call(t *testing.T, base string, id Identity, method, path string, body any, headers ...string) Response {
	t.Helper()

	var reader io.Reader = http.NoBody
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequestWithContext(context.Background(), method, base+path, reader)
	if err != nil {
		t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	id.Apply(req)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}

	return Response{Status: resp.StatusCode, Header: resp.Header, Body: raw}
}
