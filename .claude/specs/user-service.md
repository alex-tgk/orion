# User Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** Phase 2.1 Workstream
**Dependencies:** Auth Service, Shared Libraries

---

## Overview

The User Service manages user profiles, preferences, and settings for the ORION platform. It provides CRUD operations for user data, search capabilities, avatar management, and preference customization.

## Service Details

- **Name:** `user-service`
- **Port:** `3002`
- **Base URL:** `/api/v1/users`
- **Database:** PostgreSQL (separate database: `orion_user`)
- **Cache:** Redis (for frequently accessed profiles)
- **Authentication:** JWT validation via Auth Service

## API Endpoints

### User Profile Management

#### GET /users/:id
Get user profile by ID.

**Auth Required:** Yes (JWT)
**Rate Limit:** 100 req/min

**Request:**
```http
GET /api/v1/users/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt-token>
```

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://storage.orion.com/avatars/user123.jpg",
  "bio": "Software engineer passionate about AI",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-18T14:30:00Z"
}
```

**Errors:**
- `401 Unauthorized` - Invalid or missing JWT
- `404 Not Found` - User not found

---

#### GET /users/me
Get current authenticated user's profile.

**Auth Required:** Yes (JWT)
**Rate Limit:** 100 req/min

**Request:**
```http
GET /api/v1/users/me
Authorization: Bearer <jwt-token>
```

**Response:** Same as GET /users/:id

---

#### PATCH /users/:id
Update user profile (user can only update their own profile).

**Auth Required:** Yes (JWT)
**Rate Limit:** 20 req/min

**Request:**
```http
PATCH /api/v1/users/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "John Smith",
  "bio": "Updated bio",
  "location": "New York, NY",
  "website": "https://johnsmith.com"
}
```

**Response:** `200 OK` (updated user object)

**Validation:**
- `name`: 2-100 characters
- `bio`: max 500 characters
- `location`: max 100 characters
- `website`: valid URL format

**Errors:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Invalid JWT
- `403 Forbidden` - User cannot update another user's profile
- `404 Not Found` - User not found

---

#### DELETE /users/:id
Soft delete user profile (user can only delete their own profile).

**Auth Required:** Yes (JWT)
**Rate Limit:** 5 req/min

**Request:**
```http
DELETE /api/v1/users/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt-token>
```

**Response:** `204 No Content`

**Behavior:**
- Soft delete (sets `deletedAt` timestamp)
- User can no longer log in
- Profile hidden from search
- Data retained for 30 days before permanent deletion

**Errors:**
- `401 Unauthorized` - Invalid JWT
- `403 Forbidden` - User cannot delete another user's profile
- `404 Not Found` - User already deleted or not found

---

### User Search

#### GET /users/search
Search for users by name, email, or other criteria.

**Auth Required:** Yes (JWT)
**Rate Limit:** 50 req/min

**Request:**
```http
GET /api/v1/users/search?q=john&location=San Francisco&page=1&limit=20
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `q` (optional): Search query (searches name, email, bio)
- `location` (optional): Filter by location
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Results per page

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "John Doe",
      "avatar": "https://storage.orion.com/avatars/user123.jpg",
      "bio": "Software engineer",
      "location": "San Francisco, CA"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Note:** Email addresses are not included in search results for privacy

---

### Avatar Management

#### POST /users/:id/avatar
Upload user avatar image.

**Auth Required:** Yes (JWT)
**Rate Limit:** 10 req/min

**Request:**
```http
POST /api/v1/users/123e4567-e89b-12d3-a456-426614174000/avatar
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

avatar=<image-file>
```

**File Requirements:**
- Max size: 5MB
- Formats: JPEG, PNG, WebP
- Dimensions: Will be resized to 400x400px

**Response:** `200 OK`
```json
{
  "avatarUrl": "https://storage.orion.com/avatars/user123.jpg"
}
```

**Errors:**
- `400 Bad Request` - Invalid file format or size
- `401 Unauthorized` - Invalid JWT
- `403 Forbidden` - User cannot upload avatar for another user
- `413 Payload Too Large` - File exceeds 5MB

---

### User Preferences

#### GET /users/:id/preferences
Get user preferences and settings.

**Auth Required:** Yes (JWT)
**Rate Limit:** 100 req/min

**Request:**
```http
GET /api/v1/users/123e4567-e89b-12d3-a456-426614174000/preferences
Authorization: Bearer <jwt-token>
```

**Response:** `200 OK`
```json
{
  "notifications": {
    "email": true,
    "sms": false,
    "push": true
  },
  "privacy": {
    "profileVisibility": "public",
    "showEmail": false,
    "showLocation": true
  },
  "display": {
    "theme": "dark",
    "language": "en"
  }
}
```

---

#### PATCH /users/:id/preferences
Update user preferences.

**Auth Required:** Yes (JWT)
**Rate Limit:** 20 req/min

**Request:**
```http
PATCH /api/v1/users/123e4567-e89b-12d3-a456-426614174000/preferences
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "notifications": {
    "email": false
  },
  "display": {
    "theme": "light"
  }
}
```

**Response:** `200 OK` (updated preferences object)

---

### Health Endpoints

#### GET /health
Basic health check.

**Auth Required:** No
**Rate Limit:** None

**Response:** `200 OK`
```json
{
  "status": "ok",
  "service": "user-service",
  "version": "1.0.0"
}
```

#### GET /health/ready
Readiness probe for Kubernetes.

**Auth Required:** No
**Response:** `200 OK` if database and cache are accessible

