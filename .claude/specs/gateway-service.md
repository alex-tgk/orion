# API Gateway Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** Phase 2.2 Workstream
**Dependencies:** Auth Service, User Service, Notification Service

---

## Overview

The API Gateway serves as the single entry point for all client requests to the ORION platform. It handles routing, authentication, rate limiting, request/response transformation, and API versioning.

## Service Details

- **Name:** `api-gateway`
- **Port:** `3000`
- **Base URL:** `/api/v1`
- **Type:** Stateless proxy layer
- **Cache:** Redis (for rate limiting and JWT caching)

## Architecture

```
Client
  ↓
API Gateway (Port 3000)
  ├──→ /auth/*        → Auth Service (Port 3001)
  ├──→ /users/*       → User Service (Port 3002)
  └──→ /notifications/* → Notification Service (Port 3003)
```

## Routing Configuration

### Route Definitions

```typescript
const routes = {
  '/api/v1/auth/*': {
    target: 'http://auth-service:3001',
    pathRewrite: { '^/api/v1/auth': '/api/auth' },
    authRequired: false,
  },
  '/api/v1/users/*': {
    target: 'http://user-service:3002',
    pathRewrite: { '^/api/v1/users': '/api/v1/users' },
    authRequired: true,
  },
  '/api/v1/notifications/*': {
    target: 'http://notification-service:3003',
    pathRewrite: { '^/api/v1/notifications': '/api/v1/notifications' },
    authRequired: true,
  },
};
```

## Middleware Stack

### Request Flow

```
Request
  ↓
1. CORS Middleware
  ↓
2. Logging Middleware (correlation ID)
  ↓
3. Rate Limiting Middleware
  ↓
4. Authentication Middleware (if required)
  ↓
5. Request Transformation Middleware
  ↓
6. Route to Backend Service
  ↓
7. Response Transformation Middleware
  ↓
8. Error Handling Middleware
  ↓
Response
```

---

## Middleware Details

### 1. CORS Middleware

**Purpose:** Handle cross-origin requests

**Configuration:**
```typescript
{
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Correlation-ID'],
  maxAge: 3600
}
```

---

### 2. Logging Middleware

**Purpose:** Request/response logging with correlation IDs

**Behavior:**
- Generate correlation ID for each request
- Log request details (method, path, headers, body)
- Log response details (status, time, size)
- Include correlation ID in response headers

**Example Log:**
```json
{
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/v1/users/me",
  "status": 200,
  "duration": 45,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

---

### 3. Rate Limiting Middleware

**Purpose:** Prevent abuse and ensure fair usage

**Strategy:**
- Per-user rate limiting (based on JWT)
- Per-IP rate limiting (for unauthenticated requests)
- Redis-backed sliding window

**Limits:**
```typescript
const rateLimits = {
  '/api/v1/auth/login': { limit: 5, window: 60 },      // 5 req/min
  '/api/v1/auth/refresh': { limit: 10, window: 60 },   // 10 req/min
  '/api/v1/users/*': { limit: 100, window: 60 },       // 100 req/min
  '/api/v1/notifications/*': { limit: 50, window: 60 }, // 50 req/min
  default: { limit: 100, window: 60 }                   // 100 req/min
};
```

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642521600
```

**Error Response (429 Too Many Requests):**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "error": "Too Many Requests",
  "retryAfter": 45
}
```

---

### 4. Authentication Middleware

**Purpose:** Validate JWT tokens for protected routes

**Flow:**
1. Extract JWT from `Authorization: Bearer <token>` header
2. Check Redis cache for validated token
3. If not cached, validate with Auth Service
4. Cache result for 5 minutes
5. Attach user info to request context

**JWT Validation:**
```typescript
interface ValidatedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
```

**Caching:**
```typescript
// Cache validated tokens to reduce Auth Service load
cache.set(`jwt:${tokenHash}`, userInfo, 300); // 5 minutes
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Token expired
- `503 Service Unavailable` - Auth Service unreachable

---

### 5. Request Transformation Middleware

**Purpose:** Transform requests before forwarding

**Transformations:**
- Add correlation ID header
- Add internal service headers
- Normalize request format
- Add user context from JWT

