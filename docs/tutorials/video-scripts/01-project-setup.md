# Tutorial 01: Setting Up ORION Development Environment

**Duration**: 15 minutes
**Level**: Beginner
**Prerequisites**: None (complete beginner friendly)

## Learning Objectives

By the end of this tutorial, you will be able to:
- Install all required prerequisites for ORION development
- Clone and configure the ORION repository
- Set up environment variables and configuration
- Start your first ORION service
- Verify your installation is working correctly

## Prerequisites

### Required Knowledge
- Basic command line navigation
- Basic understanding of Git
- Familiarity with terminal/command prompt

### System Requirements
- **Operating System**: macOS, Linux, or Windows (with WSL2)
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 5GB free
- **Internet**: Stable connection for downloads

## Tutorial Outline

### Part 1: Introduction (2 minutes)
### Part 2: Installing Prerequisites (5 minutes)
### Part 3: Cloning and Configuration (4 minutes)
### Part 4: First Service Startup (3 minutes)
### Part 5: Verification and Next Steps (1 minute)

---

## Detailed Script

### Part 1: Introduction (2 minutes)

**[SCREEN: ORION Logo/Landing Page]**

**NARRATOR**: Welcome to ORION - an intelligent microservices platform. In this tutorial, we'll set up your complete development environment from scratch. By the end, you'll have ORION running locally and be ready to start building microservices.

