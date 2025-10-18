# User Service

User profile and preferences management service for the ORION platform.

## Overview

The User Service provides comprehensive user management functionality including:

- User profile CRUD operations
- User search and discovery
- Avatar upload and management
- User preferences and settings
- Privacy controls
- Event publishing for user lifecycle events

## Features

- **JWT Authentication**: Secure authentication via Auth Service
- **Role-based Access**: Users can only modify their own profiles
- **Redis Caching**: High-performance caching layer for frequently accessed data
- **Event Publishing**: RabbitMQ integration for event-driven architecture
- **Rate Limiting**: Configurable rate limits per endpoint
- **Full-text Search**: PostgreSQL-powered user search
- **Avatar Management**: File upload and storage for user avatars
- **Swagger Documentation**: Auto-generated API documentation
- **Health Checks**: Kubernetes-ready liveness and readiness probes
- **Comprehensive Testing**: 80%+ test coverage

## Technology Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Authentication**: JWT (Passport)
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 14+
- Redis 7+
- RabbitMQ 3.12+

## Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
cd packages/user
npx prisma generate

# Run database migrations
npx prisma migrate deploy
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Service port | 3002 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis hostname | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `REDIS_DB` | Redis database number | 1 |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_ISSUER` | JWT issuer | orion-platform |
| `JWT_AUDIENCE` | JWT audience | orion-users |
| `RABBITMQ_URL` | RabbitMQ connection string | - |
| `STORAGE_PATH` | Avatar storage path | ./uploads/avatars |
| `MAX_FILE_SIZE` | Max avatar file size (bytes) | 5242880 (5MB) |

## Running the Service

### Development

```bash
# From workspace root
nx serve user

# Or with pnpm
pnpm --filter @orion/user serve
```

The service will be available at `http://localhost:3002/api/v1`

### Production

```bash
# Build
nx build user --prod

# Run
node dist/packages/user/main.js
```

## API Endpoints

### User Profile Management

#### GET /api/v1/users/me
Get current authenticated user's profile.

**Auth**: Required (JWT)

**Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://...",
  "bio": "Software engineer",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com",
  "createdAt": "2025-01-18T10:00:00Z",
  "updatedAt": "2025-01-18T10:00:00Z"
}
```

#### GET /api/v1/users/:id
Get user profile by ID.

**Auth**: Required (JWT)

#### PATCH /api/v1/users/:id
Update user profile (own profile only).

**Auth**: Required (JWT)

**Body**:
```json
{
  "name": "Jane Doe",
  "bio": "Product Manager",
  "location": "New York, NY",
  "website": "https://janedoe.com"
}
```

#### DELETE /api/v1/users/:id
Soft delete user profile (own profile only).

**Auth**: Required (JWT)

**Response**: 204 No Content

### User Search

#### GET /api/v1/users/search
Search for users.

**Auth**: Required (JWT)

**Query Parameters**:
- `q`: Search query (optional)
- `location`: Filter by location (optional)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "avatar": "https://...",
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

### Avatar Management

#### POST /api/v1/users/:id/avatar
Upload user avatar.

**Auth**: Required (JWT)

**Content-Type**: multipart/form-data

**Body**: Form field `avatar` with image file

**File Requirements**:
- Max size: 5MB
- Formats: JPEG, PNG, WebP

**Response**:
```json
{
  "avatarUrl": "https://storage.orion.com/avatars/user123.jpg"
}
```

### Preferences Management

#### GET /api/v1/users/:id/preferences
Get user preferences (own preferences only).

**Auth**: Required (JWT)

**Response**:
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

#### PATCH /api/v1/users/:id/preferences
Update user preferences.

**Auth**: Required (JWT)

**Body**:
```json
{
  "notifications": {
    "email": false
  },
  "display": {
    "theme": "light"
  }
}
```

### Health Checks

#### GET /health
Basic health check.

**Auth**: Not required

#### GET /health/live
Liveness probe for Kubernetes.

**Auth**: Not required

#### GET /health/ready
Readiness probe (checks database and cache connectivity).

**Auth**: Not required

## Testing

```bash
# Run all tests
nx test user

# Run tests in watch mode
nx test user --watch

