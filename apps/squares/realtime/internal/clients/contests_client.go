package clients

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/maxmorhardt/maxhq/apps/squares/realtime/internal/errs"
	"github.com/maxmorhardt/maxhq/libs/platform/httpclient"
	"github.com/maxmorhardt/maxhq/libs/squares/contracts"
)

type ContestAccessClient interface {
	GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*contracts.ContestSnapshot, error)
}

type contestAccessClient struct {
	contests *httpclient.Internal
}

func NewContestAccessClient(baseURL, token string) ContestAccessClient {
	return &contestAccessClient{contests: httpclient.NewInternal(baseURL, token)}
}

func (c *contestAccessClient) GetSnapshot(ctx context.Context, contestID uuid.UUID, user string) (*contracts.ContestSnapshot, error) {
	var snapshot contracts.ContestSnapshot
	err := c.contests.GetJSON(ctx, contracts.SnapshotPath(contestID, user), &snapshot)

	var status *httpclient.StatusError
	switch {
	case err == nil:
		return &snapshot, nil
	case errors.As(err, &status) && status.Status == http.StatusNotFound:
		return nil, errs.ErrContestNotFound
	case errors.As(err, &status) && status.Status == http.StatusForbidden:
		return nil, errs.ErrInsufficientRole
	default:
		return nil, fmt.Errorf("%w: %w", errs.ErrDependencyFailed, err)
	}
}
