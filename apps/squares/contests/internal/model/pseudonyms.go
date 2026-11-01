package model

import (
	"encoding/json"

	"github.com/maxmorhardt/maxhq/libs/go/squares/pseudonym"
)

// every response and stream payload is marshaled through these, so emails and full names never leave the service

func (s Square) MarshalJSON() ([]byte, error) { //nolint:gocritic // a value receiver masks values too; json skips pointer methods on them
	type plain Square
	p := plain(s)
	p.OwnerName = playerName(p.Owner, p.OwnerName)
	p.Owner = pseudonym.Of(p.Owner)
	p.CreatedBy = pseudonym.Of(p.CreatedBy)
	p.UpdatedBy = pseudonym.Of(p.UpdatedBy)
	return json.Marshal(p)
}

func (c Contest) MarshalJSON() ([]byte, error) { //nolint:gocritic // a value receiver masks values too; json skips pointer methods on them
	type plain Contest
	p := plain(c)
	p.Owner = pseudonym.Of(p.Owner)
	p.CreatedBy = pseudonym.Of(p.CreatedBy)
	p.UpdatedBy = pseudonym.Of(p.UpdatedBy)
	return json.Marshal(p)
}

func (q QuarterResult) MarshalJSON() ([]byte, error) { //nolint:gocritic // a value receiver masks values too; json skips pointer methods on them
	type plain QuarterResult
	p := plain(q)
	p.WinnerName = playerName(p.Winner, p.WinnerName)
	p.Winner = pseudonym.Of(p.Winner)
	p.CreatedBy = pseudonym.Of(p.CreatedBy)
	p.UpdatedBy = pseudonym.Of(p.UpdatedBy)
	return json.Marshal(p)
}

func (cp ContestParticipant) MarshalJSON() ([]byte, error) { //nolint:gocritic // a value receiver masks values too; json skips pointer methods on them
	type plain ContestParticipant
	p := plain(cp)
	p.DisplayName = playerName(p.UserID, p.DisplayName)
	p.UserID = pseudonym.Of(p.UserID)
	return json.Marshal(p)
}

func (i ContestInvite) MarshalJSON() ([]byte, error) { //nolint:gocritic // a value receiver masks values too; json skips pointer methods on them
	type plain ContestInvite
	p := plain(i)
	p.CreatedBy = pseudonym.Of(p.CreatedBy)
	return json.Marshal(p)
}

func (s ContestSummary) MarshalJSON() ([]byte, error) { //nolint:gocritic // a value receiver masks values too; json skips pointer methods on them
	type plain ContestSummary
	p := plain(s)
	p.Owner = pseudonym.Of(p.Owner)
	p.OwnerName = pseudonym.Name(p.OwnerName)
	return json.Marshal(p)
}

func (r InvitePreviewResponse) MarshalJSON() ([]byte, error) { //nolint:gocritic // a value receiver masks values too; json skips pointer methods on them
	type plain InvitePreviewResponse
	p := plain(r)
	p.Owner = pseudonym.Of(p.Owner)
	p.OwnerName = pseudonym.Name(p.OwnerName)
	return json.Marshal(p)
}

// a real player always has a name to show; empty and ghost squares have none
func playerName(user, displayName string) string {
	if user == "" || user == GhostUser {
		return ""
	}
	if name := pseudonym.Name(displayName); name != "" {
		return name
	}
	return pseudonym.Unnamed
}
