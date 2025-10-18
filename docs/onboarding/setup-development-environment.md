# Development Environment Setup Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-18

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or later)
- **pnpm** (v10.15.1 or later)
- **Docker** (v24 or later)
- **Docker Compose** (v2 or later)
- **Git** (v2.40 or later)
- **VS Code** (recommended) or your preferred IDE

---

## Step 1: Install Required Tools

### macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install pnpm
npm install -g pnpm@10.15.1

# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop
open /Applications/Docker.app
```

### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@10.15.1

# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER
```

### Windows

```powershell
# Install Chocolatey (if not already installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs-lts

# Install pnpm
npm install -g pnpm@10.15.1

# Install Docker Desktop
choco install docker-desktop
```

---

## Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/orion.git
cd orion

# Configure git
git config user.name "Your Name"
git config user.email "your.email@company.com"
```

---

## Step 3: Install Dependencies

```bash
# Install all project dependencies
pnpm install

# Verify installation
pnpm list --depth=0
```

**Expected output**: No errors, all packages installed successfully.

---

## Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your local settings
nano .env  # or use your preferred editor
```

**Key environment variables:**

```bash
# Database
DATABASE_URL="postgresql://orion:orion@localhost:5432/orion"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=3600

# Services
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
NOTIFICATION_SERVICE_URL=http://localhost:3003
```

---

## Step 5: Start Infrastructure Services

```bash
# Start Docker containers
docker compose up -d

# Verify containers are running
docker compose ps
```

**Expected output:**
```
NAME                STATUS              PORTS
postgres            Up 30 seconds       0.0.0.0:5432->5432/tcp
redis               Up 30 seconds       0.0.0.0:6379->6379/tcp
rabbitmq            Up 30 seconds       0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
```

---

## Step 6: Setup Database

```bash
# Run database migrations
npm run prisma:migrate

# Seed database with initial data
npm run prisma:seed

# Verify database connection
docker compose exec postgres psql -U orion -c "SELECT version();"
```

---

## Step 7: Build Services

```bash
# Build all services
npm run build:all

# Or build specific service
npm run build:auth
```

---

## Step 8: Start Development Servers

### Option 1: All Services

```bash
# Start all services in development mode
npm run dev
```

### Option 2: Specific Service

```bash
# Start specific service
npm run dev:service -- auth

# Or directly with Nx
nx serve auth
```

### Option 3: Affected Services Only

```bash
# Start only services affected by your changes
npm run dev:affected
```

---

## Step 9: Verify Installation

### Run Health Checks

```bash
# Check all services health
npm run health

# Expected output:
# ✓ Auth Service (http://localhost:3001) - healthy
# ✓ User Service (http://localhost:3002) - healthy
# ✓ Gateway (http://localhost:3000) - healthy
```

### Run Tests

```bash
# Run all tests
npm run test

# Run specific service tests
nx test auth

# Run with coverage
npm run test:coverage
```

### Access Services

```bash
# Gateway API
curl http://localhost:3000/health

# Auth Service
curl http://localhost:3001/health

# User Service
curl http://localhost:3002/health

# API Documentation
open http://localhost:3000/api/docs
```

---

## Step 10: IDE Setup (VS Code)

### Install Recommended Extensions

```bash
# Install VS Code extensions
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension nrwl.angular-console
code --install-extension prisma.prisma
code --install-extension ms-vscode.vscode-typescript-next
```

### Configure Workspace Settings

VS Code will automatically use `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.workingDirectories": ["packages/*"]
}
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 [PID]

# Or change port in .env
PORT=3010
```

### Issue: Docker Container Won't Start

```bash
# Check Docker logs
docker compose logs [service-name]

# Restart Docker
docker compose restart

# Nuclear option: Remove and recreate
docker compose down
docker volume prune
docker compose up -d
```

### Issue: Database Connection Fails

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check database credentials
docker compose exec postgres psql -U orion -d orion -c "SELECT 1;"

# Reset database
docker compose down
docker volume rm orion_postgres_data
docker compose up -d
npm run prisma:migrate
```

### Issue: pnpm Install Fails

```bash
# Clear pnpm cache
pnpm store prune

# Delete lock file and node_modules
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

### Issue: Tests Failing

```bash
# Clear Jest cache
npm run test -- --clearCache

# Run tests in band (one at a time)
npm run test -- --runInBand

# Check for port conflicts
lsof -i :3000-3010
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
pnpm install

# 3. Start services
npm run dev

# 4. Make changes and test
# ...

# 5. Run tests before committing
npm run test

# 6. Commit changes
git add .
git commit -m "feat: your feature description"
```

### Creating a Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Make changes
# ...

# Commit changes
git add .
git commit -m "feat: implement feature"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

---

## Useful Commands Reference

```bash
# Development
npm run dev                    # Start all services
npm run dev:service -- auth    # Start specific service
npm run dev:affected           # Start affected services only

# Building
npm run build                  # Build affected services
npm run build:all              # Build all services
npm run build:auth             # Build specific service

# Testing
npm run test                   # Run all tests
npm run test:all               # Run all tests (no cache)
npm run test:coverage          # Run with coverage
npm run test:e2e               # Run E2E tests

# Code Quality
npm run lint                   # Lint code
npm run lint:fix               # Fix lint issues
npm run format                 # Format code
npm run type-check             # Check TypeScript types

# Database
npm run prisma:migrate         # Run migrations
npm run prisma:seed            # Seed database
npm run prisma:studio          # Open Prisma Studio

# Docker
docker compose up -d           # Start containers
docker compose down            # Stop containers
docker compose logs -f         # View logs
docker compose ps              # List containers

# Utilities
npm run health                 # Check service health
npm run metrics                # View metrics
npm run diagnose               # Run diagnostics
```

---

## Next Steps

1. ✅ Environment setup complete
2. ✅ All services running
3. ✅ Tests passing
4. → Read [Architecture Overview](./architecture-overview.md)
5. → Review [Coding Standards](./coding-standards.md)
6. → Start [Onboarding Guide](./ONBOARDING.md)

---

**Need Help?**
- Slack: #engineering-orion
- Email: engineering@company.com
- Documentation: docs/

---

**Last Updated:** 2025-10-18
**Owner:** Engineering Team
