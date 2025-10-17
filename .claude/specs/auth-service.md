# Auth Service Specification

## Problem Analysis (First Principles)

### What are we really solving?
We need to verify user identity and maintain secure sessions across the ORION platform.

### What's the absolute minimum needed?
- User identification (who is this?)
- Session verification (are they still who they claim to be?)
- Token generation and validation
- Session lifecycle management

### What assumptions can we challenge?
- **Assumption**: We need complex OAuth immediately
- **Challenge**: Start with JWT + refresh tokens. Add OAuth later if needed.
- **Decision**: Simple, secure, and extensible is better than complex upfront.

## Success Criteria

- [x] JWT generation and validation
- [x] Refresh token rotation
- [x] Session management in Redis
- [x] Rate limiting per user
- [x] Observable authentication flow
- [x] Graceful degradation when Redis unavailable
- [x] Comprehensive error handling
- [x] Full test coverage (>80%)

## Design Decisions

### Decision 1: JWT vs Sessions

**Context**: How do we manage user authentication state?

**Options Considered**:

1. **Option A: JWT Only (Stateless)**
   - Pros: Horizontally scalable, no server state, simple
   - Cons: Can't revoke tokens easily, larger payload in requests
   - Risk: Medium (security concerns with token revocation)

2. **Option B: Server Sessions Only**
   - Pros: Easy to revoke, server controls everything
   - Cons: Requires session storage, harder to scale
   - Risk: Medium (scalability bottleneck)

3. **Option C: JWT + Redis Sessions (Hybrid)**
   - Pros: Revokable, scalable, trackable, best of both worlds
   - Cons: Additional complexity, Redis dependency
   - Risk: Low (well-established pattern)

**Decision**: **Option C** - Security and flexibility are paramount

**Consequences**:
- Positive: Can revoke sessions, track active users, balance simplicity and security
- Negative: Need to maintain Redis, slightly more complex
- Mitigation: Graceful degradation if Redis is unavailable

**Reversibility**: Medium - Can switch to pure JWT later, but would lose session tracking

### Decision 2: Token Expiration Strategy

**Context**: How long should tokens be valid?

**Decision**:
- Access Token: 15 minutes (short-lived)
- Refresh Token: 7 days (long-lived)
- Rationale: Minimizes exposure if access token is compromised

### Decision 3: Password Storage

**Context**: How do we store passwords securely?

**Decision**: bcrypt with salt rounds of 12
- Industry standard
- Adjustable difficulty
- Protection against rainbow tables

## API Contract

### Authentication Endpoints

```typescript
POST /auth/login
Request:
{
  email: string;
  password: string;
}
Response:
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
  }
}
```

```typescript
POST /auth/logout
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

```typescript
POST /auth/refresh
Request:
{
  refreshToken: string;
}
Response:
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

```typescript
GET /auth/me
Headers: Authorization: Bearer <token>
Response:
{
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
```

```typescript
GET /auth/health
Response:
{
  status: 'ok' | 'degraded' | 'down';
  redis: 'connected' | 'disconnected';
  uptime: number;
  timestamp: string;
}
```

## Implementation Plan

### Phase 1.1: Setup & Infrastructure (2 hours)
1. Generate NestJS auth service with Nx
2. Set up Prisma schema for users
3. Configure JWT module
4. Configure Redis connection

### Phase 1.2: Core Authentication (3 hours)
1. Create User entity and DTO
2. Implement JWT strategy with proper error handling
3. Implement local strategy (username/password)
4. Create auth service with login/logout logic
5. Add password hashing with bcrypt

### Phase 1.3: Session Management (2 hours)
1. Create session store service with Redis
2. Implement refresh token rotation
3. Add token blacklist for logout
4. Implement graceful fallback when Redis is down

### Phase 1.4: Security & Middleware (2 hours)
1. Add rate limiting middleware (100 req/min per IP)
2. Add request logging
3. Add authentication guards
4. Implement CORS configuration

