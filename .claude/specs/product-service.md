# Product Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** Development Team
**Dependencies:** PostgreSQL, Redis,

---

## Overview

Product catalog service

## Service Details

- **Name:** `product`
- **Port:** `3010`
- **Base URL:** `/api/product`
- **Type:** NestJS Microservice
- **Database:** PostgreSQL via Prisma
- **Cache:** Redis

## Architecture

```
Client
  ↓
API Gateway
  ↓
Product Service (Port 3010)
  ├──→ PostgreSQL Database
  ├──→ Redis Cache

```

## API Endpoints

### Health Check

**GET** `/api/product/health`

**Response:** `200 OK`

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### CRUD Operations

#### Create Product

**POST** `/api/product`

**Request Body:**

```json
{
  "name": "string",
  "description": "string"
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Get All Products

**GET** `/api/product`

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `search` (string, optional)

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### Get Product by ID

**GET** `/api/product/:id`

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Update Product

**PATCH** `/api/product/:id`

**Request Body:**

```json
{
  "name": "string",
  "description": "string"
}
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### Delete Product

**DELETE** `/api/product/:id`

**Response:** `204 No Content`

---

## Error Responses

All endpoints may return the following error responses:

- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

**Error Format:**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2025-01-18T14:30:00Z"
}
```

---

## Performance Requirements

- **Response Time:** P95 < 100ms
- **Throughput:** 1000 req/sec
- **Availability:** 99.9%

---

## Security

- Rate limiting: 100 requests per minute per user
- JWT authentication required for all endpoints except health check
- Input validation using class-validator
- SQL injection protection via Prisma
- XSS protection via helmet

---

## Monitoring

### Metrics

- Request rate per endpoint
- Response time percentiles (P50, P95, P99)
- Error rate
- Database query performance
- Cache hit/miss ratio

### Alerts

- Error rate > 1%
- Response time P95 > 200ms
- Database connection failures
- Redis connection failures

---

## Deployment

### Kubernetes

```yaml
replicas: 3
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
autoscaling:
  minReplicas: 3
  maxReplicas: 10
  targetCPU: 70%
```

---

## Testing

### Unit Tests

- Service methods
- Controller endpoints
- Validation logic
- Error handling

### Integration Tests

- Database operations
- Cache operations

### E2E Tests

- Full request/response cycle
- Authentication flow
- Error scenarios
- Rate limiting

---

## Changelog

- **2025-10-18:** Initial specification created by Nx generator
