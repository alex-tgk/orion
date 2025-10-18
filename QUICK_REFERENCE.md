# ORION Quick Reference Guide

Quick commands for common development tasks.

## 🚀 Start Services

```bash
# Start infrastructure (PostgreSQL, Redis, RabbitMQ)
docker-compose up -d postgres redis rabbitmq

# Start all microservices in parallel
nx run-many --target=serve --projects=auth,user,gateway,notifications --parallel=4

# Start individual service
nx serve auth        # Port 3001
nx serve user        # Port 3002
nx serve gateway     # Port 3000
nx serve notifications # Port 3003
```

## 🧪 Run Tests

```bash
# All tests
pnpm test

# Specific service
pnpm test auth        # 121 tests, 97% coverage ✅
pnpm test user        # 36 tests, 91.91% coverage ✅
pnpm test gateway     # 53 tests, 84.4% coverage ✅
pnpm test notifications # 8 test suites

# With coverage
pnpm test:coverage auth

# Watch mode
pnpm test:watch auth
```

## 🔧 Database Operations

```bash
# Run migrations
cd packages/auth && pnpm prisma migrate dev
cd packages/user && pnpm prisma migrate dev

# Generate Prisma client
pnpm prisma generate

# View database
pnpm prisma studio

# Reset database (CAREFUL!)
pnpm prisma migrate reset
```

## 📡 API Testing

### Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","username":"testuser"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

### Get User Profile
```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Health Check
```bash
curl http://localhost:3000/health
```

## 🐳 Docker Commands

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build
```

## 🔍 Debugging

```bash
# Check Redis
redis-cli
> KEYS session:*
> KEYS user:*

# RabbitMQ Management
# Open http://localhost:15672 (guest/guest)

# View service logs
tail -f packages/auth/logs/app.log
tail -f packages/gateway/logs/combined.log

# Check running services
lsof -i :3000  # Gateway
lsof -i :3001  # Auth
lsof -i :3002  # User
lsof -i :3003  # Notifications
```

## 🧹 Cleanup

```bash
# Clear NX cache
nx reset

# Remove node_modules
rm -rf node_modules packages/*/node_modules

# Reinstall
pnpm install

# Clear test coverage
rm -rf coverage

# Stop all Docker containers
docker-compose down -v  # -v removes volumes too
```

## 📊 Code Quality

```bash
# Lint
pnpm lint

# Format
pnpm format

# Type check
pnpm type-check

# All checks
pnpm lint && pnpm type-check && pnpm test
```

## 🏗️ Build

```bash
# Build all services
nx run-many --target=build --all

# Build specific service
nx build auth
nx build user
nx build gateway

# Production build
NODE_ENV=production nx build auth
```

## 📦 Service Ports

| Service       | Port | Path           |
|---------------|------|----------------|
| Gateway       | 3000 | /api/*         |
| Auth          | 3001 | /api/auth/*    |
| User          | 3002 | /api/users/*   |
| Notifications | 3003 | /api/notify/*  |
| PostgreSQL    | 5432 | -              |
| Redis         | 6379 | -              |
| RabbitMQ      | 5672 | -              |
| RabbitMQ UI   | 15672| http://localhost:15672 |

## 🗂️ Key Directories

```
orion/
├── packages/
│   ├── auth/              # Auth service (97% coverage)
│   ├── user/              # User service (91.91% coverage)
│   ├── gateway/           # API Gateway (84.4% coverage)
│   ├── notifications/     # Notification service
│   └── shared/            # Shared utilities
├── .claude/
│   ├── specs/             # Service specifications
│   └── agents/            # AI agent configurations
├── k8s/                   # Kubernetes manifests
├── charts/                # Helm charts
└── scripts/               # Utility scripts
```

## 📝 Common Files

- `GETTING_STARTED.md` - Detailed setup guide
- `WHATS_LEFT.md` - Remaining work tracker
- `README.md` - Architecture overview
- `.env.example` - Environment template
- `docker-compose.yml` - Local development stack
- `jest.preset.js` - Global test configuration

## 🎯 Test Coverage Status

| Service       | Tests | Coverage | Status |
|---------------|-------|----------|--------|
| Auth          | 121   | 97.0%    | ✅     |
| User          | 36    | 91.91%   | ✅     |
| Gateway       | 53    | 84.4%    | ✅     |
| Notifications | 8     | Pending  | 🔴     |

## 🚦 Service Status

✅ **Production Ready:**
- Auth Service
- User Service
- API Gateway

🟡 **Needs Work:**
- Notification Service (needs Prisma schema)
- Analytics Service (needs implementation)
- Storage Service (needs tests)
- Logger Service (needs tests)

See `WHATS_LEFT.md` for details.

## 🔐 Environment Variables

Required in `.env`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/orion_auth"
USER_DATABASE_URL="postgresql://user:pass@localhost:5432/orion_user"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# RabbitMQ
RABBITMQ_URL="amqp://localhost:5672"

# SendGrid (optional)
SENDGRID_API_KEY="your-key"
SENDGRID_FROM_EMAIL="noreply@orion.example"

# Twilio (optional)
TWILIO_ACCOUNT_SID="your-sid"
TWILIO_AUTH_TOKEN="your-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

## 💡 Tips

1. **Always start infrastructure first:**
   ```bash
   docker-compose up -d postgres redis rabbitmq
   ```

2. **Use watch mode during development:**
   ```bash
   pnpm test:watch auth
   ```

3. **Check health endpoints first:**
   ```bash
   curl http://localhost:3000/health
   ```

4. **View coverage reports in browser:**
   ```bash
   open coverage/packages/auth/index.html
   ```

5. **Use NX for efficient builds:**
   ```bash
   # Only rebuild what changed
   nx affected:build

   # Only test what changed
   nx affected:test
   ```

## 🆘 Quick Fixes

**Port in use:**
```bash
kill -9 $(lsof -ti:3001)
```

**Database connection error:**
```bash
docker-compose restart postgres
cd packages/auth && pnpm prisma migrate dev
```

**Module not found:**
```bash
nx reset
pnpm install
```

**Tests failing:**
```bash
docker-compose up -d postgres redis
pnpm test auth
```

---

For detailed information, see `GETTING_STARTED.md` or `WHATS_LEFT.md`.
