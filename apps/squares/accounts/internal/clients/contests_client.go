package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
	"github.com/maxmorhardt/maxstash/libs/squares/contracts"
)

const requestTimeout = 5 * time.Second

type ContestActivityClient interface {
	GetUserActivity(ctx context.Context, email string) (*contracts.UserActivitySummary, error)
}

type contestActivityClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func NewContestActivityClient(baseURL, token string) ContestActivityClient {
	return &contestActivityClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		http:    &http.Client{Timeout: requestTimeout},
	}
}

func (c *contestActivityClient) GetUserActivity(ctx context.Context, email string) (*contracts.UserActivitySummary, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+contracts.UserActivityPath(email), http.NoBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set(middleware.HeaderInternalToken, c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("contests activity request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("contests activity request returned %d", resp.StatusCode)
	}

	var summary contracts.UserActivitySummary
	if err := json.NewDecoder(resp.Body).Decode(&summary); err != nil {
		return nil, fmt.Errorf("failed to decode contests activity: %w", err)
	}

	return &summary, nil
}
