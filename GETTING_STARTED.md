# Getting Started with ORION Platform

This guide will help you explore, test, and verify the implemented ORION microservices platform.

## 📋 Prerequisites

- Docker Desktop (for containerized services)
- Node.js 18+ and pnpm
- PostgreSQL (or use Docker)
- Redis (or use Docker)
- Git

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your local configuration:
- Database URLs for each service
- Redis connection details
- JWT secrets
- SendGrid API key (optional for notifications)
- Twilio credentials (optional for SMS)

### 3. Start Infrastructure Services

Using Docker Compose (recommended):

```bash
docker-compose up -d postgres redis rabbitmq
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- RabbitMQ on port 5672 (management UI on 15672)

### 4. Run Database Migrations

For each service with a Prisma schema:

```bash
# Auth Service
cd packages/auth
pnpm prisma migrate dev
pnpm prisma generate

# User Service
cd ../user
pnpm prisma migrate dev
pnpm prisma generate

# Back to root
cd ../..
```

## 🧪 Running Tests

### Run All Tests

```bash
# From root directory
pnpm test
```

### Run Tests for Specific Service

```bash
# Auth Service (121 tests, 97% coverage)
pnpm test auth

# User Service (36 tests, 91.91% coverage)
pnpm test user

# Gateway (53 tests, 84.4% coverage)
pnpm test gateway

# Notification Service (8 test suites)
pnpm test notifications
```

### Run Tests with Coverage

```bash
# All services with coverage report
pnpm test:coverage

# Specific service
pnpm test:coverage auth
```

Coverage reports will be generated in `coverage/packages/<service-name>/`.

### Watch Mode (for development)

```bash
pnpm test:watch auth
```

## 🏃 Running Services Locally

### Start Individual Services

Each service can be started in development mode:

```bash
# Auth Service (Port 3001)
cd packages/auth
pnpm dev

# User Service (Port 3002)
cd packages/user
pnpm dev

# Gateway (Port 3000)
cd packages/gateway
pnpm dev

# Notification Service (Port 3003)
cd packages/notifications
pnpm dev
```

### Using NX to Run Services

From the root directory:

```bash
# Start auth service
nx serve auth

# Start user service
nx serve user

# Start gateway
nx serve gateway

# Start all services in parallel
nx run-many --target=serve --projects=auth,user,gateway,notifications --parallel=4
```

## 🔍 Testing the APIs

### Using the Gateway (Recommended)

All services are accessible through the API Gateway at `http://localhost:3000`.

#### 1. Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T...",
  "services": {
    "auth": { "status": "up", "responseTime": 45 },
    "user": { "status": "up", "responseTime": 32 }
  }
}
```

#### 2. Register a User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "username": "testuser"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "username": "testuser"
  }
}
```

#### 3. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

#### 4. Access Protected Routes

```bash
# Get current user profile
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update user profile
curl -X PATCH http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### 5. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Direct Service Access

You can also test services directly (bypassing the gateway):

```bash
# Auth Service directly (Port 3001)
curl http://localhost:3001/api/health

# User Service directly (Port 3002)
curl http://localhost:3002/api/health
```

## 🐳 Docker Development

### Build Service Images

```bash
# Build auth service
docker build -f packages/auth/Dockerfile -t orion-auth:dev .

# Build user service
docker build -f packages/user/Dockerfile -t orion-user:dev .

# Build gateway
docker build -f packages/gateway/Dockerfile -t orion-gateway:dev .
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Monitoring and Observability

### RabbitMQ Management UI

Access at: http://localhost:15672
- Username: `guest`
- Password: `guest`

View:
- Message queues
- Exchange bindings
- Event flow between services

### Redis CLI

```bash
# Connect to Redis
redis-cli

# Check session data
KEYS session:*

# View user cache
KEYS user:*

# Monitor real-time commands
MONITOR
```

### Application Logs

Services use structured logging:

```bash
# View auth service logs
tail -f packages/auth/logs/app.log

# View combined gateway logs
tail -f packages/gateway/logs/combined.log

# View error logs only
tail -f packages/gateway/logs/error.log
```

