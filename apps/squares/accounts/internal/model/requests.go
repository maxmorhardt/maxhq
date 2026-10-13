package model

type UpdateUserProfileRequest struct {
	DefaultInitials string `json:"defaultInitials" binding:"required,min=1,max=3,uppercase,alphanum,safestring"`
}

type ContactRequest struct {
	Name           string `json:"name" binding:"required,min=1,max=100,safestring"`
	Email          string `json:"email" binding:"required,email,max=255,safestring"`
	Subject        string `json:"subject" binding:"required,min=1,max=200,safestring"`
	Message        string `json:"message" binding:"required,min=1,max=2000,safestring"`
	TurnstileToken string `json:"turnstileToken" binding:"required,min=1,max=2000,safestring"`
}
