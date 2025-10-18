# API Gateway Service

The API Gateway is the single entry point for all client requests to the ORION microservices platform. It handles routing, authentication, rate limiting, request/response transformation, and provides a unified API interface.

## Features

- **Request Routing**: Routes requests to appropriate backend services (Auth, User, Notification)
- **Authentication**: JWT token validation with Redis caching (5-minute TTL)
- **Rate Limiting**: Redis-backed sliding window rate limiting per user/IP
- **CORS**: Cross-origin request handling with configurable origins
- **Logging**: Correlation ID-based request/response logging
- **Request/Response Transformation**: Standardized headers and security policies
- **Health Aggregation**: Combined health status from all backend services
- **Error Handling**: Centralized exception handling with standardized error responses
- **OpenAPI Documentation**: Swagger UI with aggregated service documentation
- **Security Headers**: Automatic security header injection (HSTS, X-Frame-Options, etc.)

## Architecture

```
Client Request
    ↓
API Gateway (Port 3000)
    ├── Middleware Stack:
    │   1. CORS Middleware
    │   2. Logging Middleware (Correlation IDs)
    │   3. Rate Limiting Middleware
    │   4. Authentication Middleware (JWT)
    │   5. Request Transformation
    │   6. Proxy to Backend
    │   7. Response Transformation
    │   8. Error Handling
    ↓
Backend Services:
    ├── /api/v1/auth/*         → Auth Service (3001)
    ├── /api/v1/users/*        → User Service (3002)
    └── /api/v1/notifications/* → Notification Service (3003)
```

## Prerequisites

- Node.js 20+
- Redis 6+
- Backend services running (Auth, User, Notification)

## Installation

```bash
# Install dependencies
pnpm install

# Build the service
pnpm nx build gateway

# Run tests
pnpm nx test gateway

# Run with coverage
pnpm nx test gateway --coverage
```

## Configuration

Environment variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:4200

# Backend Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3003

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_CACHE_TTL=300  # 5 minutes

# Rate Limiting Configuration
RATE_LIMIT_DEFAULT=100
RATE_LIMIT_WINDOW=60  # seconds
RATE_LIMIT_AUTH_LOGIN=5
RATE_LIMIT_AUTH_REFRESH=10

# Security
ENABLE_HTTPS_REDIRECT=false
REQUEST_MAX_SIZE=10485760  # 10MB

# Health Check
HEALTH_CHECK_TIMEOUT=5000  # 5 seconds
```

## Running the Service

### Development

```bash
# Start in development mode
pnpm nx serve gateway

# Start with watch mode
pnpm nx serve gateway --watch
```

### Production

```bash
# Build for production
pnpm nx build gateway --prod

# Start production server
NODE_ENV=production node dist/packages/gateway/main.js
```

### Docker

```bash
# Build Docker image
docker build -t orion/gateway:latest -f packages/gateway/Dockerfile .

# Run container
docker run -p 3000:3000 \
  -e REDIS_HOST=redis \
  -e AUTH_SERVICE_URL=http://auth-service:3001 \
  -e USER_SERVICE_URL=http://user-service:3002 \
  -e NOTIFICATION_SERVICE_URL=http://notification-service:3003 \
  orion/gateway:latest
```

### Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/gateway/

# Check deployment status
kubectl get pods -n orion -l app=gateway

# View logs
kubectl logs -n orion -l app=gateway --tail=100 -f

# Scale deployment
kubectl scale deployment gateway -n orion --replicas=10
```

## API Documentation

Once the service is running, access the Swagger UI at:

```
http://localhost:3000/api/docs
```

## Endpoints

### Health Check

```http
GET /health
```

