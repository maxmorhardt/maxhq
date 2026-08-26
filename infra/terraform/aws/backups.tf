resource "aws_s3_bucket" "backups" {
  bucket              = var.backup_bucket_name
  force_destroy       = false
  object_lock_enabled = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Disabled"
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket = aws_s3_bucket.backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    bucket_key_enabled       = true
    blocked_encryption_types = ["SSE-C"]

    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket                                 = aws_s3_bucket.backups.id
  transition_default_minimum_object_size = "all_storage_classes_128K"

  rule {
    id     = "delete-old-backups"
    status = "Enabled"

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.backup_noncurrent_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "backups" {
  bucket = aws_s3_bucket.backups.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          "arn:aws:s3:::${var.backup_bucket_name}",
          "arn:aws:s3:::${var.backup_bucket_name}/*",
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
    ]
  })
}
