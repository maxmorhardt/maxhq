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
	"github.com/maxmorhardt/maxstash/libs/squares/internalapi"
)

const requestTimeout = 5 * time.Second

// contests decides who may watch a contest; realtime asks on connect and whenever access may have changed
type ContestAccessClient interface {
	GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*internalapi.ContestSnapshot, error)
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

func (c *contestAccessClient) GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*internalapi.ContestSnapshot, error) {
	endpoint := c.baseURL + internalapi.SnapshotPath(contestID, user)
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

	var snapshot internalapi.ContestSnapshot
	if err := json.NewDecoder(resp.Body).Decode(&snapshot); err != nil {
		return nil, fmt.Errorf("%w: failed to decode snapshot: %w", errs.ErrDependencyFailed, err)
	}

	return &snapshot, nil
}
