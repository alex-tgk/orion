# ORION Platform - API Documentation

**Version:** 1.0.0
**Base URL:** `http://localhost:3000/api/v1`
**Last Updated:** 2025-10-18

---

## Quick Start

### Authentication

All protected endpoints require a JWT bearer token:

```bash
# 1. Register/Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1...",
  "refreshToken": "eyJhbGciOiJIUzI1...",
  "expiresIn": 3600
}

# 2. Use token in requests
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1..."
```

---

## API Services

### Core Services
- [Authentication API](./services/auth.md) - User authentication and authorization
- [User API](./services/user.md) - User profile and preferences
- [Notification API](./services/notification.md) - Multi-channel notifications
- [Admin UI API](./services/admin-ui.md) - Administrative operations

### Support Topics
- [Authentication Guide](./authentication.md) - Complete auth flow
- [Rate Limiting](./rate-limiting.md) - Rate limit policies
- [Versioning](./versioning.md) - API versioning strategy
- [Error Handling](./error-handling.md) - Standard error responses

---

## Common Patterns

### Pagination

```javascript
GET /api/v1/users?page=1&pageSize=20

Response:
{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Filtering

```javascript
GET /api/v1/users?role=admin&status=active

Response:
{
  "data": [/* filtered results */]
}
```

### Sorting

```javascript
GET /api/v1/users?sortBy=createdAt&sortOrder=desc
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-18T14:30:00Z"
}
```

**Common Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Rate Limiting

Default limits:
- Authentication endpoints: 5 req/min
- User endpoints: 100 req/min
- Public endpoints: 20 req/min

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642521600
```

---

## Interactive Documentation

When running locally, access Swagger UI:
- http://localhost:3000/api/docs

---

**More Info**: See [Documentation Index](../DOCUMENTATION_INDEX.md)