# Run tests with coverage
nx test user --coverage

# Coverage report will be in coverage/packages/user
```

### Test Coverage Targets

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Docker

### Build Image

```bash
docker build -t orion/user-service:latest -f packages/user/Dockerfile .
```

### Run Container

```bash
docker run -p 3002:3002 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_HOST="redis" \
  -e RABBITMQ_URL="amqp://..." \
  orion/user-service:latest
```

## Kubernetes Deployment

```bash
# Create namespace
kubectl create namespace orion

# Apply secrets
kubectl apply -f k8s/user-service/secrets.yaml

# Deploy service
kubectl apply -f k8s/user-service/deployment.yaml

# Check status
kubectl get pods -n orion -l app=user-service
```

### Scaling

The service uses Horizontal Pod Autoscaler (HPA):
- **Min replicas**: 3
- **Max replicas**: 10
- **CPU threshold**: 70%
- **Memory threshold**: 80%

## Events Published

The service publishes the following events to RabbitMQ:

### user.created
```typescript
{
  eventId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

### user.updated
```typescript
{
  eventId: string;
  userId: string;
  changes: string[];  // Array of changed field names
  updatedAt: Date;
}
```

### user.deleted
```typescript
{
  eventId: string;
  userId: string;
  deletedAt: Date;
}
```

### user.preferences.updated
```typescript
{
  eventId: string;
  userId: string;
  preferences: object;
  updatedAt: Date;
}
```

## Performance

- **Response Time**: P95 < 200ms
- **Throughput**: 1000 req/sec
- **Availability**: 99.9%

### Caching Strategy

- **User profiles**: 5 minutes TTL
- **Search results**: 1 minute TTL
- **Preferences**: 10 minutes TTL

### Rate Limits

- **Default**: 100 requests/minute
- **Profile updates**: 20 requests/minute
- **Search**: 50 requests/minute
- **Avatar upload**: 10 requests/minute
- **Profile deletion**: 5 requests/minute

## Monitoring

### Metrics

The service exposes the following metrics:
- Request rate per endpoint
- Response time percentiles (P50, P95, P99)
- Error rate
- Cache hit/miss ratio
- Database query time

### Logging

Structured JSON logs with correlation IDs for distributed tracing.

## Security

- **Authentication**: JWT-based authentication via Auth Service
- **Authorization**: Users can only modify their own profiles
- **Input Validation**: All inputs validated using class-validator
- **Rate Limiting**: Per-endpoint rate limits to prevent abuse
- **CORS**: Configurable CORS policy
- **File Upload**: Strict file type and size validation
- **Soft Delete**: User data retained for 30 days after deletion

## Database Schema

### users table
- `id`: UUID (primary key)
- `email`: VARCHAR(255) (unique)
- `name`: VARCHAR(100)
- `avatar`: VARCHAR(500)
- `bio`: TEXT
- `location`: VARCHAR(100)
- `website`: VARCHAR(500)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ
- `deleted_at`: TIMESTAMPTZ

### user_preferences table
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key, unique)
- `notifications`: JSONB
- `privacy`: JSONB
- `display`: JSONB
- `updated_at`: TIMESTAMPTZ

## Architecture Decisions

### Why NestJS?
- Enterprise-grade TypeScript framework
- Built-in dependency injection
- Excellent testing support
- Extensive ecosystem

### Why Prisma?
- Type-safe database access
- Excellent TypeScript integration
- Automatic migrations
- Great developer experience

### Why Redis?
- High-performance caching
- Reduced database load
- Improved response times

### Why RabbitMQ?
- Reliable event delivery
- Decoupled microservices
- Event-driven architecture

## Troubleshooting

### Database connection issues
```bash
# Check database connectivity
npx prisma db pull

# Run migrations
npx prisma migrate deploy
```

### Redis connection issues
```bash
# Check Redis connectivity
redis-cli -h localhost -p 6379 ping
```

### Test failures
```bash
# Clear cache and re-run tests
nx reset
nx test user
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests (maintain 80%+ coverage)
4. Run linting: `nx lint user`
5. Run tests: `nx test user`
6. Submit a pull request

## License

MIT

## Support

For issues and questions, please create an issue in the ORION repository.
