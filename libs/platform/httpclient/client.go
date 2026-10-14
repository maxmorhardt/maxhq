package httpclient

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
)

const (
	requestTimeout = 5 * time.Second
	retries        = 2
)

type StatusError struct {
	Status int
	Path   string
}

func (e *StatusError) Error() string {
	return fmt.Sprintf("GET %s returned %d", e.Path, e.Status)
}

// Internal calls another service's /internal routes with the shared token, retrying network errors and 5xx
type Internal struct {
	client *resty.Client
}

func NewInternal(baseURL, token string) *Internal {
	client := resty.New().
		SetBaseURL(strings.TrimRight(baseURL, "/")).
		SetTimeout(requestTimeout).
		SetHeader(middleware.HeaderInternalToken, token).
		SetRetryCount(retries).
		SetRetryWaitTime(100 * time.Millisecond).
		SetRetryMaxWaitTime(500 * time.Millisecond).
		AddRetryCondition(func(r *resty.Response, err error) bool {
			return err != nil || r.StatusCode() >= http.StatusInternalServerError
		})
	return &Internal{client: client}
}

// decodes a 200 JSON body into out; any other status is a *StatusError
func (c *Internal) GetJSON(ctx context.Context, path string, out any) error {
	resp, err := c.client.R().SetContext(ctx).ForceContentType("application/json").SetResult(out).Get(path)
	if err != nil {
		return err
	}
	if resp.StatusCode() != http.StatusOK {
		return &StatusError{Status: resp.StatusCode(), Path: path}
	}
	return nil
}