Returns aggregated health status from all backend services.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "auth": {
      "status": "healthy",
      "responseTime": 12
    },
    "user": {
      "status": "healthy",
      "responseTime": 18
    },
    "notification": {
      "status": "healthy",
      "responseTime": 15
    }
  },
  "timestamp": "2025-01-18T14:30:00Z"
}
```

### Proxied Routes

All requests to `/api/v1/*` are proxied to backend services:

- `POST /api/v1/auth/login` → Auth Service (No auth required)
- `POST /api/v1/auth/refresh` → Auth Service (No auth required)
- `GET /api/v1/users/me` → User Service (Auth required)
- `GET /api/v1/notifications` → Notification Service (Auth required)

## Middleware Details

### 1. CORS Middleware

Handles cross-origin requests with configurable origins.

### 2. Logging Middleware

- Generates UUID correlation ID for each request
- Logs request/response details
- Includes correlation ID in response headers
- Sanitizes sensitive data (passwords, tokens)

### 3. Rate Limiting Middleware

- Per-user rate limiting (based on JWT)
- Per-IP rate limiting (for unauthenticated requests)
- Redis-backed sliding window
- Custom limits per route

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642521600
```

**Rate Limit Exceeded (429):**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "error": "Too Many Requests",
  "retryAfter": 45
}
```

### 4. Authentication Middleware

- Validates JWT tokens
- Caches validated tokens in Redis (5 min TTL)
- Skips validation for public routes
- Attaches user context to request

**Required Header:**
```
Authorization: Bearer <jwt-token>
```

### 5. Request Transformation Middleware

- Adds correlation ID to forwarded headers
- Adds user context headers (X-User-ID, X-User-Email)
- Removes sensitive headers
- Marks requests as gateway-forwarded

### 6. Response Transformation Middleware

- Adds security headers
- Includes correlation ID in response
- Removes internal headers
- Standardizes error format

### 7. Error Handling

Centralized exception filter that handles:
- HTTP exceptions
- Service unavailability (502, 503, 504)
- Rate limiting (429)
- Authentication errors (401, 403)
- Not found errors (404)

**Error Response Format:**
```json
{
  "statusCode": 502,
  "message": "User Service is unavailable",
  "error": "Bad Gateway",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-18T14:30:00Z"
}
```

## Performance

- **Response Time**: P95 < 50ms (gateway overhead)
- **Throughput**: 5000 req/sec
- **Availability**: 99.99%
- **Horizontal Scaling**: 5-20 pods (auto-scaling on CPU/Memory)

## Monitoring

### Metrics

- Request rate per route
- Response time percentiles (P50, P95, P99)
- Error rate per service
- Rate limit hits
- JWT cache hit/miss ratio
- Backend service health

### Alerts

- Service error rate > 1%
- Response time P95 > 200ms
- Any backend service down
- Rate limit hit ratio > 10%

## Security

### Request Sanitization

- Validates input size (max 10MB)
- Removes sensitive headers
- Prevents header injection

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains (production only)
```

### HTTPS (Production)

- Redirect HTTP to HTTPS
- HSTS headers enabled
- TLS 1.2+ required

## Testing

```bash
# Run all tests
pnpm nx test gateway

# Run with coverage
pnpm nx test gateway --coverage

# Run specific test file
pnpm nx test gateway --testFile=health.service.spec.ts

# Watch mode
pnpm nx test gateway --watch
```

### Coverage Threshold

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Troubleshooting

### Gateway Returns 502 Bad Gateway

**Cause**: Backend service is not running or unreachable.

**Solution**:
```bash
# Check backend service health
curl http://localhost:3001/api/health  # Auth
curl http://localhost:3002/api/health  # User
curl http://localhost:3003/api/health  # Notification
```

### Gateway Returns 429 Too Many Requests

**Cause**: Rate limit exceeded.

**Solution**: Wait for the time specified in `Retry-After` header or increase rate limits.

### JWT Validation Fails

**Cause**: Token expired or invalid, or Auth service unavailable.

**Solution**:
```bash
# Check Auth service
curl http://localhost:3001/api/health

# Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'
```

### Redis Connection Errors

**Cause**: Redis is not running or unreachable.

**Solution**:
```bash
# Check Redis connection
redis-cli ping

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine
```

## Development

### Project Structure

```
packages/gateway/
├── src/
│   ├── app/
│   │   ├── config/
│   │   │   └── gateway.config.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   ├── interfaces/
│   │   │   ├── request-context.interface.ts
│   │   │   ├── route-config.interface.ts
│   │   │   └── service-health.interface.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── cors.middleware.ts
│   │   │   ├── logging.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   ├── request-transform.middleware.ts
│   │   │   └── response-transform.middleware.ts
│   │   ├── services/
│   │   │   ├── health.service.ts
│   │   │   ├── jwt-cache.service.ts
│   │   │   ├── proxy.service.ts
│   │   │   └── redis.service.ts
│   │   ├── app.controller.ts
│   │   └── app.module.ts
│   └── main.ts
├── Dockerfile
├── jest.config.ts
├── project.json
├── README.md
└── tsconfig.json
```

### Adding a New Route

1. Update `ProxyService.buildRouteRegistry()`:

```typescript
'/api/v1/new-service/*': {
  target: this.configService.get<string>('gateway.NEW_SERVICE_URL'),
  pathRewrite: { '^/api/v1/new-service': '/api/new-service' },
  authRequired: true,
  rateLimit: { limit: 100, window: 60 },
}
```

2. Add environment variable:
```bash
NEW_SERVICE_URL=http://localhost:3004
```

3. Update Kubernetes ConfigMap and Deployment.

## Contributing

1. Follow NestJS best practices
2. Write tests for all new features
3. Ensure 80%+ code coverage
4. Update documentation
5. Add integration tests for new routes

## License

MIT