### Phase 1.5: Observability (1 hour)
1. Add comprehensive logging
2. Add OpenTelemetry tracing
3. Add health check endpoint
4. Add metrics for failed login attempts

### Phase 1.6: Testing (3 hours)
1. Unit tests for auth service
2. Unit tests for JWT strategy
3. Integration tests for auth endpoints
4. E2E tests for complete auth flow

### Phase 1.7: Documentation (1 hour)
1. Generate OpenAPI/Swagger documentation
2. Write integration guide
3. Document error codes

**Total Estimated Time**: 14 hours

## Data Model

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String    // bcrypt hashed
  name          String
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  @@index([email])
}

model RefreshToken {
  id         String   @id @default(uuid())
  userId     String
  token      String   @unique
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  isRevoked  Boolean  @default(false)

  @@index([userId])
  @@index([token])
}
```

## Redis Data Structures

```typescript
// Active sessions
Key: `session:${userId}`
Value: {
  accessToken: string,
  refreshToken: string,
  createdAt: number,
  expiresAt: number,
  metadata: {
    ip: string,
    userAgent: string
  }
}
TTL: 7 days

// Token blacklist (for logout)
Key: `blacklist:${tokenId}`
Value: "revoked"
TTL: token expiration time

// Rate limiting
Key: `ratelimit:${ip}:${endpoint}`
Value: counter
TTL: 60 seconds
```

## Error Handling

```typescript
enum AuthErrorCode {
  INVALID_CREDENTIALS = 'AUTH001',
  TOKEN_EXPIRED = 'AUTH002',
  TOKEN_INVALID = 'AUTH003',
  TOKEN_REVOKED = 'AUTH004',
  RATE_LIMIT_EXCEEDED = 'AUTH005',
  SESSION_NOT_FOUND = 'AUTH006',
  REDIS_UNAVAILABLE = 'AUTH007',
  USER_INACTIVE = 'AUTH008',
}
```

## Thinking Checkpoints

### Security Checklist
- [x] Is the auth flow secure against common attacks?
  - XSS: Tokens in HttpOnly cookies or secure headers
  - CSRF: Using proper CORS and token validation
  - Brute force: Rate limiting implemented
  - Rainbow tables: bcrypt with salt

- [x] Can we handle 1000 concurrent users?
  - Yes: JWT is stateless for validation
  - Yes: Redis can handle high throughput
  - Yes: Horizontal scaling possible

- [x] What happens when Redis is down?
  - Graceful degradation: Auth still works
  - Log warnings and metrics
  - Unable to revoke tokens (temporary limitation)
  - Automatic reconnection logic

- [x] How do we handle token expiry gracefully?
  - Refresh token endpoint for seamless renewal
  - Clear error messages
  - Client-side token refresh logic

- [x] Are all edge cases covered?
  - Expired tokens: Proper error handling
  - Concurrent logins: Allow multiple sessions
  - Token theft: Short-lived access tokens
  - Password reset: Out of scope for Phase 1

## Performance Targets

- Login: < 200ms (P95)
- Token validation: < 50ms (P95)
- Token refresh: < 100ms (P95)
- Health check: < 10ms (P95)

## Monitoring & Alerts

### Metrics to Track
- Login success/failure rate
- Token validation latency
- Redis connection status
- Rate limit triggers
- Active sessions count

### Alerts
- Login failure rate > 10% (potential attack)
- Redis disconnection
- Response time > 500ms
- Rate limit triggers > 100/min

## Dependencies

- @nestjs/jwt
- @nestjs/passport
- passport-jwt
- bcrypt
- ioredis
- class-validator
- class-transformer

## Out of Scope (Future Phases)

- OAuth integration (Google, GitHub, etc.)
- Two-factor authentication
- Password reset flow
- Email verification
- User registration
- Role-based access control (RBAC)
- Permission management

## References

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
