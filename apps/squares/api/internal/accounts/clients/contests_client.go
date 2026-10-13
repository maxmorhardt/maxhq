package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/model"
	"github.com/maxmorhardt/maxstash/apps/squares/api/internal/platform/middleware"
)

const requestTimeout = 5 * time.Second

// accounts' only synchronous dependency: contests decides whether an account is still in use
type ContestActivityClient interface {
	GetUserActivity(ctx context.Context, email string) (*model.UserActivitySummary, error)
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

func (c *contestActivityClient) GetUserActivity(ctx context.Context, email string) (*model.UserActivitySummary, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/internal/users/"+url.PathEscape(email)+"/activity", http.NoBody)
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

	var summary model.UserActivitySummary
	if err := json.NewDecoder(resp.Body).Decode(&summary); err != nil {
		return nil, fmt.Errorf("failed to decode contests activity: %w", err)
	}

	return &summary, nil
}
