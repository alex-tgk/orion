# ORION Platform - Production Deployment Guide

**Version**: 1.0
**Last Updated**: 2025-10-18

This guide covers production deployment strategies for the ORION microservices platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Strategies](#deployment-strategies)
3. [PM2 Deployment](#pm2-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Zero-Downtime Deployment](#zero-downtime-deployment)
8. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Infrastructure Requirements

**Minimum Production Requirements:**
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 8GB (16GB recommended)
- **Storage**: 50GB SSD
- **Network**: Static IP or load balancer with SSL/TLS

**Database Requirements:**
- PostgreSQL 15+ (managed service recommended)
- Redis 7+ (managed service or cluster)
- RabbitMQ 3.12+ (optional, for async messaging)

**External Services:**
- Object storage (S3, MinIO, or equivalent)
- Email service (SendGrid, AWS SES, or SMTP)
- Monitoring (Datadog, New Relic, or self-hosted Prometheus/Grafana)

### Software Dependencies

- Node.js 18+ LTS
- pnpm 8.x or npm 9.x
- PM2 5.x (for PM2 deployment)
- Docker 24.x + Docker Compose 2.x (for Docker deployment)
- kubectl 1.28+ (for Kubernetes deployment)
- nginx or Caddy (reverse proxy)

## Deployment Strategies

ORION supports three main deployment strategies:

### 1. PM2 Deployment
**Best For**: Small to medium deployments, VPS hosting, cost-sensitive projects
**Pros**: Simple, fast, low resource overhead
**Cons**: Manual scaling, single-server limitation

### 2. Docker Deployment
**Best For**: Development-production parity, containerized infrastructure
**Pros**: Consistent environments, easy rollbacks, resource isolation
**Cons**: Requires Docker knowledge, slightly higher resource usage

### 3. Kubernetes Deployment
**Best For**: Large-scale deployments, multi-region, high availability
**Pros**: Auto-scaling, self-healing, advanced orchestration
**Cons**: Complex setup, higher operational overhead

## PM2 Deployment

### Setup

1. **Provision Server**
   ```bash
   # Ubuntu 22.04 LTS recommended
   ssh user@production-server

   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install pnpm and PM2
   npm install -g pnpm pm2
   ```

2. **Clone Repository**
   ```bash
   cd /var/www
   git clone https://github.com/your-org/orion.git
   cd orion
   git checkout main
   ```

3. **Install Dependencies**
   ```bash
   pnpm install --frozen-lockfile --prod
   ```

4. **Build Services**
   ```bash
   # Build all backend services
   pnpm nx build auth
   pnpm nx build gateway
   pnpm nx build ai-wrapper
   pnpm nx build notifications
   pnpm nx build storage

   # Build frontend applications
   cd packages/admin-ui && pnpm run build
   cd ../document-intelligence-demo && pnpm run build
   ```

5. **Configure Environment**
   ```bash
   cp .env.example .env.production
   nano .env.production
   # Configure all production variables (see ENVIRONMENT_VARIABLES.md)
   ```

6. **Start with PM2**
   ```bash
   # Use production ecosystem config
   pm2 start ecosystem.config.production.js

   # Save PM2 configuration
   pm2 save

   # Setup PM2 to start on system boot
   pm2 startup
   # Follow the command it outputs
   ```

7. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/orion
   server {
       listen 80;
       server_name api.your-domain.com;

       # SSL configuration (use Certbot)
       listen 443 ssl http2;
       ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

       # API Gateway
       location /api {
           proxy_pass http://localhost:3100;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }

   server {
       listen 80;
       server_name admin.your-domain.com;

       # SSL configuration
       listen 443 ssl http2;
       ssl_certificate /etc/letsencrypt/live/admin.your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/admin.your-domain.com/privkey.pem;

       # Admin UI
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable and Test**
   ```bash
   sudo ln -s /etc/nginx/sites-available/orion /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx

   # Test endpoints
   curl https://api.your-domain.com/api/health
   curl https://admin.your-domain.com
   ```

### PM2 Management Commands

```bash
# View all processes
pm2 list

# View logs
pm2 logs
pm2 logs auth
pm2 logs --lines 100

# Restart services
pm2 restart all
pm2 restart auth

# Monitor resources
pm2 monit

# Stop services
pm2 stop all
pm2 delete all

# Reload (zero-downtime restart)
pm2 reload all
```

## Docker Deployment

### Setup

1. **Build Images**
   ```bash
   # Build all service images
   docker compose -f docker-compose.prod.yml build

   # Or build individually
   docker build -t orion/auth:latest -f packages/auth/Dockerfile .
   docker build -t orion/gateway:latest -f packages/gateway/Dockerfile .
   docker build -t orion/ai-wrapper:latest -f packages/ai-wrapper/Dockerfile .
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

3. **Start Services**
   ```bash
   docker compose -f docker-compose.prod.yml up -d

   # View logs
   docker compose -f docker-compose.prod.yml logs -f

   # Check status
   docker compose -f docker-compose.prod.yml ps
   ```

4. **Setup Reverse Proxy**
   Use nginx or Traefik as reverse proxy with automatic SSL

### Docker Production Configuration

**docker-compose.prod.yml example:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ${DATABASE_NAME}
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - orion-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - orion-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  auth:
    image: orion/auth:latest
    restart: always
    env_file: .env.production
    ports:
      - "3010:3010"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - orion-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3010/api/auth/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  gateway:
    image: orion/gateway:latest
    restart: always
    env_file: .env.production
    ports:
      - "3100:3100"
    depends_on:
      - auth
    networks:
      - orion-network

volumes:
  postgres-data:
  redis-data:

networks:
  orion-network:
    driver: bridge
```

## Kubernetes Deployment

See `k8s/` directory for full Kubernetes manifests.

### Quick Deploy

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/auth.yaml
kubectl apply -f k8s/gateway.yaml
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n orion
kubectl get services -n orion

# View logs
kubectl logs -f deployment/auth -n orion
```

### Helm Deployment

```bash
# Install from Helm chart
helm install orion ./charts/orion -f values.production.yaml

# Upgrade
helm upgrade orion ./charts/orion -f values.production.yaml

# Rollback
helm rollback orion
```

## CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy-production.yml:**
```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker images
        run: |
          docker compose -f docker-compose.prod.yml build

      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker compose -f docker-compose.prod.yml push

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /var/www/orion
            git pull origin main
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
```

## Zero-Downtime Deployment

### Using PM2 Reload

```bash
# Build new version
pnpm nx build auth

# Reload with zero downtime
pm2 reload auth
```

PM2 reload strategy:
1. Starts new instance with new code
2. Waits for new instance to be ready
3. Gracefully shuts down old instance
4. Routes traffic to new instance

### Using Docker Rolling Update

```bash
# Build new image
docker build -t orion/auth:v2 -f packages/auth/Dockerfile .

# Update service
docker service update --image orion/auth:v2 orion_auth

# Rollback if needed
docker service update --rollback orion_auth
```

### Using Kubernetes Rolling Update

```bash
# Update deployment
kubectl set image deployment/auth auth=orion/auth:v2 -n orion

# Monitor rollout
kubectl rollout status deployment/auth -n orion

# Rollback if needed
kubectl rollout undo deployment/auth -n orion
```

## Rollback Procedures

### PM2 Rollback

```bash
# Option 1: Restart previous version
git checkout <previous-commit>
pnpm nx build auth
pm2 reload auth

# Option 2: Use PM2 save/resurrect
pm2 save  # Before deployment
# If deployment fails:
pm2 resurrect  # Restore saved state
```

### Docker Rollback

```bash
# Tag previous version
docker tag orion/auth:latest orion/auth:rollback

# Rollback
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d orion/auth:rollback
```

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/auth -n orion

# Rollback to previous revision
kubectl rollout undo deployment/auth -n orion

# Rollback to specific revision
kubectl rollout undo deployment/auth --to-revision=3 -n orion
```

## Post-Deployment Checklist

- [ ] All services health checks passing
- [ ] Database migrations completed successfully
- [ ] Environment variables configured correctly
- [ ] SSL certificates valid and not expiring soon
- [ ] Monitoring and alerting configured
- [ ] Log aggregation working
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated

## Monitoring

Essential metrics to monitor:

- **Service Health**: All /health endpoints responding
- **Response Times**: < 200ms for API calls
- **Error Rates**: < 0.1% error rate
- **Resource Usage**: CPU < 70%, Memory < 80%
- **Database**: Connection pool health, query performance
- **Redis**: Memory usage, hit rate
- **Queue**: Message backlog, processing rate

See `MONITORING_SETUP.md` for detailed monitoring configuration.

## Security Considerations

- Use HTTPS everywhere (enforce with HSTS)
- Implement rate limiting
- Enable CORS properly
- Use secrets management (Vault, AWS Secrets Manager)
- Regular security updates
- Network segmentation
- Database encryption at rest
- Backup encryption
- Audit logging enabled

## Scaling Recommendations

See `SCALING_GUIDE.md` for detailed scaling strategies.

**Quick tips:**
- Horizontal scaling: Add more instances with load balancer
- Database: Use connection pooling, read replicas
- Redis: Use cluster mode for high availability
- CDN: Serve static assets from CDN
- Caching: Implement multi-layer caching strategy

## Support

For deployment issues:
1. Check service logs: `pm2 logs` or `docker logs`
2. Verify environment variables
3. Check database connectivity
4. Review nginx/reverse proxy logs
5. Consult monitoring dashboards

For production support, contact: devops@your-company.com
