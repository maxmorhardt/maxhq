package model

type CreateContestRequest struct {
	Name       string `json:"name" binding:"required,max=20,min=1,safestring"`
	Visibility string `json:"visibility,omitempty" binding:"omitempty,oneof=private public"`
	MaxSquares int    `json:"maxSquares" binding:"min=0,max=100"`
	GameID     string `json:"gameId" binding:"required,uuid"`
}

type ClearSquareRequest struct{}

type RandomClaimRequest struct {
	Count int `json:"count" binding:"required,min=1,max=100" example:"5"`
}

type UpdateParticipantRequest struct {
	MaxSquares *int `json:"maxSquares" binding:"required,min=0,max=100" example:"10"`
}

type AllotSquaresRequest struct {
	MaxSquares int `json:"maxSquares" binding:"required,min=1,max=100" example:"5"`
}
