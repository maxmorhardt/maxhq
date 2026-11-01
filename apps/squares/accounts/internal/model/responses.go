package model

type ContactResponse struct {
	Message string `json:"message"`
}

type UserProfileResponse struct {
	UserID          string `json:"userId" example:"u_3q2mL0x9VfTzQk1rB7cW8a"`
	Email           string `json:"email" example:"user@example.com"`
	DisplayName     string `json:"displayName" example:"Max"`
	DefaultInitials string `json:"defaultInitials" example:"MM"`
	CreatedAt       string `json:"createdAt" example:"2026-07-11T00:00:00Z"`
	IsNew           bool   `json:"isNew,omitempty" example:"true"`
}
