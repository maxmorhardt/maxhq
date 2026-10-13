package api

type LivenessResponse struct {
	Status string `json:"status"`
}

type ReadinessResponse struct {
	Status string            `json:"status"`
	Checks map[string]string `json:"checks"`
}
