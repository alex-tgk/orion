# Service Manager Deployment Guide

## Development Setup

### Prerequisites
- Node.js 18+ installed
- pnpm installed globally
- PM2 installed globally: `npm install -g pm2`

### Install Dependencies
```bash
cd packages/service-manager
pnpm install
```

### Start Development Environment

**Terminal 1 - Start all ORION services with PM2:**
```bash
# From project root
pm2 start ecosystem.config.js
pm2 list  # Verify services are running
```

**Terminal 2 - Start Service Manager:**
```bash
cd packages/service-manager
pnpm dev
```

This runs:
- Backend server on http://localhost:3300
- Frontend GUI on http://localhost:3301

### Access Dashboard
Open http://localhost:3301 in your browser

## Production Deployment

### Option 1: Separate Frontend & Backend

#### Build Frontend
```bash
cd packages/service-manager/client
pnpm run build
# Outputs to: client/dist/
```

#### Deploy Backend
```bash
# Add service-manager to ecosystem.config.js
pm2 start ecosystem.config.js
pm2 save
```

#### Serve Frontend
Use nginx, Apache, or any static file server to serve `client/dist/`

**Nginx example:**
```nginx
server {
  listen 80;
  server_name service-manager.example.com;

  root /path/to/orion/packages/service-manager/client/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:3300;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location /socket.io {
    proxy_pass http://localhost:3300;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Option 2: Integrated Deployment (Backend serves Frontend)

#### 1. Build Frontend
```bash
cd packages/service-manager/client
pnpm run build
```

#### 2. Update Backend to Serve Static Files
Edit `server/index.ts`:

```typescript
import path from 'path';

// Add after other middleware
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

#### 3. Add to PM2 Ecosystem
Edit `ecosystem.config.js`:

```javascript
{
  name: 'service-manager',
  script: 'server/index.js',
  cwd: './packages/service-manager',
  instances: 1,
  autorestart: true,
  env: {
    PORT: 3300,
    NODE_ENV: 'production'
  }
}
```

#### 4. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable auto-start on boot
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2 pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/service-manager ./packages/service-manager

# Install dependencies
RUN cd packages/service-manager && pnpm install

# Build frontend
RUN cd packages/service-manager/client && pnpm run build

# Expose ports
EXPOSE 3300

# Start backend
CMD ["node", "packages/service-manager/server/index.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  service-manager:
    build: .
    ports:
      - "3300:3300"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=production
      - PORT=3300
    restart: unless-stopped
```

## Environment Variables

Create `.env` file in `packages/service-manager/`:

```env
# Server
PORT=3300
NODE_ENV=production

# Frontend (for build)
VITE_API_URL=http://localhost:3300
VITE_WS_URL=ws://localhost:3300

# Security
CORS_ORIGIN=http://localhost:3301
JWT_SECRET=your-secret-key
```

## Security Best Practices

### 1. Add Authentication

Install dependencies:
```bash
pnpm add jsonwebtoken bcryptjs
pnpm add -D @types/jsonwebtoken @types/bcryptjs
```

Add auth middleware in `server/index.ts`:
```typescript
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Protect routes
app.use('/api/services', authMiddleware);
```

### 2. Enable CORS
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3301',
  credentials: true
}));
```

### 3. Rate Limiting
```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. HTTPS
Use Let's Encrypt with Certbot for free SSL certificates:

```bash
sudo certbot --nginx -d service-manager.example.com
```

## Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs service-manager

# View metrics
pm2 describe service-manager
```

### Health Checks

Add health endpoint in `server/index.ts`:
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

## Troubleshooting

### Services not showing
```bash
# Check PM2 daemon
pm2 status

# Restart PM2
pm2 kill
pm2 start ecosystem.config.js
```

### Port conflicts
```bash
# Find process using port
lsof -i :3300

# Kill process
kill -9 <PID>
```

### Build failures
```bash
# Clean and rebuild
rm -rf node_modules client/dist
pnpm install
cd client && pnpm run build
```

### WebSocket issues
Check firewall allows WebSocket connections on port 3300

## Performance Optimization

### 1. Enable Compression
```bash
pnpm add compression
```

```typescript
import compression from 'compression';
app.use(compression());
```

### 2. Enable Caching
```typescript
app.use(express.static('client/dist', {
  maxAge: '1d',
  etag: true
}));
```

### 3. PM2 Cluster Mode
```javascript
{
  name: 'service-manager',
  script: 'server/index.js',
  instances: 'max', // Use all CPU cores
  exec_mode: 'cluster'
}
```

## Backup & Recovery

### Backup PM2 Configuration
```bash
pm2 save
pm2 dump
```

### Restore
```bash
pm2 resurrect
```

## Auto-Start on Boot

### Linux (systemd)
```bash
pm2 startup
pm2 save
```

### Windows
Use PM2 Windows Service:
```bash
npm install -g pm2-windows-service
pm2-service-install
```

## Scaling

### Horizontal Scaling
Use PM2 cluster mode or deploy multiple instances behind a load balancer

### Vertical Scaling
Increase memory limits in ecosystem.config.js:
```javascript
{
  max_memory_restart: '2G'
}
```

## Next Steps

1. Set up CI/CD pipeline
2. Configure automated backups
3. Implement log aggregation
4. Add performance monitoring
5. Set up alerting for service failures
