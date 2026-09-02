variable "repository" {
  description = "Repository the ruleset applies to"
  type        = string
}

variable "required_checks" {
  description = "Status check contexts that must pass before merge"
  type        = list(string)
}

variable "strict" {
  description = "Require the branch to be up to date with the base before merging"
  type        = bool
  default     = false
}

variable "integration_id" {
  description = "App that reports the checks; 15368 is GitHub Actions"
  type        = number
  default     = 15368
}

variable "bypass_actors" {
  description = "Actors allowed to push past the ruleset"
  type = list(object({
    actor_id    = number
    actor_type  = string
    bypass_mode = string
  }))
  default = []
}