#### GET /health/live
Liveness probe for Kubernetes.

**Auth Required:** No
**Response:** `200 OK` if service is running

---

## Data Models

### User Entity

```typescript
interface User {
  id: string;                    // UUID v4
  email: string;                 // Unique, from Auth Service
  name: string;                  // Display name
  avatar?: string;               // URL to avatar image
  bio?: string;                  // User biography
  location?: string;             // City, Country
  website?: string;              // Personal website URL
  createdAt: Date;              // Account creation timestamp
  updatedAt: Date;              // Last update timestamp
  deletedAt?: Date;             // Soft delete timestamp
}
```

### UserPreferences Entity

```typescript
interface UserPreferences {
  id: string;                    // UUID v4
  userId: string;                // Foreign key to User
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showLocation: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;            // ISO 639-1 code
  };
  updatedAt: Date;
}
```

---

## Database Schema

### users table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar VARCHAR(500),
  bio TEXT,
  location VARCHAR(100),
  website VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_search ON users USING GIN(to_tsvector('english', name || ' ' || COALESCE(bio, '')));
```

### user_preferences table

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "push": true}',
  privacy JSONB NOT NULL DEFAULT '{"profileVisibility": "public", "showEmail": false, "showLocation": true}',
  display JSONB NOT NULL DEFAULT '{"theme": "auto", "language": "en"}',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

---

## Events Published

### UserCreated

Published when a new user profile is created (typically after registration).

```typescript
interface UserCreatedEvent {
  eventId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

### UserUpdated

Published when user profile is updated.

```typescript
interface UserUpdatedEvent {
  eventId: string;
  userId: string;
  changes: string[];              // Array of changed fields
  updatedAt: Date;
}
```

### UserDeleted

Published when user is soft deleted.

```typescript
interface UserDeletedEvent {
  eventId: string;
  userId: string;
  deletedAt: Date;
}
```

### UserPreferencesUpdated

Published when user preferences change.

```typescript
interface UserPreferencesUpdatedEvent {
  eventId: string;
  userId: string;
  preferences: UserPreferences;
  updatedAt: Date;
}
```

---

## Dependencies

### Auth Service (External)
- **Purpose:** JWT validation
- **Endpoint:** `GET /auth/validate` (internal)
- **Fallback:** Cache validated tokens in Redis for 5 minutes

### Storage Service (Future)
- **Purpose:** Avatar storage
- **Endpoint:** `POST /storage/upload`
- **Fallback:** Store as Base64 in database initially

---

## Security Considerations

1. **Authentication:**
   - All endpoints except /health require valid JWT
   - JWT validated against Auth Service
   - User can only modify their own profile

2. **Authorization:**
   - Profile visibility respects privacy settings
   - Email addresses hidden in search results
   - Soft delete prevents re-registration

3. **Rate Limiting:**
   - Configured per endpoint
   - Based on user ID from JWT
   - Stored in Redis

4. **Data Privacy:**
   - Passwords never stored (handled by Auth Service)
   - Sensitive fields encrypted at rest
   - GDPR-compliant data retention (30 days after delete)

---

## Performance Requirements

- **Response Time:** P95 < 200ms
- **Throughput:** 1000 req/sec
- **Availability:** 99.9%
- **Database Connections:** Pool of 20

---

## Caching Strategy

### Redis Caching

```typescript
// Cache user profiles for 5 minutes
cache.set(`user:${userId}`, user, 300);

// Cache search results for 1 minute
cache.set(`search:${query}`, results, 60);

// Cache preferences for 10 minutes
cache.set(`preferences:${userId}`, prefs, 600);
```

### Cache Invalidation

- User update → Invalidate `user:${userId}`
- User delete → Invalidate all user-related caches
- Preferences update → Invalidate `preferences:${userId}`

---

## Testing Requirements

### Unit Tests (Target: 80%+ coverage)
- UserService methods
- SearchService logic
- StorageService methods
- DTO validation
- Entity transformations

### Integration Tests
- Database operations
- Redis caching
- JWT validation with Auth Service mock
- Event publishing to RabbitMQ

### E2E Tests
- Complete user profile CRUD flow
- Search functionality
- Avatar upload flow
- Preferences management

---

## Monitoring and Observability

### Metrics
- Request rate per endpoint
- Response time percentiles (P50, P95, P99)
- Error rate
- Cache hit/miss ratio
- Database query time

### Logging
- Structured JSON logs
- Correlation IDs for request tracking
- User actions audit log
- Error stack traces (sanitized)

### Health Checks
- Database connectivity
- Redis connectivity
- Disk space for avatar storage

---

## Deployment

### Docker
- Multi-stage build
- Non-root user
- Health check configured

### Kubernetes
- Min 3 replicas
- Max 10 replicas
- HPA on CPU (70%) and memory (80%)
- Resource limits: 500m CPU, 512Mi memory

---

## Migration Plan

### Phase 1: Foundation (Day 1-2)
- Set up project structure
- Implement user CRUD
- Basic tests

### Phase 2: Features (Day 3)
- Search functionality
- Avatar upload
- Preferences management

### Phase 3: Integration (Day 4)
- Event publishing
- JWT validation
- Caching layer

### Phase 4: Polish (Day 5)
- Comprehensive tests
- Documentation
- Performance optimization

---

## Open Questions

1. Should we support multiple avatars per user?
2. What's the maximum retention period for deleted users?
3. Do we need user verification workflow?
4. Should search support fuzzy matching?

---

## Changelog

- **2025-01-18:** Initial specification created
