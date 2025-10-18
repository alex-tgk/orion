# ORION Platform - Architecture Overview

**Version:** 1.0.0
**Last Updated:** 2025-10-18

---

## System Architecture

ORION is built as a distributed microservices platform with the following key characteristics:

- **Event-Driven Architecture**: Asynchronous communication via message queues
- **API Gateway Pattern**: Single entry point for all client requests
- **Service Mesh**: Independent, loosely-coupled services
- **Shared Nothing**: Each service has its own database/schema
- **Observable**: Comprehensive monitoring and logging

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Clients                                 │
│                    (Web, Mobile, CLI)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (Port 3000)                     │
│  ┌──────────┬──────────┬──────────┬──────────┬────────────┐   │
│  │   CORS   │  Logging │   Rate   │   Auth   │   Error    │   │
│  │          │          │  Limiting│ Validate │  Handling  │   │
│  └──────────┴──────────┴──────────┴──────────┴────────────┘   │
└───┬─────────────┬─────────────┬──────────────┬────────────────┘
    │             │             │              │
    ▼             ▼             ▼              ▼
┌────────┐  ┌──────────┐  ┌─────────┐   ┌──────────────┐
│  Auth  │  │   User   │  │  Notif  │   │   Admin UI   │
│Service │  │ Service  │  │ Service │   │   Service    │
│:3001   │  │  :3002   │  │  :3003  │   │    :3004     │
└───┬────┘  └────┬─────┘  └────┬────┘   └──────┬───────┘
    │            │             │               │
    ▼            ▼             ▼               ▼
┌─────────────────────────────────────────────────────┐
│                 Infrastructure Layer                 │
│  ┌──────────┬──────────┬──────────┬──────────────┐ │
│  │PostgreSQL│  Redis   │ RabbitMQ │   Monitoring │ │
│  │  :5432   │  :6379   │  :5672   │   (Grafana)  │ │
│  └──────────┴──────────┴──────────┴──────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. API Gateway (Port 3000)

**Purpose**: Single entry point, request routing, cross-cutting concerns

**Responsibilities**:
- Route requests to appropriate services
- Authentication middleware
- Rate limiting
- CORS handling
- Request/response logging
- Error handling and transformation
- Health check aggregation

**Technology**:
- NestJS with HTTP proxy
- Redis for rate limiting
- JWT validation cache

**Key Files**:
- `packages/gateway/src/app/app.controller.ts`
- `packages/gateway/src/app/middleware/`
- `packages/gateway/src/app/filters/`

---

### 2. Auth Service (Port 3001)

**Purpose**: Authentication and authorization

**Responsibilities**:
- User registration and login
- JWT token generation and validation
- Password hashing and verification
- Session management
- Password reset flow
- Security audit logging

**Technology**:
- NestJS
- PostgreSQL (via Prisma)
- bcrypt for password hashing
- JWT for tokens
- Redis for session storage

**Database**:
```sql
-- Users table
users (id, email, password_hash, created_at, updated_at)

-- Sessions table
sessions (id, user_id, token_hash, expires_at, ip_address)

-- Audit logs
auth_audit_logs (id, user_id, action, ip_address, timestamp)
```

**Key Files**:
- `packages/auth/src/app/auth.controller.ts`
- `packages/auth/src/app/services/auth.service.ts`
- `packages/auth/src/app/services/session.service.ts`

---

### 3. User Service (Port 3002)

**Purpose**: User profile and preferences management

**Responsibilities**:
- User profile CRUD operations
- User preferences management
- Avatar/file uploads
- User search and filtering
- User activity tracking

**Technology**:
- NestJS
- PostgreSQL (via Prisma)
- RabbitMQ for events

**Database**:
```sql
-- User profiles
user_profiles (id, user_id, first_name, last_name, avatar_url, bio)

-- User preferences
user_preferences (id, user_id, key, value, type)

-- User activity
user_activity (id, user_id, action, metadata, timestamp)
```

**Key Files**:
- `packages/user/src/app/controllers/user.controller.ts`
- `packages/user/src/app/services/user.service.ts`

