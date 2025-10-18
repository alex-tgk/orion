# Getting Started with ORION

This guide will help you set up your development environment and get started with the ORION microservices platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [First-Time Setup](#first-time-setup)
4. [Running the Project](#running-the-project)
5. [Verifying Installation](#verifying-installation)
6. [Common Issues](#common-issues)
7. [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Minimum Version | Recommended | Installation |
|----------|----------------|-------------|--------------|
| Node.js | 18.x | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| pnpm | 8.x | 10.15.1 | `npm install -g pnpm` |
| Git | 2.x | Latest | [git-scm.com](https://git-scm.com/) |
| Docker | 20.x | Latest | [docker.com](https://www.docker.com/) |
| Docker Compose | 2.x | Latest | Included with Docker Desktop |

### Optional but Recommended

- **PostgreSQL 14+** - For local database (can use Docker)
- **Redis 7+** - For caching (can use Docker)
- **VS Code** - Recommended editor with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript
  - Jest Runner
  - Docker
  - GitLens

### System Requirements

- **OS**: macOS, Linux, or Windows (WSL2 recommended)
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 10GB free space

## Environment Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/orion.git
cd orion

# Verify you're on the main branch
git branch
```

### 2. Install Node.js and pnpm

```bash
# Verify Node.js installation
node --version  # Should be 18.x or higher

# Install pnpm globally
npm install -g pnpm

# Verify pnpm installation
pnpm --version  # Should be 10.15.1 or higher
```

### 3. Configure Environment Variables

```bash
# Copy environment template
cp .env.template .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Important Environment Variables:**

```bash
# Node Environment
NODE_ENV=development

# Database
DATABASE_URL=postgresql://orion:orion@localhost:5432/orion_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (generate with: pnpm generate-secrets)
JWT_SECRET=your-generated-secret
JWT_REFRESH_SECRET=your-generated-refresh-secret

# Server Ports (default values)
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
GATEWAY_PORT=3000
ADMIN_UI_PORT=4000
```

### 4. Generate Secrets

```bash
# Generate secure JWT secrets
pnpm generate-secrets

# This will update your .env file with secure random strings
```

## First-Time Setup

### 1. Install Dependencies

```bash
# Install all project dependencies
pnpm install

# This may take a few minutes on first run
```

### 2. Set Up Git Hooks

```bash
# Install Husky hooks
pnpm prepare

# This sets up:
# - Pre-commit hook (runs linter and formatter)
# - Commit-msg hook (validates commit messages)
```

### 3. Start Infrastructure Services

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Verify services are running
docker compose ps
```

**Option B: Local Installation**

If you prefer to run PostgreSQL and Redis locally:

```bash
# PostgreSQL (macOS with Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Redis (macOS with Homebrew)
brew install redis
brew services start redis
```

### 4. Database Setup

```bash
# Run database migrations
cd packages/auth
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Return to root
cd ../..
```

### 5. Build the Project

```bash
# Build all packages
pnpm build:all

# This creates the dist/ directories for all services
```

## Running the Project

### Development Mode

**Start All Services:**

```bash
# Start all services in development mode
pnpm dev

# Services will be available at:
# - Gateway: http://localhost:3000
# - Auth Service: http://localhost:3001
# - User Service: http://localhost:3002
# - Admin UI: http://localhost:4000
```

**Start Specific Service:**

```bash
# Start only the auth service
pnpm dev:service auth

# Start only the gateway
pnpm dev:service gateway

# Start only affected services (based on git changes)
pnpm dev:affected
```

### Production-Like Mode

```bash
# Build and run with Docker Compose
docker compose up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Verifying Installation

### 1. Health Check

```bash
# Run system health check
pnpm health

# Expected output:
# ✓ Node.js version: 20.x.x
# ✓ pnpm version: 10.15.1
# ✓ Git configured
# ✓ Dependencies installed
# ✓ Database connected
# ✓ Redis connected
# ✓ All services buildable
```

### 2. Run Tests

```bash
# Run all tests
pnpm test:all

# All tests should pass
```

### 3. Test API Endpoints

```bash
# Test gateway health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# Test auth service health
curl http://localhost:3001/health

# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 4. Access Admin UI

Open your browser and navigate to:
- **Admin UI**: http://localhost:4000
- **API Documentation**: http://localhost:3000/api/docs

## Common Issues

### Issue: Port Already in Use

**Problem:** Error message: `Port 3000 is already in use`

**Solution:**
```bash
# Find process using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in .env
GATEWAY_PORT=3010
```

### Issue: Database Connection Failed

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Restart PostgreSQL
docker compose restart postgres

# Or if running locally
brew services restart postgresql@14

# Verify DATABASE_URL in .env is correct
```

### Issue: Redis Connection Failed

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Check if Redis is running
docker compose ps redis

# Restart Redis
docker compose restart redis

# Or if running locally
brew services restart redis
```

### Issue: Prisma Client Not Generated

**Problem:** `Error: @prisma/client did not initialize yet`

**Solution:**
```bash
# Generate Prisma client for each service
cd packages/auth
npx prisma generate

cd ../user
npx prisma generate

cd ../..
```

### Issue: pnpm install Fails

**Problem:** Dependency installation errors

**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install

# If still failing, try with legacy peer deps
pnpm install --legacy-peer-deps
```

### Issue: Build Errors

**Problem:** TypeScript compilation errors

**Solution:**
```bash
# Clean build cache
pnpm clean

# Rebuild
pnpm build:all

# If specific service fails
nx build <service-name> --verbose
```

### Issue: Tests Failing

**Problem:** Tests fail on first run

**Solution:**
```bash
# Ensure test environment is configured
cp .env.example .env.test

# Edit .env.test with test database settings
nano .env.test

# Run database migrations for test database
DATABASE_URL="postgresql://..." npx prisma migrate dev

# Run tests again
pnpm test:all
```

### Issue: Git Hooks Not Working

**Problem:** Pre-commit hooks not running

**Solution:**
```bash
# Reinstall Husky
rm -rf .husky
pnpm prepare

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

## Troubleshooting Tips

### Check System Status
```bash
# View Nx cache status
nx daemon --status

# Check project graph
pnpm deps:check

# Run diagnostics
pnpm diagnose
```

### View Logs
```bash
# View service logs (Docker)
docker compose logs -f <service-name>

# View all logs
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100
```

### Reset Everything
```bash
# Stop all services
docker compose down

# Clean everything
pnpm clean
rm -rf node_modules
rm -rf packages/*/node_modules

# Fresh start
pnpm install
pnpm build:all
docker compose up -d
```

## Next Steps

Now that you have ORION running, you can:

1. **Read the Development Workflow** - [development-workflow.md](./development-workflow.md)
2. **Review Coding Standards** - [coding-standards.md](./coding-standards.md)
3. **Explore the API** - Visit http://localhost:3000/api/docs
4. **Run the Tests** - Learn from existing test patterns
5. **Create Your First Feature** - Follow the workflow guide

### Recommended Learning Path

1. **Day 1-2**: Environment setup and exploration
   - Complete this getting started guide
   - Explore the codebase structure
   - Read existing service implementations

2. **Day 3-4**: Understanding the architecture
   - Review architecture documentation
   - Study service communication patterns
   - Understand the AI integration approach

3. **Day 5**: Write your first code
   - Fix a small bug or add a minor feature
   - Follow the development workflow
   - Submit your first PR

### Useful Commands Reference

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:service <name>     # Start specific service
pnpm dev:affected          # Start affected services

# Testing
pnpm test                   # Run affected tests
pnpm test:all              # Run all tests
pnpm test:coverage         # With coverage
pnpm test:e2e              # E2E tests
pnpm test:watch            # Watch mode

# Quality
pnpm lint                   # Lint code
pnpm lint:fix              # Auto-fix issues
pnpm format                # Format code
pnpm type-check            # Type check

# Build
pnpm build                  # Build affected
pnpm build:all             # Build all
pnpm build:prod            # Production build

# Database
pnpm migrate               # Run migrations
pnpm prisma:generate       # Generate client
pnpm prisma:studio         # Open Prisma Studio

# Documentation
pnpm docs:generate         # Generate docs
pnpm docs:serve            # Serve docs locally

# AI & Tools
pnpm ai:assist             # Get AI help
pnpm health                # Health check
pnpm diagnose              # Run diagnostics
pnpm reflect               # Daily reflection
```

## Getting Help

If you encounter issues not covered here:

1. Check the [Debugging Guide](./debugging.md)
2. Search existing GitHub Issues
3. Ask in team chat/discussions
4. Run `pnpm ai:assist` for AI-powered help
5. Create a new issue with full error details

## Welcome to ORION!

You're now ready to start developing on ORION. Remember:
- **Think first, code second**
- **Write specs before implementation**
- **Test everything**
- **Document as you go**

Happy coding!

---

**Need Help?** Run `pnpm health` or `pnpm diagnose` for automated diagnostics.
