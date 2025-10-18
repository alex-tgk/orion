# ORION API Documentation Portal

Welcome to the ORION microservices platform API documentation portal. This comprehensive guide provides detailed information about all REST APIs, WebSocket events, and integration patterns across the ORION ecosystem.

## Overview

ORION is a revolutionary microservices platform featuring CLI-based AI integration, self-improving capabilities, and comprehensive observability. The platform consists of multiple specialized services that communicate via REST APIs, message queues, and WebSocket connections.

## API Documentation Resources

### Interactive API Documentation (Swagger UI)

Each service provides interactive Swagger/OpenAPI documentation accessible at `/api/docs`:

| Service | Port | Swagger UI URL | Description |
|---------|------|----------------|-------------|
| **Authentication** | 20000 | http://localhost:20000/api/docs | JWT-based authentication, session management |
| **Gateway** | 20001 | http://localhost:20001/api/docs | API gateway, routing, rate limiting |
| **User** | 20002 | http://localhost:20002/api/docs | User management and profiles |
| **Notifications** | 20003 | http://localhost:20003/api/docs | Multi-channel notifications |
| **Admin UI** | 20004 | http://localhost:20004/api/docs | Observability and monitoring |
| **Analytics** | 20005 | http://localhost:20005/api/docs | Analytics and reporting |
| **Audit** | 20006 | http://localhost:20006/api/docs | Audit logging and compliance |
| **Cache** | 20007 | http://localhost:20007/api/docs | Caching service |
| **Config** | 20008 | http://localhost:20008/api/docs | Configuration management |
| **Logger** | 20009 | http://localhost:20009/api/docs | Centralized logging |

### Detailed API Guides

Comprehensive documentation for each service category:

- **[Authentication APIs](./authentication.md)** - User authentication, token management, session control
- **[Gateway APIs](./gateway.md)** - API gateway routing, health checks, metrics
- **[Notification APIs](./notifications.md)** - Email, SMS, push notifications, templates
- **[WebSocket Events](./websockets.md)** - Real-time events, health monitoring, system updates

### Code Documentation

Generated documentation from source code:

- **[TypeDoc Documentation](../generated/typedoc/)** - Complete TypeScript API reference
- **[Compodoc Documentation](../generated/compodoc/)** - NestJS architecture and components

## Quick Start

### Starting Services

```bash
# Start all services
npm run dev

# Start specific service
npm run dev:service auth

# Start affected services
npm run dev:affected
```

### Accessing API Documentation

1. **Start the services** you want to explore:
   ```bash
   npm run dev
   ```

2. **Open Swagger UI** in your browser:
   ```
   http://localhost:<PORT>/api/docs
   ```

3. **Try the APIs** using the interactive interface:
   - Click on an endpoint to expand it
   - Click "Try it out" to test the endpoint
   - Fill in parameters and click "Execute"
   - View the response

### Authentication

Most endpoints require authentication. To authenticate in Swagger UI:

1. Click the "Authorize" button at the top
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click "Authorize"
4. All subsequent requests will include the token

To get a token:

```bash
curl -X POST http://localhost:20000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

## API Conventions

### REST API Standards

All ORION services follow these REST API conventions:

#### Base URL Structure
```
http://localhost:<PORT>/api/<resource>
```

#### HTTP Methods
- `GET` - Retrieve resources
- `POST` - Create new resources
- `PUT` - Update entire resources
- `PATCH` - Partial resource updates
- `DELETE` - Remove resources

#### Response Format

All responses follow a consistent JSON structure:

**Success Response:**
```json
{
  "data": { /* resource data */ },
  "meta": {
    "timestamp": "2025-10-18T00:00:00Z",
    "requestId": "uuid-v4"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional context */ }
  },
  "meta": {
    "timestamp": "2025-10-18T00:00:00Z",
    "requestId": "uuid-v4"
  }
}
```

#### Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily down |

### Headers

#### Required Headers
```
Content-Type: application/json
```

#### Authentication
```
Authorization: Bearer <jwt-token>
```

#### Request Tracing
```
X-Request-ID: <uuid>          # Optional, auto-generated if not provided
X-Correlation-ID: <uuid>       # For distributed tracing
```

### Rate Limiting

Rate limits vary by endpoint and service:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public APIs | 100 req/min | Per IP |
| Authenticated | 1000 req/min | Per user |
| Auth Login | 5 req/min | Per IP |
| Auth Refresh | 10 req/min | Per user |

Rate limit headers in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1697587200
```