---

### 4. Notification Service (Port 3003)

**Purpose**: Multi-channel notification delivery

**Responsibilities**:
- Email notifications
- Push notifications
- In-app notifications
- Notification preferences
- Notification history
- Template management

**Technology**:
- NestJS
- PostgreSQL (via Prisma)
- Bull queue for async processing
- Redis for job queue
- RabbitMQ for event consumption

**Database**:
```sql
-- Notifications
notifications (id, user_id, type, channel, status, sent_at)

-- Notification templates
notification_templates (id, name, type, channel, template)

-- Notification preferences
notification_preferences (id, user_id, type, enabled)
```

**Key Files**:
- `packages/notifications/src/app/services/notification.service.ts`
- `packages/notifications/src/app/consumers/notification.consumer.ts`

---

### 5. Admin UI Service (Port 3004)

**Purpose**: Administrative dashboard and monitoring

**Responsibilities**:
- Service health monitoring
- User management
- System metrics dashboard
- Configuration management
- Audit log viewing

**Technology**:
- NestJS (Backend)
- React 19 (Frontend)
- WebSockets for real-time updates
- TanStack Query for data fetching

**Key Files**:
- `packages/admin-ui/src/app/controllers/`
- `packages/admin-ui/src/frontend/`

---

## Supporting Services

### Analytics Service (Port 3005)
- Event tracking
- Usage analytics
- Performance metrics
- Reporting

### Search Service (Port 3006)
- Full-text search
- Indexed search capabilities
- Search optimization

### Storage Service (Port 3007)
- File upload/download
- Cloud storage integration
- CDN integration

### Webhooks Service (Port 3008)
- Outbound webhook delivery
- Retry logic
- Webhook security

---

## Infrastructure Components

### PostgreSQL
- **Purpose**: Primary data store
- **Port**: 5432
- **Schema**: Database per service pattern
- **Connection Pooling**: Prisma connection pooling

### Redis
- **Purpose**: Caching, session storage, rate limiting
- **Port**: 6379
- **Use Cases**:
  - JWT token cache
  - Rate limit counters
  - Session data
  - Job queue (Bull)

### RabbitMQ
- **Purpose**: Message broker for async communication
- **Ports**: 5672 (AMQP), 15672 (Management UI)
- **Exchanges**:
  - `user.events` - User-related events
  - `auth.events` - Authentication events
  - `notification.events` - Notification triggers

---

## Communication Patterns

### Synchronous (HTTP/REST)
- Client → Gateway → Service
- Service → Service (limited, prefer async)

### Asynchronous (Message Queue)
- Service → RabbitMQ → Service
- Event-driven architecture
- Eventual consistency

**Example Event Flow**:
```
1. User registers
   Auth Service → Publishes "user.registered" event

2. User Service consumes event
   User Service → Creates user profile

3. Notification Service consumes event
   Notification Service → Sends welcome email

4. Analytics Service consumes event
   Analytics Service → Tracks registration metric
```

---

## Data Flow Examples

### User Registration Flow

```
1. POST /api/v1/auth/register
   Client → Gateway

2. Gateway validates and forwards
   Gateway → Auth Service

3. Auth Service processes
   - Validate input
   - Hash password
   - Create user record
   - Generate JWT token
   - Publish "user.registered" event

4. Event consumers react
   - User Service creates profile
   - Notification Service sends welcome email
   - Analytics Service tracks event

5. Response returned
   Auth Service → Gateway → Client
```

### Authentication Flow

```
1. POST /api/v1/auth/login
   Client → Gateway

2. Gateway forwards to Auth
   Gateway → Auth Service

3. Auth Service validates
   - Find user by email
   - Verify password hash
   - Generate JWT tokens (access + refresh)
   - Create session record
   - Cache token in Redis

4. Response with tokens
   Auth Service → Gateway → Client

5. Subsequent requests
   Client sends JWT in header
   Gateway validates (cache hit) → Service
```

---

## Security Architecture

