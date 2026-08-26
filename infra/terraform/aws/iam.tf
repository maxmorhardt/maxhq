resource "aws_iam_user" "backups" {
  name = var.backup_user_name
}

resource "aws_iam_policy" "backups" {
  name = "${var.backup_bucket_name}-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:AbortMultipartUpload",
          "s3:ListBucketMultipartUploads",
          "s3:ListMultipartUploadParts",
        ]
        Resource = [
          "arn:aws:s3:::${var.backup_bucket_name}",
          "arn:aws:s3:::${var.backup_bucket_name}/*",
        ]
      },
    ]
  })
}

resource "aws_iam_user_policy_attachment" "backups" {
  user       = aws_iam_user.backups.name
  policy_arn = aws_iam_policy.backups.arn
}
