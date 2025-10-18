# Authentication API Documentation

The ORION Authentication Service provides secure JWT-based authentication with refresh token rotation, session management via Redis, and comprehensive health monitoring.

## Base URL

```
http://localhost:20000/api/auth
```

## Features

- JWT access tokens (15 min expiry) with refresh token rotation
- bcrypt password hashing (12 rounds)
- Redis session management with graceful degradation
- Rate limiting on sensitive endpoints
- Comprehensive health checks

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Auth Service
    participant Redis
    participant Database

    Client->>Auth Service: POST /login
    Auth Service->>Database: Verify credentials
    Database-->>Auth Service: User data
    Auth Service->>Auth Service: Generate tokens
    Auth Service->>Redis: Store refresh token
    Auth Service-->>Client: Access + Refresh tokens

    Client->>Auth Service: Request with Access Token
    Auth Service->>Auth Service: Verify JWT
    Auth Service-->>Client: Protected resource

    Client->>Auth Service: POST /refresh
    Auth Service->>Redis: Verify refresh token
    Redis-->>Auth Service: Token valid
    Auth Service->>Auth Service: Generate new tokens
    Auth Service->>Redis: Store new refresh token
    Auth Service-->>Client: New Access + Refresh tokens
```

## Endpoints

### Login

Authenticate a user with email and password credentials.

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"]
  }
}
```

**Error Responses:**

`401 Unauthorized` - Invalid credentials
```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

`429 Too Many Requests` - Rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. Please try again later."
  }
}
```

**Rate Limit:** 5 requests per minute per IP

**cURL Example:**
```bash
curl -X POST http://localhost:20000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

---

### Logout

Invalidate the current user session and tokens.

**Endpoint:** `POST /auth/logout`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <access-token>
```

**Response:** `204 No Content`

**Error Responses:**

`401 Unauthorized` - Invalid or expired token
```json
{
  "error": {
    "code": "AUTH_TOKEN_INVALID",
    "message": "Invalid or expired authentication token"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:20000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Refresh Token

Get new access and refresh tokens using a valid refresh token.

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"]
  }
}
```

**Error Responses:**

`401 Unauthorized` - Invalid or expired refresh token
```json
{
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "Refresh token has expired. Please login again."
  }
}
```

**Rate Limit:** 10 requests per minute per user

**cURL Example:**
```bash
curl -X POST http://localhost:20000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

### Get User Profile

Retrieve the profile information for the currently authenticated user.

**Endpoint:** `GET /auth/me`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <access-token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid-v4",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["user"],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastLoginAt": "2025-10-18T14:25:00Z"
}
```

**Error Responses:**

`401 Unauthorized` - Invalid or expired token

**cURL Example:**
```bash
curl -X GET http://localhost:20000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Health Check

Get the overall health status of the authentication service.

**Endpoint:** `GET /auth/health`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T14:30:00Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    },
    "memory": {
      "status": "healthy",
      "used": 45.2,
      "available": 54.8
    }
  }
}
```

**cURL Example:**
```bash
curl http://localhost:20000/api/auth/health
```

---

### Liveness Probe

Check if the service is alive (Kubernetes liveness probe).

**Endpoint:** `GET /auth/health/liveness`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "alive",
  "timestamp": "2025-10-18T14:30:00Z"
}
```

**cURL Example:**
```bash
curl http://localhost:20000/api/auth/health/liveness
```

---

### Readiness Probe

Check if the service is ready to accept requests (Kubernetes readiness probe).

**Endpoint:** `GET /auth/health/readiness`

**Authentication:** Not required

**Response:** `200 OK`
```json
{
  "status": "ready",
  "timestamp": "2025-10-18T14:30:00Z",
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**Response:** `503 Service Unavailable` (if not ready)
```json
{
  "status": "not_ready",
  "timestamp": "2025-10-18T14:30:00Z",
  "checks": {
    "database": "connected",
    "redis": "disconnected"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:20000/api/auth/health/readiness
```

---

## Data Models

### LoginDto

```typescript
{
  email: string;      // Valid email address (required)
  password: string;   // Minimum 8 characters (required)
}
```

**Validation Rules:**
- `email`: Must be a valid email format
- `password`: Minimum 8 characters

### RefreshTokenDto

```typescript
{
  refreshToken: string;  // Valid JWT refresh token (required)
}
```

### LoginResponseDto

```typescript
{
  accessToken: string;   // JWT access token
  refreshToken: string;  // JWT refresh token
  expiresIn: number;     // Token expiry in seconds (900 = 15 min)
  user: UserResponseDto; // User information
}
```

### UserResponseDto

```typescript
{
  id: string;            // UUID v4
  email: string;         // User email
  name: string;          // User full name
  roles: string[];       // User roles (e.g., ['user', 'admin'])
  createdAt: string;     // ISO 8601 timestamp
  updatedAt: string;     // ISO 8601 timestamp
  lastLoginAt?: string;  // ISO 8601 timestamp (optional)
}
```

---

## Security

### Token Expiry

- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

### Password Requirements

- Minimum length: 8 characters
- Must contain: uppercase, lowercase, number, special character
- bcrypt hashing with 12 rounds

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 requests | 1 minute |
| `/auth/refresh` | 10 requests | 1 minute |
| Other endpoints | 100 requests | 1 minute |

### Session Management

- Sessions stored in Redis with TTL
- Automatic cleanup of expired sessions
- Graceful degradation if Redis is unavailable

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT token has expired |
| `AUTH_TOKEN_INVALID` | 401 | JWT token is malformed or invalid |
| `AUTH_TOKEN_MISSING` | 401 | No authentication token provided |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Best Practices

### Token Management

1. **Store tokens securely:**
   ```javascript
   // Good: Use httpOnly cookies or secure storage
   localStorage.setItem('refreshToken', token);

   // Better: Use httpOnly cookies
   // Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
   ```

2. **Handle token refresh automatically:**
   ```javascript
   async function makeAuthenticatedRequest(url, options) {
     let response = await fetch(url, {
       ...options,
       headers: {
         ...options.headers,
         'Authorization': `Bearer ${accessToken}`
       }
     });

     if (response.status === 401) {
       // Token expired, refresh it
       const newTokens = await refreshTokens();
       accessToken = newTokens.accessToken;

       // Retry request with new token
       response = await fetch(url, {
         ...options,
         headers: {
           ...options.headers,
           'Authorization': `Bearer ${accessToken}`
         }
       });
     }

     return response;
   }
   ```

3. **Implement token rotation:**
   - Always update both access and refresh tokens on refresh
   - Invalidate old refresh tokens
   - Clear tokens on logout

### Error Handling

```javascript
try {
  const response = await login(email, password);
  // Handle successful login
} catch (error) {
  if (error.code === 'AUTH_INVALID_CREDENTIALS') {
    // Show "Invalid email or password" message
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Show "Too many attempts" message
  } else {
    // Show generic error message
  }
}
```

---

## Testing

### Example Test Suite

```typescript
describe('Authentication API', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'SecurePassword123!'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'WrongPassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('should refresh tokens', async () => {
    const loginResponse = await login();
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: loginResponse.body.refreshToken
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
});
```

---

## Swagger UI

Interactive API documentation is available at:

**http://localhost:20000/api/docs**

Features:
- Try out endpoints with live requests
- View request/response schemas
- Test authentication flows
- Export OpenAPI specification

---

**Related Documentation:**
- [Gateway API](./gateway.md)
- [WebSocket Events](./websockets.md)
- [Error Handling Guide](../guides/error-handling.md)
- [Security Best Practices](../guides/security.md)
