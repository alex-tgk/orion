# Deployment Guide

This guide covers the deployment process, environment configurations, rollback procedures, and post-deployment monitoring for the ORION platform.

## Table of Contents

1. [Deployment Process](#deployment-process)
2. [Environment Configurations](#environment-configurations)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring After Deployment](#monitoring-after-deployment)
7. [Troubleshooting](#troubleshooting)

## Deployment Process

### Pre-Deployment Checklist

**Before deploying to production:**

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Security scan completed
- [ ] Performance tested
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Rollback plan prepared
- [ ] Team notified
- [ ] Documentation updated
- [ ] Change log updated

### Deployment Workflow

```
┌─────────────────┐
│  Development    │
│   (feature)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Build & Test  │
│   (CI Pipeline) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Staging      │
│  (Pre-prod)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Production    │
│   Deployment    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Monitoring   │
│  & Validation   │
└─────────────────┘
```

### CI/CD Pipeline

**GitHub Actions workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: docker compose build
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker compose push

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/auth auth=${{ secrets.DOCKER_REGISTRY }}/auth:${{ github.sha }}
          kubectl set image deployment/gateway gateway=${{ secrets.DOCKER_REGISTRY }}/gateway:${{ github.sha }}
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/auth
          kubectl rollout status deployment/gateway
      - name: Verify deployment
        run: |
          kubectl get pods
          kubectl get services
```

**GitLab CI workflow:**

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - pnpm install
    - pnpm test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'

build:
  stage: build
  script:
    - docker compose build
    - docker compose push
  only:
    - main

deploy_production:
  stage: deploy
  script:
    - kubectl apply -f k8s/
    - kubectl rollout status deployment/auth
  only:
    - main
  when: manual
```

## Environment Configurations

### Environment Variables

**Development (.env):**

```bash
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://orion:orion@localhost:5432/orion_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev-secret-not-for-production
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Services
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
GATEWAY_PORT=3000
```

**Staging (.env.staging):**

```bash
NODE_ENV=staging
LOG_LEVEL=info

# Database (separate staging DB)
DATABASE_URL=postgresql://orion:${DB_PASSWORD}@staging-db.example.com:5432/orion_staging

# Redis (separate instance)
REDIS_HOST=staging-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT (use secrets manager)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Services (internal DNS)
AUTH_SERVICE_HOST=auth-service.staging.svc.cluster.local
USER_SERVICE_HOST=user-service.staging.svc.cluster.local
```

**Production (.env.production):**

```bash
NODE_ENV=production
LOG_LEVEL=warn

# Database (managed service)
DATABASE_URL=${DATABASE_URL}

# Redis (managed service)
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_TLS=true

# JWT (from secrets manager)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Monitoring
SENTRY_DSN=${SENTRY_DSN}
NEW_RELIC_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}

# Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
```

### Secrets Management

**Using Kubernetes Secrets:**

```bash
# Create secret from file
kubectl create secret generic orion-secrets \
  --from-env-file=.env.production

# Create secret from literal values
kubectl create secret generic jwt-secrets \
  --from-literal=jwt-secret='your-secret' \
  --from-literal=jwt-refresh-secret='your-refresh-secret'

# Use in deployment
# See k8s/deployments/auth-deployment.yaml
```

**Using HashiCorp Vault:**

```bash
# Store secrets
vault kv put secret/orion/production \
  database_url='postgresql://...' \
  jwt_secret='...' \
  redis_password='...'

# Retrieve in application
vault kv get -field=jwt_secret secret/orion/production
```

## Docker Deployment

### Building Images

```bash
# Build all services
docker compose build

# Build specific service
docker compose build auth

# Build with specific tag
docker compose build --build-arg VERSION=1.2.3

# Build for production
docker compose -f docker-compose.prod.yml build
```

### Running Containers

```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up -d postgres redis

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Docker Compose Production

**docker-compose.prod.yml:**

```yaml
version: '3.8'

services:
  auth:
    image: ${DOCKER_REGISTRY}/orion-auth:${VERSION}
    restart: always
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  gateway:
    image: ${DOCKER_REGISTRY}/orion-gateway:${VERSION}
    restart: always
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    depends_on:
      - auth
      - user
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Kubernetes Deployment

### Namespace Setup

```bash
# Create namespace
kubectl create namespace orion-prod

# Set default namespace
kubectl config set-context --current --namespace=orion-prod
```

### Deployment Configuration

**k8s/deployments/auth-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: orion-prod
  labels:
    app: auth
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth
  template:
    metadata:
      labels:
        app: auth
        version: v1
    spec:
      containers:
      - name: auth
        image: registry.example.com/orion-auth:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: orion-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

**k8s/services/auth-service.yaml:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: orion-prod
spec:
  selector:
    app: auth
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
  type: ClusterIP
```

### Deploying to Kubernetes

```bash
# Apply all configurations
kubectl apply -f k8s/

# Or use Helm
helm install orion ./helm/orion \
  --namespace orion-prod \
  --values helm/orion/values.prod.yaml

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# Watch rollout
kubectl rollout status deployment/auth-service

# View logs
kubectl logs -f deployment/auth-service
```

### Horizontal Pod Autoscaler

**k8s/hpa/auth-hpa.yaml:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-hpa
  namespace: orion-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Rollback Procedures

### Docker Rollback

```bash
# Stop current version
docker compose down

# Switch to previous version
export VERSION=1.2.2  # Previous stable version
docker compose -f docker-compose.prod.yml up -d

# Verify rollback
docker compose ps
curl http://localhost:3000/health
```

### Kubernetes Rollback

**Automated rollback:**

```bash
# Rollback to previous revision
kubectl rollout undo deployment/auth-service

# Rollback to specific revision
kubectl rollout undo deployment/auth-service --to-revision=3

# Check rollout history
kubectl rollout history deployment/auth-service

# Verify rollback
kubectl rollout status deployment/auth-service
kubectl get pods
```

**Manual rollback:**

```bash
# Set image to previous version
kubectl set image deployment/auth-service \
  auth=registry.example.com/orion-auth:1.2.2

# Or apply previous manifest
kubectl apply -f k8s/deployments/auth-deployment.v1.2.2.yaml

# Monitor rollout
kubectl rollout status deployment/auth-service
```

### Database Rollback

**Prisma migrations:**

```bash
# List migrations
npx prisma migrate status

# Rollback last migration
npx prisma migrate rollback

# Rollback to specific migration
npx prisma migrate rollback --to=20231015_add_users_table

# WARNING: Test on staging first!
```

**Manual database rollback:**

```sql
-- Create backup before rollback
pg_dump -U orion -d orion_prod > backup_before_rollback.sql

-- Restore from backup
psql -U orion -d orion_prod < backup_previous_version.sql

-- Or run reverse migration script
psql -U orion -d orion_prod < migrations/down/20231020_add_column.sql
```

### Rollback Decision Matrix

| Issue | Severity | Action | Timeline |
|-------|----------|--------|----------|
| Performance degradation | Low | Monitor, fix forward | 24-48h |
| Minor bug | Medium | Fix forward or rollback | 4-8h |
| Major bug | High | Immediate rollback | < 1h |
| Security issue | Critical | Immediate rollback | < 30min |
| Data corruption | Critical | Immediate rollback + restore | < 15min |

## Monitoring After Deployment

### Health Checks

**Immediate checks after deployment:**

```bash
# 1. Service health
curl http://api.example.com/health
# Expected: {"status":"ok"}

# 2. All endpoints responsive
curl http://api.example.com/api/auth/health
curl http://api.example.com/api/users/health
curl http://api.example.com/api/notifications/health

# 3. Database connectivity
curl http://api.example.com/health/db
# Expected: {"database":"connected"}

# 4. Redis connectivity
curl http://api.example.com/health/redis
# Expected: {"redis":"connected"}
```

### Application Metrics

**Key metrics to monitor:**

```bash
# Request rate
curl http://api.example.com/metrics | grep http_requests_total

# Response time (P95, P99)
curl http://api.example.com/metrics | grep http_request_duration

# Error rate
curl http://api.example.com/metrics | grep http_errors_total

# Active connections
curl http://api.example.com/metrics | grep active_connections
```

### Infrastructure Monitoring

**Kubernetes:**

```bash
# Pod status
kubectl get pods -w

# Resource usage
kubectl top pods
kubectl top nodes

# Events
kubectl get events --sort-by='.lastTimestamp'

# Logs
kubectl logs -f deployment/auth-service --tail=100
```

**Docker:**

```bash
# Container status
docker compose ps

# Resource usage
docker stats

# Logs
docker compose logs -f --tail=100
```

### Alerting

**Set up alerts for:**

1. **High error rate** - > 1% errors
2. **Slow response time** - P95 > 1000ms
3. **High CPU usage** - > 80%
4. **High memory usage** - > 85%
5. **Pod crashes** - Any pod restart
6. **Database connection issues**
7. **Failed health checks**

**Example alert (Prometheus):**

```yaml
# alerts/high-error-rate.yaml
groups:
- name: api_alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_errors_total[5m]) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }}% (threshold: 1%)"
```

### Post-Deployment Verification

**30-minute checklist:**

- [ ] All services healthy
- [ ] No error spikes
- [ ] Response times normal
- [ ] Database queries performing well
- [ ] No memory leaks detected
- [ ] Logs show no critical errors
- [ ] User-facing features working
- [ ] Monitoring dashboards green

**24-hour checklist:**

- [ ] Error rates stable
- [ ] Performance metrics stable
- [ ] No gradual memory increase
- [ ] No unusual patterns in logs
- [ ] Database performance stable
- [ ] User feedback positive
- [ ] Support tickets normal

## Troubleshooting

### Common Deployment Issues

**Issue: Pods CrashLooping**

```bash
# Check pod status
kubectl get pods

