variable "namespace" {
  description = "Docker Hub account that owns the repositories"
  type        = string
  default     = "maxmorhardt"
}

variable "token" {
  description = "Docker Hub personal access token for the namespace"
  type        = string
  sensitive   = true
}
