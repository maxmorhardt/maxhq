package clients

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/go-resty/resty/v2"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/model"
	"github.com/maxmorhardt/maxhq/apps/squares/games/internal/util"
)

const scoreboardPath = "/apis/site/v2/sports/football/nfl/scoreboard"

const userAgent = "squares-games (+https://github.com/maxmorhardt/maxhq)"

type ESPNClient interface {
	// the scoreboard ESPN shows right now: this week's games and the season's calendar
	FetchCurrent(ctx context.Context) ([]model.ESPNGame, model.ESPNCalendar, error)
	FetchWeek(ctx context.Context, week model.Week) ([]model.ESPNGame, model.ESPNCalendar, error)
}

type espnClient struct {
	client *resty.Client
}

func NewESPNClient(baseURL string) ESPNClient {
	// the poll interval is longer than a pooled connection stays good, so retire idle ones early
	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           (&net.Dialer{Timeout: 5 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		MaxIdleConnsPerHost:   2,
		IdleConnTimeout:       30 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	return &espnClient{
		client: resty.New().
			SetBaseURL(baseURL).
			SetTransport(transport).
			SetHeader("User-Agent", userAgent).
			SetTimeout(10 * time.Second).
			SetRetryCount(1).
			SetRetryWaitTime(1 * time.Second).
			SetRetryMaxWaitTime(3 * time.Second),
	}
}

func (c *espnClient) FetchCurrent(ctx context.Context) ([]model.ESPNGame, model.ESPNCalendar, error) {
	return c.fetch(ctx, nil)
}

func (c *espnClient) FetchWeek(ctx context.Context, week model.Week) ([]model.ESPNGame, model.ESPNCalendar, error) {
	return c.fetch(ctx, map[string]string{
		"dates":      strconv.Itoa(week.Season),
		"seasontype": strconv.Itoa(week.SeasonType),
		"week":       strconv.Itoa(week.Week),
	})
}

func (c *espnClient) fetch(ctx context.Context, params map[string]string) ([]model.ESPNGame, model.ESPNCalendar, error) {
	resp, err := c.client.R().
		SetContext(ctx).
		SetQueryParam("limit", "100").
		SetQueryParams(params).
		ForceContentType("application/json").
		SetResult(&model.ScoreboardResponse{}).
		Get(scoreboardPath)
	if err != nil {
		return nil, model.ESPNCalendar{}, fmt.Errorf("failed to fetch scoreboard: %w", err)
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, model.ESPNCalendar{}, fmt.Errorf("scoreboard returned status %d for %v", resp.StatusCode(), params)
	}

	body, ok := resp.Result().(*model.ScoreboardResponse)
	if !ok {
		return nil, model.ESPNCalendar{}, fmt.Errorf("unexpected scoreboard response type")
	}

	return util.ScoreboardToGames(body), util.ScoreboardCalendar(body), nil
}
