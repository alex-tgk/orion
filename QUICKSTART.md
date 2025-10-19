# ORION Platform - Quick Start Guide

## 🚀 Start Everything and View the Dashboard

### Prerequisites

Before starting, ensure you have:
- **Docker** and **Docker Compose** installed
- **Node.js 20+** and **pnpm** installed
- At least **8GB RAM** available for Docker

### Option 1: Docker Compose (Recommended for Full Stack)

This starts all infrastructure services and backend microservices in containers.

```bash
# 1. Start all services with Docker Compose
docker-compose up -d

# 2. View logs
docker-compose logs -f

# 3. Check service health
docker-compose ps
```

**Services will be available at:**

| Service | URL | Description |
|---------|-----|-------------|
| **Admin Dashboard** | http://localhost:3004 | 🎯 Main admin UI with all features |
| Gateway API | http://localhost:3000 | API Gateway |
| Auth Service | http://localhost:3001 | Authentication & JWT |
| User Service | http://localhost:3002 | User management |
| Notifications | http://localhost:3003 | Email/Push notifications |
| AI Wrapper | http://localhost:3200 | AI CLI integrations |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |
| RabbitMQ | http://localhost:15672 | Message queue (admin UI) |
| Adminer | http://localhost:8080 | Database admin (if tools profile enabled) |

### Option 2: Local Development (Faster Iteration)

Use this for frontend/backend development without Docker overhead.

```bash
# 1. Start infrastructure only (PostgreSQL, Redis, RabbitMQ)
docker-compose up -d postgres redis rabbitmq

# 2. Install dependencies
pnpm install

# 3. Build shared packages
pnpm nx build shared
pnpm nx build logger
pnpm nx build config

# 4. Start backend services with NX
pnpm nx serve auth &          # Port 3001
pnpm nx serve user &           # Port 3002
pnpm nx serve notifications &  # Port 3003
pnpm nx serve gateway &        # Port 3000
pnpm nx serve ai-wrapper &     # Port 3200

# 5. Start admin dashboard backend API
cd packages/admin-ui
pnpm install
pnpm run serve:backend &       # Port 3004 (NestJS API)

# 6. Start admin dashboard frontend (in a new terminal)
cd packages/admin-ui
pnpm run dev                   # Port 5173 (Vite dev server)
```

**Dashboard will be available at:**
- Frontend Dev Server: http://localhost:5173
- Backend API: http://localhost:3004

### Option 3: PM2 Process Manager (Production-like)

Use this for running everything as managed Node.js processes.

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis rabbitmq

# 2. Build all services
pnpm build:all

# 3. Start all services with PM2
pm2 start ecosystem.config.js

# 4. Start AI services
pm2 start ecosystem.ai-services.config.js

# 5. View PM2 dashboard
pm2 monit

# 6. View logs
pm2 logs

