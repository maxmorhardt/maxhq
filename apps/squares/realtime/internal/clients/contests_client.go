package clients

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxstash/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxstash/libs/platform/middleware"
	"github.com/maxmorhardt/maxstash/libs/squares/contracts"
)

const requestTimeout = 5 * time.Second

type ContestAccessClient interface {
	GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*contracts.ContestSnapshot, error)
}

type contestAccessClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func NewContestAccessClient(baseURL, token string) ContestAccessClient {
	return &contestAccessClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   token,
		http:    &http.Client{Timeout: requestTimeout},
	}
}

func (c *contestAccessClient) GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*contracts.ContestSnapshot, error) {
	endpoint := c.baseURL + contracts.SnapshotPath(contestID, user)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, http.NoBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set(middleware.HeaderInternalToken, c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}
	defer func() { _ = resp.Body.Close() }()

	switch resp.StatusCode {
	case http.StatusOK:
	case http.StatusNotFound:
		return nil, errs.ErrContestNotFound
	case http.StatusForbidden:
		return nil, errs.ErrInsufficientRole
	default:
		return nil, fmt.Errorf("%w: contests snapshot returned %d", errs.ErrDependencyFailed, resp.StatusCode)
	}

	var snapshot contracts.ContestSnapshot
	if err := json.NewDecoder(resp.Body).Decode(&snapshot); err != nil {
		return nil, fmt.Errorf("%w: failed to decode snapshot: %w", errs.ErrDependencyFailed, err)
	}

	return &snapshot, nil
}
