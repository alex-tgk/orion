# PM2 Setup Guide for ORION

## Current Status

PM2 is configured to run the following services:
- ✅ **admin-ui** - Admin dashboard (port 3000) - WORKING
- ✅ **document-intelligence** - Document demo (port 3001) - WORKING

Backend services (auth, gateway, ai-wrapper) should be run with `pnpm nx serve` instead:
- **auth** - `pnpm nx serve auth` (requires PostgreSQL + Redis)
- **gateway** - `pnpm nx serve gateway`
- **ai-wrapper** - `pnpm nx serve ai-wrapper` (requires build first)

## Quick Start

### Start Frontend Apps with PM2

```bash
# Start PM2 with current configuration
pm2 start ecosystem.config.js

# View status
pm2 list

# View logs
pm2 logs

# Stop all
pm2 stop all

# Delete all
pm2 delete all
```

This will start 2 frontend applications:
- admin-ui (port 3000)
- document-intelligence (port 3001)

### Start Backend Services with NX

```bash
# In separate terminals:

# Terminal 1 - Auth service
pnpm nx serve auth

# Terminal 2 - Gateway
pnpm nx serve gateway

# Terminal 3 - AI Wrapper (after building)
pnpm nx build ai-wrapper
pnpm nx serve ai-wrapper
```

## Service Details

### Working Services

**Auth Service**
- Port: 3010
- Location: `dist/packages/auth`
- Requirements: PostgreSQL, Redis
- Status: ✅ Working

**Admin UI**
- Port: 3000
- Location: `packages/admin-ui/dist`
- Type: Static files served with `npx serve`
- Status: ✅ Working

**Document Intelligence**
- Port: 3001
- Location: `packages/document-intelligence-demo/dist`
- Type: Static files served with `npx serve`
- Status: ✅ Working

### Services Needing Setup

**Gateway Service** ⚠️
The gateway service is built but needs dependencies installed in the dist folder.

**Option 1: Manual Dependency Installation**
```bash
cd dist/packages/gateway
pnpm install --prod
cd ../../..
pm2 restart gateway
```

**Option 2: Use NX Prune (Recommended)**
```bash
# This creates a standalone package with all dependencies
pnpm nx run gateway:prune
```

**AI Wrapper Service** ⏸️
Not yet built. To enable:

```bash
# Build the service
pnpm nx build ai-wrapper

# Install dependencies
cd dist/packages/ai-wrapper
pnpm install --prod

# Uncomment ai-wrapper in ecosystem.config.js
# Then restart PM2
pm2 reload ecosystem.config.js
```

## Alternative: Use NX Serve for Development

Instead of PM2, you can use NX's built-in serve command for development:

```bash
# Auth service
pnpm nx serve auth

# Gateway
pnpm nx serve gateway

# Admin UI
cd packages/admin-ui && pnpm dev

# Document Intelligence
cd packages/document-intelligence-demo && pnpm dev

# Service Manager
cd packages/service-manager && pnpm dev
```

## Production Deployment

For production, use the NX prune task to create standalone deployable packages:

```bash
# Build and prune auth
pnpm nx run auth:build
pnpm nx run auth:prune

# This creates dist/packages/auth with:
# - main.js (bundled code)
# - package.json (production dependencies)
# - pnpm-lock.yaml
# - workspace_modules/ (local packages)
```

Then the pruned packages can be deployed with PM2 or Docker.

## PM2 Configuration

The `ecosystem.config.js` file is configured with:
- Auto-restart on failure
- Memory limits
- Environment variables
- Production mode

Current configuration:
```javascript
{
  name: 'auth',
  script: 'main.js',
  cwd: './dist/packages/auth',
  max_memory_restart: '500M',
  env: {
    PORT: 3010,
    NODE_ENV: 'production',
    DATABASE_URL: '...',
    REDIS_URL: '...'
  }
}
```

## Database Requirements

Before starting backend services, ensure:

**PostgreSQL**
```bash
# Using Docker
docker run -d \
  --name orion-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=orion \
  -p 5432:5432 \
  postgres:15
```

**Redis**
```bash
# Using Docker
docker run -d \
  --name orion-redis \
  -p 6379:6379 \
  redis:7-alpine
```

Or update DATABASE_URL and REDIS_URL in ecosystem.config.js to point to your instances.

## Troubleshooting

### Gateway won't start
- Check dependencies are installed in `dist/packages/gateway`
- Run `cd dist/packages/gateway && pnpm install --prod`
- Check logs: `pm2 logs gateway`

### Auth service errors
- Ensure PostgreSQL is running
- Ensure Redis is running
- Check DATABASE_URL and REDIS_URL are correct
- View logs: `pm2 logs auth`

### Frontend apps not accessible
- Check if `serve` package is installed globally: `npm install -g serve`
- Or it will use `npx serve` which downloads on demand
- Check ports 3000 and 3001 are not in use

### PM2 commands not working
- Install PM2 globally: `npm install -g pm2`
- Check PM2 is in PATH: `which pm2`

## Next Steps

1. Set up PostgreSQL and Redis
2. Install gateway dependencies
3. Build and enable ai-wrapper service
4. Configure environment variables
5. Test all services together
6. Set up PM2 startup script for auto-start on boot

## Service Manager Integration

Once services are running with PM2, you can use the Service Manager GUI to monitor and control them:

```bash
cd packages/service-manager
pnpm install
pnpm dev
```

Then open http://localhost:3301 to see the dashboard with real-time service metrics!

## Summary

**Currently Working:**
- ✅ 3/4 configured services running
- ✅ Auth backend fully functional
- ✅ Both frontend apps serving correctly
- ✅ PM2 configuration in place

**To Complete:**
- 📋 Install gateway dependencies
- 📋 Build ai-wrapper service
- 📋 Set up databases (PostgreSQL, Redis)
- 📋 Test end-to-end functionality
