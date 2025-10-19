# ORION Platform - Environment Variables Reference

**Version**: 1.0
**Last Updated**: 2025-10-18

Complete reference of all environment variables used across the ORION platform.

## Table of Contents

1. [Core Infrastructure](#core-infrastructure)
2. [Auth Service](#auth-service)
3. [Gateway Service](#gateway-service)
4. [AI Wrapper Service](#ai-wrapper-service)
5. [Notifications Service](#notifications-service)
6. [Storage Service](#storage-service)
7. [Frontend Applications](#frontend-applications)
8. [Development vs Production](#development-vs-production)

## Variable Priority

Variables are loaded in the following order (later overrides earlier):
1. Default values in code
2. `.env` file
3. Environment-specific file (`.env.development`, `.env.production`)
4. System environment variables
5. Runtime arguments

## Core Infrastructure

### Database - PostgreSQL

```bash
# Database connection URL (full connection string)
DATABASE_URL="postgresql://username:password@localhost:5432/orion?schema=public"

# Or individual components:
DATABASE_HOST="localhost"
DATABASE_PORT="5432"
DATABASE_NAME="orion"
DATABASE_USER="postgres"
DATABASE_PASSWORD="your-secure-password"
DATABASE_SCHEMA="public"

# Connection pooling
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# SSL/TLS
DATABASE_SSL="true"
DATABASE_SSL_REJECT_UNAUTHORIZED="false"  # Development only
```

**Required**: Yes (all backend services)
**Default**: `postgresql://postgres:postgres@localhost:5432/orion`
**Production Notes**: Use managed database service (AWS RDS, Google Cloud SQL). Enable SSL. Use strong passwords.

### Cache - Redis

```bash
# Redis connection URL
REDIS_URL="redis://:password@localhost:6379"

# Or individual components:
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"
REDIS_DB="0"

# Cluster mode (production)
REDIS_CLUSTER_NODES="redis1:6379,redis2:6379,redis3:6379"

# Connection settings
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000
```

**Required**: Yes (auth, sessions, caching)
**Default**: `redis://localhost:6379`
**Production Notes**: Use Redis Cluster for high availability. Enable authentication. Configure persistence.

### Message Queue - RabbitMQ (Optional)

```bash
# RabbitMQ connection
RABBITMQ_URL="amqp://username:password@localhost:5672"

# Or individual components:
RABBITMQ_HOST="localhost"
RABBITMQ_PORT="5672"
RABBITMQ_USER="admin"
RABBITMQ_PASSWORD="your-rabbit-password"
RABBITMQ_VHOST="/"

# Connection settings
RABBITMQ_HEARTBEAT=60
RABBITMQ_PREFETCH=10
```

**Required**: No (only if using async messaging)
**Default**: `amqp://guest:guest@localhost:5672`
**Production Notes**: Use managed service or cluster for reliability.

## Auth Service

### Port and Base Configuration

```bash
# Service port
PORT=3010

# Node environment
NODE_ENV="production"  # development | production | staging | test

# API prefix
API_PREFIX="/api/auth"

# CORS origins (comma-separated)
CORS_ORIGINS="https://admin.your-domain.com,https://app.your-domain.com"
```

### Authentication Settings

```bash
# JWT secret (MUST be strong in production)
JWT_SECRET="your-very-secure-random-secret-at-least-32-characters-long"

# JWT expiration times
JWT_ACCESS_TOKEN_EXPIRY="15m"
JWT_REFRESH_TOKEN_EXPIRY="7d"

# Session settings
SESSION_SECRET="another-secure-secret-for-sessions"
SESSION_MAX_AGE=604800000  # 7 days in milliseconds
SESSION_COOKIE_SECURE="true"  # HTTPS only
SESSION_COOKIE_SAME_SITE="strict"  # strict | lax | none
```

**Security Requirements**:
- `JWT_SECRET`: Minimum 32 characters, random, never commit to git
- `SESSION_SECRET`: Different from JWT_SECRET, equally strong
- Generate secrets: `openssl rand -hex 32`

### Password and Security

```bash
# Bcrypt rounds (higher = more secure, slower)
BCRYPT_ROUNDS=12  # 10-14 recommended

# Password requirements
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE="true"
PASSWORD_REQUIRE_LOWERCASE="true"
PASSWORD_REQUIRE_NUMBER="true"
PASSWORD_REQUIRE_SPECIAL="true"

# Rate limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes in ms
RATE_LIMIT_MAX_REQUESTS=100

# Login attempts
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_DURATION=900000  # 15 minutes
```

### OAuth Providers (Optional)

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="https://api.your-domain.com/api/auth/google/callback"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="https://api.your-domain.com/api/auth/github/callback"
```

## Gateway Service

```bash
# Service port
PORT=3100

# Node environment
NODE_ENV="production"

# API prefix
API_PREFIX="/api"

# Downstream services
AUTH_SERVICE_URL="http://localhost:3010"
USER_SERVICE_URL="http://localhost:3020"
NOTIFICATIONS_SERVICE_URL="http://localhost:3030"
STORAGE_SERVICE_URL="http://localhost:3040"
AI_WRAPPER_SERVICE_URL="http://localhost:3200"

# Timeout settings
UPSTREAM_TIMEOUT=30000  # 30 seconds
GATEWAY_TIMEOUT=60000   # 60 seconds

# Retry settings
RETRY_ATTEMPTS=3
RETRY_DELAY=1000  # 1 second

# Circuit breaker
CIRCUIT_BREAKER_THRESHOLD=5  # Failures before opening
CIRCUIT_BREAKER_TIMEOUT=60000  # Time before retry

# Rate limiting
RATE_LIMIT_GLOBAL_MAX=1000  # Requests per window
RATE_LIMIT_PER_IP_MAX=100   # Requests per IP per window
```

## AI Wrapper Service

```bash
# Service port
PORT=3200

# Node environment
NODE_ENV="production"

# CLI tool paths (optional, uses PATH if not specified)
CLAUDE_CLI_PATH="/usr/local/bin/claude"
COPILOT_CLI_PATH="/usr/local/bin/gh copilot"
AMAZONQ_CLI_PATH="/usr/local/bin/q"

# Execution settings
AI_EXECUTION_TIMEOUT=120000  # 2 minutes
AI_MAX_PARALLEL_REQUESTS=5
AI_RETRY_ATTEMPTS=2

# Caching
AI_CACHE_ENABLED="true"
AI_CACHE_TTL=3600  # 1 hour in seconds

# Fallback strategy
AI_FALLBACK_ENABLED="true"
AI_FALLBACK_ORDER="claude,copilot,amazonq"
```

## Notifications Service

```bash
# Service port
PORT=3030

# Email provider (sendgrid | ses | smtp)
EMAIL_PROVIDER="smtp"

# SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@your-domain.com"
SENDGRID_FROM_NAME="ORION Platform"

# AWS SES
AWS_SES_REGION="us-east-1"
AWS_SES_ACCESS_KEY_ID="your-aws-access-key"
AWS_SES_SECRET_ACCESS_KEY="your-aws-secret"
AWS_SES_FROM_EMAIL="noreply@your-domain.com"

# SMTP
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE="false"  # true for 465, false for other ports
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-specific-password"
SMTP_FROM_EMAIL="noreply@your-domain.com"
SMTP_FROM_NAME="ORION Platform"

# SMS provider (twilio | sns)
SMS_PROVIDER="twilio"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+15551234567"

# AWS SNS
AWS_SNS_REGION="us-east-1"
AWS_SNS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SNS_SECRET_ACCESS_KEY="your-aws-secret"

# Push notifications (firebase | onesignal)
PUSH_PROVIDER="firebase"

# Firebase
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Storage Service

```bash
# Service port
PORT=3040

# Storage provider (s3 | minio | local)
STORAGE_PROVIDER="s3"

# AWS S3
AWS_S3_REGION="us-east-1"
AWS_S3_ACCESS_KEY_ID="your-aws-access-key"
AWS_S3_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET="orion-storage"

# MinIO (S3-compatible)
MINIO_ENDPOINT="localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="orion-storage"
MINIO_USE_SSL="false"

# Local storage (development only)
LOCAL_STORAGE_PATH="/var/orion/storage"

# File upload limits
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES="pdf,doc,docx,txt,jpg,png,gif"

# Presigned URL settings
PRESIGNED_URL_EXPIRY=3600  # 1 hour in seconds
```

## Frontend Applications

### Admin UI

```bash
# API URL
VITE_API_URL="https://api.your-domain.com"

# WebSocket URL
VITE_WS_URL="wss://api.your-domain.com"

# Environment
VITE_NODE_ENV="production"

# Feature flags
VITE_ENABLE_ANALYTICS="true"
VITE_ENABLE_DEBUG="false"
```

### Document Intelligence Demo

```bash
# API URL
VITE_API_URL="http://localhost:3100"

# WebSocket URL
VITE_WS_URL="ws://localhost:3100"

# AI Wrapper URL
VITE_AI_WRAPPER_URL="http://localhost:3200"

# Use real AI (true) or mock data (false)
VITE_USE_REAL_AI="false"

# Upload limits
VITE_MAX_FILE_SIZE="10485760"  # 10MB
VITE_ALLOWED_TYPES="pdf,doc,docx,txt"
```

## Development vs Production

### Development (.env.development)

```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orion_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-not-for-production
PORT=3010
LOG_LEVEL=debug
CORS_ORIGINS=*
```

### Production (.env.production)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:STRONG_PASSWORD@db.example.com:5432/orion
REDIS_URL=redis://:REDIS_PASSWORD@redis.example.com:6379
JWT_SECRET=GENERATE_WITH_openssl_rand_-hex_32
PORT=3010
LOG_LEVEL=info
CORS_ORIGINS=https://admin.your-domain.com
```

## Security Best Practices

1. **Never commit secrets**: Use `.gitignore` for `.env` files
2. **Use strong secrets**: Minimum 32 characters, random
3. **Rotate secrets regularly**: Especially JWT and session secrets
4. **Use secrets management**: Vault, AWS Secrets Manager, etc.
5. **Separate environments**: Different secrets for dev/staging/prod
6. **Encrypt at rest**: For sensitive environment variables
7. **Limit access**: Only necessary services have access to secrets
8. **Monitor usage**: Log and alert on secret access
9. **Use managed services**: For databases, Redis, etc.
10. **Enable SSL/TLS**: For all connections

## Environment Variable Generation

### Generate Secrets

```bash
# JWT Secret (32 bytes hex)
openssl rand -hex 32

# Session Secret (32 bytes base64)
openssl rand -base64 32

# Strong password (24 characters)
openssl rand -base64 24
```

### Validate Configuration

```bash
# Check all required variables are set
node scripts/validate-env.js

# Test database connection
pnpm nx run auth:db:test

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

## Troubleshooting

### Common Issues

**Database connection fails:**
- Check `DATABASE_URL` is correct
- Verify PostgreSQL is running
- Check firewall/security groups
- Verify SSL settings match database requirements

**Redis connection fails:**
- Check `REDIS_URL` is correct
- Verify Redis is running and accessible
- Check authentication (password)
- Verify network connectivity

**JWT errors:**
- Ensure `JWT_SECRET` is set and consistent across services
- Check token expiry times are reasonable
- Verify clock synchronization across servers

**CORS errors:**
- Add frontend URL to `CORS_ORIGINS`
- Use comma-separated list for multiple origins
- Don't use `*` in production

**File upload fails:**
- Check `MAX_FILE_SIZE` is sufficient
- Verify `ALLOWED_FILE_TYPES` includes file type
- Check storage service credentials
- Verify bucket/path exists and is writable

## Quick Reference

| Service | Port | Required Variables |
|---------|------|-------------------|
| Auth | 3010 | DATABASE_URL, REDIS_URL, JWT_SECRET |
| Gateway | 3100 | AUTH_SERVICE_URL, *_SERVICE_URL |
| AI Wrapper | 3200 | None (optional CLI paths) |
| Notifications | 3030 | EMAIL_PROVIDER, SMTP_* or SENDGRID_* |
| Storage | 3040 | STORAGE_PROVIDER, AWS_* or MINIO_* |
| Admin UI | 3000 | VITE_API_URL |
| Doc Intel | 3001 | VITE_API_URL, VITE_AI_WRAPPER_URL |

## Example Complete Configuration

See `.env.example` in project root for a complete, annotated example.
