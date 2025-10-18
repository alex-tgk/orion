# ORION API Documentation

Complete API reference for all ORION platform services.

## 🔐 Authentication Service API

Base URL: `http://localhost:3001/api/auth`

### Endpoints

#### POST /login

Authenticate a user and receive access and refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limit exceeded (5 requests/minute)

**Example:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@orion.com",
    "password": "Password123!"
  }'
```

---

#### POST /refresh

Refresh an expired access token using a valid refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

**Error Responses:**
- `400 Bad Request` - Missing or invalid refresh token
- `401 Unauthorized` - Refresh token expired or revoked
- `429 Too Many Requests` - Rate limit exceeded (10 requests/minute)

**Example:**
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

#### POST /logout

Invalidate the current session and refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "message": "Successfully logged out"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing access token

**Example:**
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Health Endpoints

#### GET /health

Basic health check for the service.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

---

#### GET /health/liveness

Kubernetes liveness probe endpoint.

**Response:** `200 OK`
```json
{
  "status": "ok"
}
```

---

#### GET /health/readiness

Kubernetes readiness probe endpoint.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "healthy",
    "cpu": "healthy"
  }
}
```

---

## 🔒 Authentication

Most endpoints require JWT authentication. Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

1. **Access Token**: Valid for 15 minutes
2. **Refresh Token**: Valid for 7 days
3. **Token Rotation**: New refresh token issued on each refresh

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/login` | 5 requests | 1 minute |
| `/refresh` | 10 requests | 1 minute |
| Default | 100 requests | 1 minute |

---

## 📊 Response Format

### Success Response

```json
{
  "data": { /* response data */ },
  "message": "Success message",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

### Validation Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "errors": [
    {
      "field": "email",
      "message": "email must be a valid email address"
    },
    {
      "field": "password",
      "message": "password must be at least 8 characters"
    }
  ],
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-18T10:00:00.000Z"
}
```

---

## 🔍 Interactive Documentation

Once the service is running, access the interactive Swagger UI:

**Local:** http://localhost:3001/api/docs

The Swagger UI provides:
- Complete API schema
- Try-it-out functionality
- Request/response examples
- Authentication testing
- Model definitions

---

## 📝 Data Models

### LoginDto

```typescript
{
  email: string;      // Valid email address
  password: string;   // Minimum 8 characters
}
```

**Validation Rules:**
- Email: Must be a valid email format
- Password: Minimum 8 characters, at least one uppercase, one lowercase, one number

### RefreshTokenDto

```typescript
{
  refresh_token: string;  // Valid JWT refresh token
}
```

### AuthResponseDto

```typescript
{
  access_token: string;   // JWT access token
  refresh_token: string;  // JWT refresh token
  expires_in: number;     // Token expiry in seconds
  token_type: string;     // Always "Bearer"
}
```

### HealthStatus

```typescript
{
  status: 'ok' | 'error';
  info?: Record<string, any>;
  error?: Record<string, any>;
  details: Record<string, any>;
}
```

---

## 🛡️ Security Considerations

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Special characters recommended

### Token Security

- Access tokens are short-lived (15 minutes)
- Refresh tokens use rotation (new token on each refresh)
- All tokens use HS256 signing algorithm
- Tokens include issuer and audience claims

### Session Management

- Sessions stored in Redis with TTL
- Fallback to database if Redis unavailable
- Sessions invalidated on logout
- Old refresh tokens revoked automatically

---

## 🚀 Code Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/auth';

// Login
async function login(email: string, password: string) {
  const response = await axios.post(`${API_BASE_URL}/login`, {
    email,
    password,
  });
  return response.data;
}

// Refresh Token
async function refreshToken(refreshToken: string) {
  const response = await axios.post(`${API_BASE_URL}/refresh`, {
    refresh_token: refreshToken,
  });
  return response.data;
}

// Logout
async function logout(accessToken: string) {
  await axios.post(
    `${API_BASE_URL}/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// Usage
const tokens = await login('user@example.com', 'Password123!');
console.log('Access Token:', tokens.access_token);

// Later, when token expires
const newTokens = await refreshToken(tokens.refresh_token);
console.log('New Access Token:', newTokens.access_token);
```

### Python

```python
import requests

API_BASE_URL = 'http://localhost:3001/api/auth'

# Login
def login(email: str, password: str):
    response = requests.post(
        f'{API_BASE_URL}/login',
        json={'email': email, 'password': password}
    )
    response.raise_for_status()
    return response.json()

# Refresh Token
def refresh_token(refresh_token: str):
    response = requests.post(
        f'{API_BASE_URL}/refresh',
        json={'refresh_token': refresh_token}
    )
    response.raise_for_status()
    return response.json()

# Logout
def logout(access_token: str):
    response = requests.post(
        f'{API_BASE_URL}/logout',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    response.raise_for_status()

# Usage
tokens = login('user@example.com', 'Password123!')
print(f"Access Token: {tokens['access_token']}")

# Later, when token expires
new_tokens = refresh_token(tokens['refresh_token'])
print(f"New Access Token: {new_tokens['access_token']}")
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'

# Refresh Token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Health Check
curl http://localhost:3001/api/auth/health
```

---

## 📖 Additional Resources

- [Swagger UI](http://localhost:3001/api/docs) - Interactive API documentation
- [Authentication Guide](../guides/AUTHENTICATION.md) - Detailed authentication flow
- [Security Best Practices](../guides/SECURITY.md) - Security guidelines
- [Error Handling](../guides/ERROR_HANDLING.md) - Error codes and handling

---

## 🆘 Support

For issues or questions:
- GitHub Issues: https://github.com/orion/orion/issues
- Documentation: https://docs.orion.com
- Email: support@orion.com