**Example:**
```typescript
// Original request
GET /api/v1/users/me
Authorization: Bearer <token>

// Transformed request to User Service
GET /api/v1/users/123e4567-e89b-12d3-a456-426614174000
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
X-User-ID: 123e4567-e89b-12d3-a456-426614174000
X-User-Email: user@example.com
```

---

### 6. Response Transformation Middleware

**Purpose:** Transform responses before returning to client

**Transformations:**
- Add correlation ID to response headers
- Standardize error format
- Add pagination metadata
- Strip internal headers

**Standard Response Format:**
```typescript
interface StandardResponse<T> {
  data: T;
  meta?: {
    correlationId: string;
    timestamp: string;
    pagination?: PaginationMeta;
  };
}
```

---

### 7. Error Handling Middleware

**Purpose:** Centralized error handling and formatting

**Error Types:**
- Service errors (502, 503, 504)
- Validation errors (400)
- Authentication errors (401, 403)
- Not found errors (404)
- Rate limit errors (429)

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

---

## Service Discovery

### Static Configuration (Phase 1)

```typescript
const serviceEndpoints = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  user: process.env.USER_SERVICE_URL || 'http://user-service:3002',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3003',
};
```

### Dynamic Discovery (Future)

- Consul or Kubernetes service discovery
- Health-based load balancing
- Circuit breaker pattern

---

## Health Aggregation

### GET /health

Aggregate health from all backend services.

**Response:** `200 OK`
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

**Degraded State:**
```json
{
  "status": "degraded",
  "services": {
    "auth": { "status": "healthy", "responseTime": 12 },
    "user": { "status": "healthy", "responseTime": 18 },
    "notification": { "status": "unhealthy", "error": "Connection timeout" }
  }
}
```

---

## API Versioning

### Version Header

Clients can specify API version via header:

```
Accept-Version: v1
```

### URL Versioning (Current)

```
/api/v1/users/*
/api/v2/users/*  (future)
```

### Deprecation Policy

1. New version announced 90 days before old version deprecation
2. Both versions run in parallel for 90 days
3. Old version returns deprecation warnings
4. Old version sunset after 90 days

---

## OpenAPI Documentation Aggregation

### GET /api/docs

Aggregate OpenAPI specs from all services.

**Features:**
- Combined Swagger UI
- Service-specific documentation sections
- Try-it-out functionality for all endpoints
- Schema definitions

---

## Performance Requirements

- **Response Time:** P95 < 50ms (gateway overhead)
- **Throughput:** 5000 req/sec
- **Availability:** 99.99%
- **Circuit Breaker:** Open after 5 failures, half-open after 30s

---

## Security

### Request Sanitization

- Remove sensitive headers before forwarding
- Validate input size (max 10MB)
- Sanitize path parameters
- Prevent header injection

### HTTPS Only (Production)

- Redirect HTTP to HTTPS
- HSTS headers
- TLS 1.2+ required

### Security Headers

```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'"
}
```

---

## Monitoring

### Metrics

- Request rate per route
- Response time percentiles (P50, P95, P99)
- Error rate per service
- Rate limit hits
- Cache hit/miss ratio for JWT validation
- Backend service health

### Alerts

- Service error rate > 1%
- Response time P95 > 200ms
- Any backend service down
- Rate limit hit ratio > 10%

---

## Deployment

### Kubernetes

```yaml
replicas: 5
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 250m
    memory: 256Mi
autoscaling:
  minReplicas: 5
  maxReplicas: 20
  targetCPU: 70%
```

---

## Testing

### Unit Tests
- Middleware logic
- Route matching
- Error handling
- Response transformation

### Integration Tests
- Backend service integration
- JWT validation flow
- Rate limiting behavior
- Health check aggregation

### Load Tests
- 5000 req/sec sustained
- Spike to 10000 req/sec
- Latency under load

---

## Open Questions

1. Should we implement request/response caching?
2. Do we need GraphQL gateway support?
3. Should we add request queuing for overload protection?
4. Do we need WebSocket support?

---

## Changelog

- **2025-01-18:** Initial specification created