### Authentication Layer
- JWT-based authentication
- Access tokens (1 hour expiry)
- Refresh tokens (7 day expiry)
- Token rotation on refresh

### Authorization Layer
- Role-based access control (RBAC)
- Permission-based authorization
- Resource-level permissions

### Network Security
- HTTPS only in production
- CORS restricted origins
- Rate limiting per IP/user
- Request size limits

### Data Security
- Passwords hashed with bcrypt (10 rounds)
- Sensitive data encrypted at rest
- PII data access logged
- Regular security audits

---

## Monitoring & Observability

### Health Checks
- Liveness probes (is service running?)
- Readiness probes (can service handle traffic?)
- Dependency health checks

### Metrics
- Request rate and latency
- Error rates
- Resource usage (CPU, memory)
- Database connection pool status
- Queue depth and processing time

### Logging
- Structured JSON logging
- Correlation IDs for request tracing
- Log levels (debug, info, warn, error)
- Centralized log aggregation

### Tracing
- Distributed tracing with correlation IDs
- Request flow visualization
- Performance bottleneck identification

---

## Scalability Considerations

### Horizontal Scaling
- Stateless services (scale easily)
- Load balancing across instances
- Database connection pooling
- Redis cluster for high availability

### Caching Strategy
- Redis for frequently accessed data
- HTTP response caching
- Query result caching
- CDN for static assets

### Database Optimization
- Indexed queries
- Read replicas for scaling reads
- Connection pooling
- Query optimization

### Queue Management
- Bull queue for async processing
- Separate queues per priority
- Dead letter queues for failed jobs
- Queue monitoring and alerting

---

## Deployment Architecture

### Development
```
Local machine
├── Docker Compose
│   ├── All services in containers
│   ├── PostgreSQL
│   ├── Redis
│   └── RabbitMQ
└── Hot reload enabled
```

### Staging
```
Cloud infrastructure (AWS/GCP/Azure)
├── Kubernetes cluster
│   ├── Service pods (3 replicas each)
│   ├── Managed PostgreSQL (RDS)
│   ├── Managed Redis (ElastiCache)
│   └── Managed message queue
└── Load balancer
```

### Production
```
Cloud infrastructure (Multi-region)
├── Kubernetes cluster (per region)
│   ├── Service pods (5-10 replicas, auto-scaling)
│   ├── Database (Primary + Read replicas)
│   ├── Redis cluster
│   └── Message queue cluster
├── CDN for static assets
├── WAF (Web Application Firewall)
└── DDoS protection
```

---

## Technology Stack Summary

| Layer | Technologies |
|-------|-------------|
| **Backend** | NestJS, TypeScript, Node.js 20 |
| **Frontend** | React 19, TypeScript, TanStack Query |
| **Database** | PostgreSQL 15, Prisma ORM |
| **Cache** | Redis 7 |
| **Message Queue** | RabbitMQ 3.12 |
| **Testing** | Jest, Supertest |
| **Build** | Nx, TypeScript Compiler |
| **Container** | Docker, Docker Compose |
| **Orchestration** | Kubernetes (production) |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Prometheus, Grafana (planned) |

---

## Design Principles

1. **Microservices**: Each service has a single responsibility
2. **API First**: Well-defined APIs between services
3. **Event-Driven**: Async communication where possible
4. **Immutable Infrastructure**: Containers, not servers
5. **Observable**: Comprehensive logging and monitoring
6. **Resilient**: Circuit breakers, retries, fallbacks
7. **Secure**: Security at every layer
8. **Testable**: High test coverage, automated testing
9. **Scalable**: Horizontal scaling capability
10. **Maintainable**: Clean code, comprehensive documentation

---

## Next Steps

1. ✅ Understand architecture
2. → Review specific services in detail
3. → Study authentication flow
4. → Explore database schema
5. → Learn deployment process

**Related Documentation**:
- [Setup Guide](./setup-development-environment.md)
- [Coding Standards](./coding-standards.md)
- [API Documentation](../api/README.md)

---

**Last Updated:** 2025-10-18
**Owner:** Architecture Team
