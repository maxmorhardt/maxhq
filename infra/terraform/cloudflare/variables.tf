variable "zone_id" {
  description = "Zone ID for maxstash.io"
  type        = string
  default     = "af218cfce90fe34a2b21f675bae1b9db"
}

variable "apex_ip" {
  description = "Origin IP behind the proxied apex record"
  type        = string
  sensitive   = true
}