### Pagination

List endpoints support pagination using query parameters:

```
GET /api/users?page=1&limit=20&sort=createdAt:desc
```

**Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sort` - Sort field and direction (e.g., `createdAt:desc`)

**Response includes pagination metadata:**
```json
{
  "data": [ /* items */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Filtering

Use query parameters for filtering:

```
GET /api/users?status=active&role=admin&createdAfter=2025-01-01
```

### Versioning

API versioning is handled through the URL:

```
/api/v1/users
/api/v2/users
```

Current version: **v1** (implicit, can be omitted)

## WebSocket Connections

Real-time features use Socket.IO WebSocket connections:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:20004', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to ORION');
});

socket.on('health:update', (data) => {
  console.log('Health update:', data);
});
```

See [WebSocket Events](./websockets.md) for complete documentation.

## Error Handling

### Error Codes

ORION uses semantic error codes:

| Code | Description |
|------|-------------|
| `AUTH_INVALID_CREDENTIALS` | Invalid login credentials |
| `AUTH_TOKEN_EXPIRED` | JWT token has expired |
| `AUTH_TOKEN_INVALID` | JWT token is malformed or invalid |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |

### Validation Errors

Validation errors include detailed field information:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "must be a valid email address",
          "value": "invalid-email"
        }
      ]
    }
  }
}
```

## Testing APIs

### Using cURL

```bash
# GET request
curl http://localhost:20000/api/auth/health

# POST with authentication
curl -X POST http://localhost:20000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### Using Postman

1. Import the OpenAPI spec from: `http://localhost:<PORT>/api/docs-json`
2. Configure environment variables for tokens
3. Use Postman collections for testing

### Using HTTPie

```bash
# GET request
http GET localhost:20000/api/auth/health

# POST with JSON
http POST localhost:20000/api/auth/login \
  email=user@example.com \
  password=password
```

## SDK and Client Libraries

### TypeScript/JavaScript

```typescript
import { OrionClient } from '@orion/client-sdk';

const client = new OrionClient({
  baseUrl: 'http://localhost:20001',
  apiKey: 'your-api-key'
});

// Authenticate
const { accessToken } = await client.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Use authenticated client
const user = await client.users.getProfile();
```

## Development Tools

### Generate API Documentation

```bash
# Generate all documentation
npm run docs:generate

# Generate TypeDoc only
npm run docs:typedoc

# Generate Compodoc only
npm run docs:compodoc

# Generate OpenAPI specs
npm run docs:openapi

# Serve documentation locally
npm run docs:serve
```

### Validate OpenAPI Specs

```bash
# Validate all service specs
npm run spec:validate

# Generate coverage report
npm run spec:coverage
```

### Health Checks

Check service health and API availability:

```bash
# Check all services
npm run health

# View metrics
npm run metrics

# Run diagnostics
npm run diagnose
```

## Additional Resources

- **[Contributing to Documentation](./CONTRIBUTING.md)** - How to update and maintain API docs
- **[Architecture Documentation](../architecture/)** - System design and architecture
- **[Database Documentation](../DATABASE_IMPLEMENTATION.md)** - Database schemas and migrations
- **[Deployment Guide](../deployment/)** - Production deployment instructions
- **[Developer Handbook](../HANDBOOK.md)** - Complete developer guide

## Support

For questions and support:

- **GitHub Issues**: https://github.com/orion/orion/issues
- **Documentation**: https://docs.orion.com
- **Email**: support@orion.com
- **Slack**: #orion-api-support

## License

ORION is licensed under the MIT License. See [LICENSE](../../LICENSE) for details.

---

**Last Updated**: 2025-10-18
**API Version**: 1.0.0
**Documentation Version**: 1.0.0