# 7. Check status
pm2 status
```

## 📊 Admin Dashboard Features

Once the dashboard is running, you can access:

### 1. **Real-Time Log Viewer** (`/logs`)
- View logs from all services in real-time
- Filter by service, severity, time range
- Export logs to JSON/CSV
- Auto-scroll with 10k+ log virtual scrolling

### 2. **Service Monitoring** (`/services`)
- See all running services and their health
- CPU and memory usage charts
- Service uptime tracking
- Restart/reload controls

### 3. **PM2 Dashboard** (`/services`)
- Manage PM2 processes
- Start/stop/restart/reload operations
- Process logs and metrics
- Zero-downtime reloads

### 4. **AI Chat Interface** (`/ai-chat`)
🔥 **REAL AI - NO MOCKS!**
- Chat with 5 AI providers:
  - Claude (via `claude` CLI)
  - GitHub Copilot (via `gh` CLI)
  - Amazon Q (via `q` CLI)
  - Google Gemini (via `gemini` CLI)
  - OpenAI Codex (via OpenAI API)
- Switch providers dynamically
- Markdown rendering
- Syntax highlighting for code
- Chat history persistence

### 5. **Message Queue Viewer** (`/queues`)
- View RabbitMQ queues and stats
- Inspect messages
- Retry failed messages
- Purge queues
- Real-time queue metrics

### 6. **Feature Flags** (`/flags`)
- Toggle feature flags
- Rollout percentage controls
- A/B testing configuration
- Environment-specific flags
- Analytics for flag usage

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DB_USER=orion
DB_PASSWORD=orion_dev
DB_NAME=orion_dev
DB_PORT=5432

# Redis
REDIS_PORT=6379
REDIS_ENABLED=true

# RabbitMQ
RABBITMQ_USER=orion
RABBITMQ_PASSWORD=orion_dev
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672

# Services
GATEWAY_PORT=3000
AUTH_PORT=3001
USER_PORT=3002
NOTIFICATION_PORT=3003
AI_WRAPPER_PORT=3200
ADMIN_UI_PORT=3004

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AI CLI Paths (optional - auto-detected)
CLAUDE_CLI_PATH=/Users/acarroll/.local/bin/claude
COPILOT_CLI_PATH=/usr/local/bin/gh
AMAZONQ_CLI_PATH=/Users/acarroll/.local/bin/q
GEMINI_CLI_PATH=/usr/local/bin/gemini
CODEX_CLI_PATH=/usr/local/bin/codex

# AI Settings
AI_EXECUTION_TIMEOUT=120000
AI_MAX_PARALLEL_REQUESTS=5
AI_RETRY_ATTEMPTS=2
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600

# CORS
CORS_ORIGIN=http://localhost:4200

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Email (for notifications service)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@orion.dev
```

## 🧪 Testing the Setup

### 1. Health Checks

```bash
# Check all service health
curl http://localhost:3000/health  # Gateway
curl http://localhost:3001/api/auth/health  # Auth
curl http://localhost:3002/api/user/health  # User
curl http://localhost:3003/api/v1/health  # Notifications
curl http://localhost:3200/health  # AI Wrapper
curl http://localhost:3004/health  # Admin UI Backend
```

### 2. Test AI Chat

```bash
# Get available AI providers
curl http://localhost:3200/api/ai/providers

# Send a chat message to Claude
curl -X POST http://localhost:3200/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, Claude! Tell me about TypeScript.",
    "provider": "claude"
  }'
```

### 3. Test Authentication

```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

## 📚 Additional Resources

- **API Documentation**: Each service exposes Swagger docs at `/api/docs`
- **Architecture Docs**: See `docs/architecture/`
- **Deployment Guide**: See `docs/deployment/`
- **Testing Guide**: See `packages/admin-ui/TESTING_GUIDE.md`

## 🛑 Stopping Services

### Docker Compose
```bash
docker-compose down          # Stop and remove containers
docker-compose down -v       # Also remove volumes (clears data)
```

### PM2
```bash
pm2 stop all                 # Stop all processes
pm2 delete all               # Remove from PM2
```

### Local Development
```bash
# Kill all Node processes (careful!)
pkill -f "node"

# Or kill specific services
pkill -f "nx serve"
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3004
lsof -ti:3004 | xargs kill -9

# Or use different ports in .env
ADMIN_UI_PORT=3005
```

### Docker Build Fails
```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Errors
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### AI Chat Not Working
```bash
# Verify AI CLIs are installed
which claude
which gh
which gemini

# Check AI wrapper logs
docker-compose logs ai-wrapper
# or
pm2 logs ai-wrapper
```

## 🎯 Quick Access URLs (After Starting)

Open these in your browser:

1. **Admin Dashboard**: http://localhost:3004
2. **RabbitMQ Admin**: http://localhost:15672 (guest/guest)
3. **Database Admin**: http://localhost:8080 (with tools profile)

---

**🤖 Built with Claude Code**

For more information, see the full documentation in `/docs`.
