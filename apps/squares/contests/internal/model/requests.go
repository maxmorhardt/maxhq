package model

type CreateContestRequest struct {
	Owner      string `json:"owner" binding:"required,max=255,safestring"`
	Name       string `json:"name" binding:"required,max=20,min=1,safestring"`
	Visibility string `json:"visibility,omitempty" binding:"omitempty,oneof=private public"`
	MaxSquares int    `json:"maxSquares" binding:"min=0,max=100"`
	GameID     string `json:"gameId" binding:"required,uuid"`
}

type ClearSquareRequest struct{}

type RandomClaimRequest struct {
	Count int `json:"count" binding:"required,min=1,max=100" example:"5"`
}

type UpdateContestRequest struct {
	Visibility *string `json:"visibility,omitempty" binding:"omitempty,oneof=private public"`
}

type CreateInviteRequest struct {
	MaxSquares int    `json:"maxSquares" binding:"min=0,max=100"`
	Role       string `json:"role" binding:"required,oneof=participant viewer"`
	MaxUses    int    `json:"maxUses,omitempty" binding:"min=0"`
	ExpiresIn  int    `json:"expiresIn,omitempty" binding:"min=0"` // minutes, 0 = no expiry
}

type UpdateParticipantRequest struct {
	Role       *string `json:"role,omitempty" binding:"omitempty,oneof=participant viewer"`
	MaxSquares *int    `json:"maxSquares,omitempty" binding:"omitempty,min=0,max=100"`
}
