# Service Monitoring Deployment Guide

Complete deployment guide for the ORION Service Monitoring & PM2 Dashboard.

## 📋 Pre-Deployment Checklist

### Code Quality
- [x] TypeScript compilation passes (`npm run type-check`)
- [x] No ESLint errors
- [x] All components exported correctly
- [x] Environment variables documented

### Features Implemented
- [x] Service Grid with real-time updates
- [x] PM2 Process management
- [x] Health status monitoring
- [x] Log viewer modal
- [x] WebSocket integration
- [x] Responsive design
- [x] Error handling

### Documentation
- [x] SERVICES_MONITORING.md created
- [x] TESTING_GUIDE.md created
- [x] Component README.md created
- [x] .env.example updated

## 🚀 Deployment Steps

### 1. Environment Setup

```bash
# Navigate to admin-ui package
cd packages/admin-ui

# Copy environment variables
cp .env.example .env

# Verify environment variables
cat .env
```

Required variables:
```bash
VITE_ADMIN_API_URL=http://localhost:3004/api
VITE_WS_URL=http://localhost:3004
ADMIN_API_PORT=3004
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# Verify socket.io-client is installed
npm list socket.io-client
```

### 3. Build Application

```bash
# Type check
npm run type-check

# Build frontend
npm run build

# Build backend
npm run build:server

# Build both (recommended)
npm run build:all
```

### 4. Start Services

#### Development Mode
```bash
# Terminal 1: Start backend
npm run dev:server

# Terminal 2: Start frontend
npm run dev
```

#### Production Mode
```bash
# Start backend (PM2)
pm2 start dist/main.js --name admin-ui-server

# Serve frontend (with nginx or serve)
npx serve -s dist -p 3000
```

### 5. Verify Deployment

#### Backend Health Check
```bash
curl http://localhost:3004/api/health
# Expected: {"status":"ok",...}

curl http://localhost:3004/api/services
# Expected: [array of services]

curl http://localhost:3004/api/pm2/processes
# Expected: [array of PM2 processes]
```

#### Frontend Access
```bash
# Development
http://localhost:5173/services

# Production
http://localhost:3000/services
```

#### WebSocket Connection
```bash
# Open browser DevTools → Console
# Should see: "[WebSocket] Connected to admin dashboard"
```

## 🔧 Configuration

### Backend Configuration

**admin-ui/src/main.ts**
```typescript
// Port configuration
const port = process.env.ADMIN_API_PORT || 3004;

// CORS configuration
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});

// WebSocket configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  path: '/admin',
});
```

### Frontend Configuration

**admin-ui/src/hooks/useServices.ts**
```typescript
const API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3004/api';
```

**admin-ui/src/services/websocket.service.ts**
```typescript
connect(url: string = 'http://localhost:3004'): Socket {
  // WebSocket connection logic
}
```

## 🌍 Environment-Specific Deployments

### Local Development
```bash
VITE_ADMIN_API_URL=http://localhost:3004/api
VITE_WS_URL=http://localhost:3004
```

### Staging
```bash
VITE_ADMIN_API_URL=https://staging-admin.orion.com/api
VITE_WS_URL=https://staging-admin.orion.com
```

### Production
```bash
VITE_ADMIN_API_URL=https://admin.orion.com/api
VITE_WS_URL=https://admin.orion.com
```

## 🐳 Docker Deployment

### Dockerfile (Frontend)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Dockerfile (Backend)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3004
CMD ["node", "dist/main.js"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  admin-ui-backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3004:3004"
    environment:
      - ADMIN_API_PORT=3004
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on:
      - postgres
      - redis
      - rabbitmq

  admin-ui-frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    environment:
      - VITE_ADMIN_API_URL=http://admin-ui-backend:3004/api
      - VITE_WS_URL=http://admin-ui-backend:3004
    depends_on:
      - admin-ui-backend
```

## ☸️ Kubernetes Deployment

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: admin-ui-config
data:
  ADMIN_API_PORT: "3004"
  VITE_ADMIN_API_URL: "http://admin-ui-backend:3004/api"
  VITE_WS_URL: "http://admin-ui-backend:3004"
```

### Deployment (Backend)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-ui-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admin-ui-backend
  template:
    metadata:
      labels:
        app: admin-ui-backend
    spec:
      containers:
      - name: admin-ui-backend
        image: orion/admin-ui-backend:latest
        ports:
        - containerPort: 3004
        envFrom:
        - configMapRef:
            name: admin-ui-config
        - secretRef:
            name: admin-ui-secrets
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: admin-ui-backend
spec:
  selector:
    app: admin-ui-backend
  ports:
  - port: 3004
    targetPort: 3004
  type: ClusterIP
```

## 🔒 Security Considerations

### 1. Environment Variables
```bash
# Never commit .env files
# Use secrets management (AWS Secrets Manager, Vault, etc.)
```

### 2. CORS Configuration
```typescript
// Production: Restrict to specific domains
app.enableCors({
  origin: ['https://admin.orion.com'],
  credentials: true,
});
```

### 3. WebSocket Security
```typescript
// Add authentication to WebSocket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (isValidToken(token)) {
    next();
  } else {
    next(new Error('Authentication error'));
  }
});
```

### 4. Rate Limiting
```typescript
// Add rate limiting to API endpoints
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 📊 Monitoring