# View pod logs
kubectl logs <pod-name>

# Describe pod for events
kubectl describe pod <pod-name>

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Port conflicts
# - Resource limits too low
```

**Issue: Service Unavailable**

```bash
# Check service
kubectl get svc

# Check endpoints
kubectl get endpoints <service-name>

# Verify selector matches pods
kubectl get pods --show-labels

# Test internal connectivity
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
# wget -O- http://auth-service:3001/health
```

**Issue: Database Migration Failed**

```bash
# Check migration status
npx prisma migrate status

# View migration logs
kubectl logs <pod-name> | grep migration

# Rollback migration
npx prisma migrate rollback

# Fix and retry
npx prisma migrate deploy
```

### Emergency Procedures

**Complete rollback:**

```bash
# 1. Rollback all services
kubectl rollout undo deployment/auth-service
kubectl rollout undo deployment/gateway
kubectl rollout undo deployment/user-service

# 2. Verify rollback
kubectl rollout status deployment/auth-service
kubectl rollout status deployment/gateway
kubectl rollout status deployment/user-service

# 3. Check health
curl http://api.example.com/health

# 4. Notify team
# Post in #incidents channel
```

**Incident response:**

1. **Acknowledge** - Confirm issue
2. **Assess** - Severity and impact
3. **Mitigate** - Rollback or fix
4. **Communicate** - Update stakeholders
5. **Resolve** - Fix and verify
6. **Document** - Post-mortem

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and merged
- [ ] Tests passing (unit, integration, e2e)
- [ ] Security scan completed
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Secrets rotated (if needed)
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Maintenance window scheduled (if needed)

### During Deployment

- [ ] Create backup (database, configs)
- [ ] Deploy to staging first
- [ ] Verify staging deployment
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Monitor deployment progress
- [ ] Verify health checks
- [ ] Run smoke tests on production

### Post-Deployment

- [ ] Verify all services healthy
- [ ] Check error rates
- [ ] Check response times
- [ ] Review logs for errors
- [ ] Monitor for 30 minutes
- [ ] Update status page
- [ ] Notify team of completion
- [ ] Document any issues

---

**Remember:** Safe deployments are incremental, monitored, and reversible. Always have a rollback plan!

For more information, see:
- [Docker & Kubernetes Guide](../../DOCKER_K8S_GUIDE.md)
- [CI/CD Guide](../../CI_CD_GUIDE.md)
- [Deployment Quick Start](../../DEPLOYMENT_QUICK_START.md)