**[SCREEN: Show overview slide with what we'll install]**

**NARRATOR**: Here's what we'll be installing today:
- Node.js version 18 or higher
- pnpm package manager version 8 or higher
- Git for version control
- Docker Desktop for containerization
- And of course, the ORION platform itself

Let's get started!

---

### Part 2: Installing Prerequisites (5 minutes)

**[SCREEN: Terminal window]**

**NARRATOR**: First, let's check if you already have any of these tools installed.

**TYPE:**
```bash
node --version
pnpm --version
git --version
docker --version
```

**EXPECTED OUTPUT:**
```
node --version
# v18.17.0 or higher

pnpm --version
# 8.15.0 or higher

git --version
# git version 2.40.0 or higher

docker --version
# Docker version 24.0.0 or higher
```

**NARRATOR**: If any of these commands return "command not found" or show a version lower than required, we'll install them now.

#### Installing Node.js

**[SCREEN: Browser showing nodejs.org]**

**NARRATOR**: For Node.js, visit nodejs.org and download the LTS version. Alternatively, I recommend using a version manager like nvm.

**TYPE:**
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Close and reopen terminal, then install Node.js
nvm install --lts
nvm use --lts

# Verify installation
node --version
```

**EXPECTED OUTPUT:**
```
v18.17.0
```

**PAUSE**: Wait for installation to complete (this may take 1-2 minutes)

#### Installing pnpm

**NARRATOR**: Next, let's install pnpm, which is faster and more efficient than npm.

**TYPE:**
```bash
npm install -g pnpm

# Verify installation
pnpm --version
```

**EXPECTED OUTPUT:**
```
8.15.0
```

#### Installing Docker

**[SCREEN: Browser showing docker.com]**

**NARRATOR**: Visit docker.com/get-started and download Docker Desktop for your operating system.

**[SCREEN: Show Docker Desktop installer]**

**NARRATOR**: Run the installer and follow the prompts. After installation, start Docker Desktop.

**[SCREEN: Docker Desktop running]**

**TYPE:**
```bash
# Verify Docker is running
docker --version
docker ps
```

**EXPECTED OUTPUT:**
```
Docker version 24.0.0, build 1234567
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

**NARRATOR**: Perfect! All prerequisites are now installed.

---

### Part 3: Cloning and Configuration (4 minutes)

**[SCREEN: Terminal window]**

**NARRATOR**: Now let's clone the ORION repository and set up our configuration.

#### Clone the Repository

**TYPE:**
```bash
# Navigate to your projects directory
cd ~/projects

# Clone the repository
git clone https://github.com/your-org/orion.git

# Navigate into the project
cd orion

# Check the project structure
ls -la
```

**EXPECTED OUTPUT:**
```
drwxr-xr-x  .claude/
drwxr-xr-x  packages/
-rw-r--r--  package.json
-rw-r--r--  pnpm-workspace.yaml
-rw-r--r--  README.md
...
```

**NARRATOR**: Great! Now let's install all dependencies.

#### Install Dependencies

**TYPE:**
```bash
# Install all project dependencies
pnpm install
```

**EXPECTED OUTPUT:**
```
Packages: +2847
+++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 2847, reused 2500, downloaded 347, added 2847, done
```

**PAUSE**: This will take 2-3 minutes depending on your internet connection.

**NARRATOR**: While that's installing, let me explain what's happening. ORION uses pnpm workspaces to manage multiple microservices in a monorepo. We're installing dependencies for all services at once.

#### Configure Environment Variables

**[SCREEN: Show .env.example file]**

**NARRATOR**: Next, let's set up our environment variables.

**TYPE:**
```bash
# Copy the example environment file
cp .env.example .env

# Generate secure secrets
pnpm generate-secrets
```

**EXPECTED OUTPUT:**
```
Generating secure secrets...
✓ JWT_SECRET generated
✓ JWT_REFRESH_SECRET generated
✓ ENCRYPTION_KEY generated
✓ Secrets saved to .env
```

**NARRATOR**: The generate-secrets command creates cryptographically secure keys for authentication and encryption.

**[SCREEN: Open .env file in editor]**

**TYPE:**
```bash
# Open .env in your editor
code .env
# or: nano .env
```

**NARRATOR**: Review these key variables:
- `NODE_ENV`: Set to 'development' for local work
- `DATABASE_URL`: Points to your local PostgreSQL
- `REDIS_URL`: Points to your local Redis instance
- JWT secrets were auto-generated

**[SCREEN: Close .env file]**

---

### Part 4: First Service Startup (3 minutes)

**[SCREEN: Terminal window]**

**NARRATOR**: Let's start our first service - the authentication service!

#### Start Docker Services

**TYPE:**
```bash
# Start PostgreSQL and Redis using Docker Compose
docker compose up -d
```

**EXPECTED OUTPUT:**
```
[+] Running 3/3
 ✔ Network orion_default      Created
 ✔ Container orion-postgres-1  Started
 ✔ Container orion-redis-1     Started
```

**NARRATOR**: This starts PostgreSQL and Redis in Docker containers.

#### Run Database Migrations

**TYPE:**
```bash
# Navigate to the auth service
cd packages/auth

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

**EXPECTED OUTPUT:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "orion_auth"

Applying migration `20240101000000_init`
✓ Generated Prisma Client
```

**NARRATOR**: Great! Our database schema is now created.

#### Start the Auth Service

**TYPE:**
```bash
# Return to root directory
cd ../..

# Start the auth service
pnpm dev:service auth
```

**EXPECTED OUTPUT:**
```
> orion@1.0.0 dev:service
> nx serve auth

Debugger listening on ws://127.0.0.1:9229
For help, see: https://nodejs.org/en/docs/inspector

[Nest] 12345  - 10/18/2025, 2:30:45 PM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 10/18/2025, 2:30:45 PM     LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - 10/18/2025, 2:30:45 PM     LOG [RoutesResolver] AppController {/}:
[Nest] 12345  - 10/18/2025, 2:30:45 PM     LOG [RouterExplorer] Mapped {/, GET} route
[Nest] 12345  - 10/18/2025, 2:30:45 PM     LOG [NestApplication] Nest application successfully started
[Nest] 12345  - 10/18/2025, 2:30:45 PM     LOG Application listening on port 3001
```

**NARRATOR**: Excellent! Our auth service is now running on port 3001.

---

### Part 5: Verification and Next Steps (1 minute)

**[SCREEN: Split screen - Terminal and Browser]**

**NARRATOR**: Let's verify everything is working.

#### Test the Service

**TYPE:**
```bash
# In a new terminal, test the health endpoint
curl http://localhost:3001/health
```

**EXPECTED OUTPUT:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

**[SCREEN: Browser showing http://localhost:3001/api]**

**NARRATOR**: You can also visit the Swagger documentation at http://localhost:3001/api

**[SCREEN: Swagger UI]**

**NARRATOR**: Here you'll see all available API endpoints with interactive documentation.

#### Run Health Check

**TYPE:**
```bash
# Run the system health check
pnpm health
```

**EXPECTED OUTPUT:**
```
System Health Check
==================
✓ Node.js version: 18.17.0
✓ pnpm version: 8.15.0
✓ Docker running: Yes
✓ PostgreSQL connection: OK
✓ Redis connection: OK
✓ Auth service: Running (port 3001)

All systems operational!
```

**NARRATOR**: Perfect! Everything is working correctly.

---

## Common Pitfalls

### Issue 1: Port Already in Use

**SYMPTOM:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**SOLUTION:**
```bash
# Find process using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change the port in .env
PORT=3002
```

### Issue 2: Docker Not Running

**SYMPTOM:**
```
Error: Cannot connect to the Docker daemon
```

**SOLUTION:**
1. Open Docker Desktop
2. Wait for it to start completely
3. Verify with `docker ps`
4. Retry your command

### Issue 3: Prisma Migration Fails

**SYMPTOM:**
```
Error: P1001: Can't reach database server
```

**SOLUTION:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
docker compose up -d

# Retry migration
npx prisma migrate dev
```

### Issue 4: Permission Errors on macOS/Linux

**SYMPTOM:**
```
Error: EACCES: permission denied
```

**SOLUTION:**
```bash
# Don't use sudo! Instead, fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH=~/.npm-global/bin:$PATH

# Reload shell and reinstall pnpm
source ~/.bashrc  # or ~/.zshrc
npm install -g pnpm
```

### Issue 5: Module Not Found Errors

**SYMPTOM:**
```
Error: Cannot find module '@nestjs/core'
```

**SOLUTION:**
```bash
# Clean install
rm -rf node_modules
rm -rf packages/*/node_modules
rm pnpm-lock.yaml

# Reinstall
pnpm install
```

---

## Summary Checklist

By now, you should have:
- ✓ Node.js 18+ installed
- ✓ pnpm 8+ installed
- ✓ Docker Desktop running
- ✓ ORION repository cloned
- ✓ Dependencies installed
- ✓ Environment variables configured
- ✓ Database and Redis running
- ✓ Auth service started successfully
- ✓ Health checks passing

---

## Next Steps

### Immediate Next Steps
1. **Explore the codebase**: Take a look at `packages/auth/src`
2. **Read the architecture docs**: Check out `/docs/architecture/OVERVIEW.md`
3. **Try the API**: Use the Swagger UI to test endpoints

### Next Tutorial
**Tutorial 02: Creating a New Service**
- Learn how to scaffold a new microservice
- Implement your first custom business logic
- Write and run tests

### Additional Resources
- [Developer Guide](/docs/guides/DEVELOPER_GUIDE.md)
- [Architecture Overview](/docs/architecture/OVERVIEW.md)
- [Troubleshooting Guide](/docs/onboarding/troubleshooting-guide.md)
- [Coding Standards](/docs/onboarding/coding-standards.md)

---

## Commands Reference

### Installation
```bash
# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts

# Install pnpm
npm install -g pnpm

# Clone repository
git clone https://github.com/your-org/orion.git
cd orion
pnpm install
```

### Configuration
```bash
# Setup environment
cp .env.example .env
pnpm generate-secrets

# Start Docker services
docker compose up -d

# Run migrations
cd packages/auth
npx prisma migrate dev
npx prisma generate
```

### Starting Services
```bash
# Start auth service
pnpm dev:service auth

# Start all services
pnpm dev

# Run health check
pnpm health
```

### Verification
```bash
# Test health endpoint
curl http://localhost:3001/health

# View Swagger docs
open http://localhost:3001/api

# Check running containers
docker ps
```

---

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Port in use | `lsof -i :3001` then `kill -9 <PID>` |
| Docker not running | Open Docker Desktop and wait |
| Database connection failed | `docker compose up -d` |
| Module not found | `pnpm install` |
| Permission denied | Fix npm permissions (see Issue 4) |
| Prisma errors | `npx prisma generate` |

---

## Video Production Notes

### Camera Angles
- **Main screen**: Full terminal window with clear, readable font (14pt+)
- **Picture-in-picture**: Instructor face for introduction and explanations
- **Browser shots**: Full browser window when showing Swagger UI

### Pacing
- Allow 3-5 seconds after each command for output to appear
- Pause 2 seconds before moving to next section
- Highlight important output with annotations

### Visual Aids
- Use colored arrows to point to important terminal output
- Highlight key environment variables in editor
- Show progress indicators during long-running commands

### Callouts
- Display warning boxes for common pitfalls
- Use checkmarks for completed steps
- Show keyboard shortcuts being used

---

**Script Version**: 1.0
**Last Updated**: October 2025
**Estimated Recording Time**: 20 minutes (15 min tutorial + 5 min buffer)