### Application Metrics
- Service uptime
- API response times
- WebSocket connection count
- Error rates

### Infrastructure Metrics
- CPU usage
- Memory usage
- Network I/O
- Disk usage

### Logging
```typescript
// Use structured logging
import { Logger } from '@nestjs/common';

const logger = new Logger('AdminUI');
logger.log('Service started');
logger.error('Error occurred', error.stack);
```

## 🔄 Rollback Plan

### Frontend Rollback
```bash
# If using PM2
pm2 deploy ecosystem.config.js production revert 1

# If using Docker
docker pull orion/admin-ui-frontend:previous-tag
docker-compose up -d admin-ui-frontend

# If using Kubernetes
kubectl rollout undo deployment/admin-ui-frontend
```

### Backend Rollback
```bash
# PM2
pm2 restart admin-ui-server --update-env

# Docker
docker pull orion/admin-ui-backend:previous-tag
docker-compose up -d admin-ui-backend

# Kubernetes
kubectl rollout undo deployment/admin-ui-backend
```

## 🧪 Post-Deployment Testing

### Smoke Tests
```bash
# 1. Health check
curl http://localhost:3004/api/health

# 2. Services endpoint
curl http://localhost:3004/api/services

# 3. PM2 endpoint
curl http://localhost:3004/api/pm2/processes

# 4. WebSocket (using wscat)
wscat -c ws://localhost:3004/admin
```

### UI Tests
- [ ] Navigate to /services
- [ ] Verify Services tab loads
- [ ] Verify PM2 Processes tab loads
- [ ] Verify Health Checks tab loads
- [ ] Test service restart action
- [ ] Test PM2 process controls
- [ ] Test log viewer
- [ ] Verify WebSocket updates

## 📈 Performance Optimization

### Frontend
```bash
# 1. Enable compression
# In vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'tremor': ['@tremor/react'],
        'react-query': ['@tanstack/react-query'],
      }
    }
  }
}

# 2. Enable caching
# In nginx.conf
location /assets {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### Backend
```bash
# 1. Enable response compression
import compression from 'compression';
app.use(compression());

# 2. Add caching headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  next();
});
```

## 🆘 Troubleshooting

### Issue: WebSocket won't connect
```bash
# Check firewall rules
# Check CORS settings
# Verify WebSocket path (/admin)
# Check backend logs
```

### Issue: Services not loading
```bash
# Check backend is running
# Verify API_BASE_URL
# Check network requests in DevTools
# Review backend logs
```

### Issue: Real-time updates not working
```bash
# Check WebSocket connection
# Verify TanStack Query is configured
# Check console for errors
# Review websocket.service.ts
```

## 📝 Maintenance

### Regular Tasks
- [ ] Update dependencies monthly
- [ ] Review error logs weekly
- [ ] Check performance metrics daily
- [ ] Backup configurations
- [ ] Update documentation

### Version Upgrades
```bash
# 1. Update dependencies
npm update

# 2. Test thoroughly
npm run type-check
npm test
npm run build

# 3. Deploy to staging
# 4. Run smoke tests
# 5. Deploy to production
```

## 🎯 Success Criteria

Deployment is successful when:
- [ ] All API endpoints respond correctly
- [ ] WebSocket connects successfully
- [ ] All three tabs load without errors
- [ ] Real-time updates work
- [ ] Actions (restart, stop, start) work
- [ ] No console errors
- [ ] Performance is acceptable (< 2s load time)
- [ ] All smoke tests pass

## 📞 Support

If issues arise:
1. Check logs (frontend console, backend logs)
2. Review this deployment guide
3. Check TESTING_GUIDE.md
4. Review SERVICES_MONITORING.md
5. Contact DevOps team
