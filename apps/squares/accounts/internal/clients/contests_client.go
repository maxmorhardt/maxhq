package clients

import (
	"context"
	"fmt"

	"github.com/maxmorhardt/maxstash/libs/platform/httpclient"
	"github.com/maxmorhardt/maxstash/libs/squares/contracts"
)

type ContestActivityClient interface {
	GetUserActivity(ctx context.Context, email string) (*contracts.UserActivitySummary, error)
}

type contestActivityClient struct {
	contests *httpclient.Internal
}

func NewContestActivityClient(baseURL, token string) ContestActivityClient {
	return &contestActivityClient{contests: httpclient.NewInternal(baseURL, token)}
}

func (c *contestActivityClient) GetUserActivity(ctx context.Context, email string) (*contracts.UserActivitySummary, error) {
	var summary contracts.UserActivitySummary
	if err := c.contests.GetJSON(ctx, contracts.UserActivityPath(email), &summary); err != nil {
		return nil, fmt.Errorf("contests activity request failed: %w", err)
	}
	return &summary, nil
}
