package model

import (
	"encoding/json"

	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

// value receivers on purpose: json skips pointer methods on non-addressable values, which would send emails unmasked
// every marshal masks, so never cache these types and read them back: owners would come back as user ids and fail auth checks

func (s Square) MarshalJSON() ([]byte, error) { //nolint:gocritic // hugeParam: see the note above
	type plain Square
	p := plain(s)
	p.OwnerName = playerName(p.Owner, p.OwnerName)
	p.Owner = pseudonym.Of(p.Owner)
	return json.Marshal(p)
}

func (c Contest) MarshalJSON() ([]byte, error) { //nolint:gocritic // hugeParam: see the note above
	type plain Contest
	p := plain(c)
	p.Owner = pseudonym.Of(p.Owner)
	return json.Marshal(p)
}

func (q QuarterResult) MarshalJSON() ([]byte, error) { //nolint:gocritic // hugeParam: see the note above
	type plain QuarterResult
	p := plain(q)
	p.WinnerName = playerName(p.Winner, p.WinnerName)
	p.Winner = pseudonym.Of(p.Winner)
	return json.Marshal(p)
}

func (cp ContestPlayer) MarshalJSON() ([]byte, error) { //nolint:gocritic // hugeParam: see the note above
	type plain ContestPlayer
	p := plain(cp)
	p.DisplayName = playerName(p.UserID, p.DisplayName)
	p.UserID = pseudonym.Of(p.UserID)
	return json.Marshal(p)
}

func (s ContestSummary) MarshalJSON() ([]byte, error) { //nolint:gocritic // hugeParam: see the note above
	type plain ContestSummary
	p := plain(s)
	p.OwnerName = pseudonym.Name(p.OwnerName)
	return json.Marshal(p)
}

func (b ContestBan) MarshalJSON() ([]byte, error) { //nolint:gocritic // hugeParam: see the note above
	type plain ContestBan
	p := plain(b)
	p.DisplayName = pseudonym.FullName(p.DisplayName)
	p.UserID = pseudonym.Of(p.UserID)
	return json.Marshal(p)
}

func (r InvitePreviewResponse) MarshalJSON() ([]byte, error) { //nolint:gocritic // hugeParam: see the note above
	type plain InvitePreviewResponse
	p := plain(r)
	p.OwnerName = pseudonym.Name(p.OwnerName)
	return json.Marshal(p)
}

func playerName(user, displayName string) string {
	if user == "" || user == GhostUser {
		return ""
	}
	return pseudonym.Public(displayName)
}
