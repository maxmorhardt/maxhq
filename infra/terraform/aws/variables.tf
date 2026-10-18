variable "region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "account_id" {
  description = "AWS account these resources must live in"
  type        = string
  default     = "936964274666"
}

variable "backup_bucket_name" {
  description = "Bucket CNPG archives Postgres WAL and base backups to"
  type        = string
  default     = "maxstash-io-bucket"
}

variable "backup_retention_days" {
  description = "Bucket-wide expiry backstop"
  type        = number
  default     = 90
}

variable "backup_noncurrent_days" {
  description = "How long a version lingers after expiration"
  type        = number
  default     = 30
}

variable "backup_user_name" {
  description = "IAM user"
  type        = string
  default     = "srv-s3"
}
