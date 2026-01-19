# External Dependencies

## Required

- **PostgreSQL Database** - Version 18+
- **Redis Cache** - For sessions and caching
- **SMTP Server** - For sending emails
- **Environment Secret** - Name: `squares-api-env`

```bash
kubectl create secret generic squares-api-env \
  --from-literal=DB_HOST='postgres.example.com' \
  --from-literal=DB_PORT='5432' \
  --from-literal=DB_USER='squares_user' \
  --from-literal=DB_PASSWORD='your-password' \
  --from-literal=DB_NAME='squares' \
  --from-literal=DB_SSL_MODE='disable' \
  --from-literal=DB_READ_HOST='postgres-read.example.com' \
  --from-literal=DB_READ_PORT='5432' \
  --from-literal=DB_READ_USER='squares_user' \
  --from-literal=DB_READ_PASSWORD='your-password' \
  --from-literal=DB_READ_NAME='squares' \
  --from-literal=DB_READ_SSL_MODE='disable' \
  --from-literal=REDIS_HOST='redis.example.com:6379' \
  --from-literal=SMTP_HOST='smtp.example.com' \
  --from-literal=SMTP_PORT='587' \
  --from-literal=SMTP_USER='noreply@example.com' \
  --from-literal=SMTP_PASSWORD='your-password' \
  --from-literal=SUPPORT_EMAIL='support@example.com' \
  --from-literal=JWT_SECRET='your-secret'
```