## 🧩 Service Architecture Overview

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│        API Gateway (Port 3000)       │
│  - Rate Limiting                     │
│  - Circuit Breaker                   │
│  - Request/Response Logging          │
│  - Authentication Middleware         │
└─────────────┬───────────────────────┘
              │
       ┌──────┴──────┐
       ▼             ▼
┌─────────────┐ ┌──────────────┐
│Auth Service │ │User Service  │
│(Port 3001)  │ │(Port 3002)   │
└──────┬──────┘ └──────┬───────┘
       │               │
       └───────┬───────┘
               ▼
       ┌──────────────┐
       │  RabbitMQ    │ ◄─── Event-driven architecture
       │  (Port 5672) │
       └──────┬───────┘
              │
              ▼
       ┌──────────────────┐
       │Notification Svc  │
       │(Port 3003)       │
       └──────────────────┘
```

## 🔧 Troubleshooting

### Tests Failing

1. **Database connection errors:**
   ```bash
   # Ensure PostgreSQL is running
   docker-compose up -d postgres

   # Run migrations
   cd packages/auth && pnpm prisma migrate dev
   ```

2. **Redis connection errors:**
   ```bash
   # Start Redis
   docker-compose up -d redis
   ```

3. **Module resolution errors:**
   ```bash
   # Clear NX cache
   nx reset

   # Reinstall dependencies
   rm -rf node_modules
   pnpm install
   ```

### Service Won't Start

1. **Port already in use:**
   ```bash
   # Find process using port
   lsof -i :3001

   # Kill process
   kill -9 <PID>
   ```

2. **Environment variables missing:**
   - Check `.env` file exists
   - Verify all required variables are set
   - Compare with `.env.example`

3. **Prisma client not generated:**
   ```bash
   cd packages/auth
   pnpm prisma generate
   ```

## 📚 Next Steps

### Explore the Code

1. **Auth Service** (`packages/auth/src/`)
   - JWT-based authentication
   - Session management with Redis
   - Password hashing with bcrypt
   - Comprehensive test coverage (97%)

2. **User Service** (`packages/user/src/`)
   - CRUD operations
   - User preferences
   - Avatar management
   - Event publishing
   - Test coverage (91.91%)

3. **API Gateway** (`packages/gateway/src/`)
   - Request routing
   - Middleware stack
   - Circuit breaker pattern
   - Health aggregation
   - Test coverage (84.4%)

4. **Notification Service** (`packages/notifications/src/`)
   - SendGrid email integration
   - Twilio SMS integration
   - Event-driven notification processing
   - Template management

### Review Specifications

All service specifications are in `.claude/specs/`:

```bash
ls .claude/specs/
```

Key specs:
- `auth-service.md` - Authentication and session management
- `user-service.md` - User management and profiles
- `gateway-service.md` - API gateway configuration
- `notification-service.md` - Notification delivery
- `event-driven-architecture.md` - Inter-service communication

### Check Test Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML coverage report
open coverage/packages/auth/index.html
open coverage/packages/user/index.html
open coverage/packages/gateway/index.html
```

### Review What's Left

See `WHATS_LEFT.md` for:
- Remaining implementation tasks
- Test coverage improvements needed
- Infrastructure enhancements
- Timeline estimates

## 🤝 Development Workflow

### Making Changes

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test:**
   ```bash
   pnpm test
   pnpm lint
   ```

3. **Commit with conventional commits:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

4. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   gh pr create
   ```

### Code Quality

```bash
# Lint all code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check

# Run all quality checks
pnpm lint && pnpm type-check && pnpm test
```

## 📞 Support

For issues, questions, or contributions:
- Review `WHATS_LEFT.md` for known issues
- Check `.claude/specs/` for service specifications
- Review test files for usage examples
- See `README.md` for architecture overview

---

**Platform Status:** ~80% Complete
- ✅ Core services operational
- ✅ Authentication & authorization
- ✅ User management
- ✅ API Gateway with middleware
- ✅ Notification infrastructure
- 🔧 E2E tests needed
- 🔧 Additional service tests needed

See `WHATS_LEFT.md` for complete status and roadmap.
