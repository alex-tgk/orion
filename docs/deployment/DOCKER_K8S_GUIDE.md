# ORION Docker and Kubernetes Deployment Guide

Complete guide for deploying ORION microservices platform using Docker and Kubernetes.

## Table of Contents

- [Overview](#overview)
- [Docker Setup](#docker-setup)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Helm Charts](#helm-charts)
- [Deployment Scripts](#deployment-scripts)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Overview

The ORION platform consists of 5 core microservices:

1. **Gateway** (Port 3000) - API Gateway and routing
2. **Auth** (Port 3001) - Authentication and authorization
3. **User** (Port 3002) - User management
4. **Notifications** (Port 3003) - Email and notification service
5. **Admin UI** (Port 3004) - Administrative dashboard

Plus infrastructure components:
- PostgreSQL (Database)
- Redis (Cache)
- RabbitMQ (Message Broker)

## Docker Setup

### Prerequisites

- Docker 24.0+
- Docker Compose 2.20+
- pnpm 10.15.1

### Building Images

Build all services:
```bash
./scripts/docker-build.sh
```

Build specific service:
```bash
./scripts/docker-build.sh --service auth
```

Build and push to registry:
```bash
./scripts/docker-build.sh --push --registry docker.io/yourorg --version 1.0.0
```

### Docker Compose

#### Development Environment

Start all services:
```bash
docker compose up -d
```

Start specific services:
```bash
docker compose up -d postgres redis rabbitmq auth
```

View logs:
```bash
docker compose logs -f
docker compose logs -f auth  # specific service
```

Stop services:
```bash
docker compose down
```

Stop and remove volumes:
```bash
docker compose down -v
```

#### Testing Environment

Run tests with isolated infrastructure:
```bash
docker compose -f docker-compose.test.yml up -d
```

The test environment uses:
- Separate ports (5433, 6380, 5673)
- tmpfs volumes for faster tests
- Isolated network

### Dockerfile Details

All Dockerfiles follow best practices:

1. **Multi-stage builds** - Separate build and runtime stages
2. **Layer caching** - Optimized COPY order for faster builds
3. **Non-root user** - Security-first approach (UID 1001)
4. **Health checks** - Built-in container health monitoring
5. **dumb-init** - Proper signal handling

Example structure:
- Stage 1: Base (pnpm setup)
- Stage 2: Dependencies (install packages)
- Stage 3: Build (compile TypeScript)
- Stage 4: Production Dependencies (prod-only packages)
- Stage 5: Runtime (minimal production image)

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.27+
- kubectl configured
- Helm 3.12+
- Ingress Controller (nginx)
- cert-manager (for TLS)

### Quick Start

Deploy to development:
```bash
./scripts/k8s-deploy.sh --environment dev
```

Deploy to staging:
```bash
./scripts/k8s-deploy.sh --environment staging
```

Deploy to production:
```bash
./scripts/k8s-deploy.sh --environment prod
```

### Manual Deployment

Create namespace:
```bash
kubectl create namespace orion
kubectl label namespace orion environment=production
```

Apply base manifests:
```bash
kubectl apply -k k8s/base
```

Apply environment-specific overlays:
```bash
kubectl apply -k k8s/overlays/production
```

### Verify Deployment

Check pods:
```bash
kubectl get pods -n orion
```

Check services:
```bash
kubectl get services -n orion
```

Check ingress:
```bash
kubectl get ingress -n orion
```

View logs:
```bash
kubectl logs -n orion -l app=auth
kubectl logs -n orion -f deployment/auth  # follow logs
```

## Helm Charts

### Chart Structure

```
helm/orion/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values
├── values-dev.yaml         # Development overrides
├── values-staging.yaml     # Staging overrides
├── values-prod.yaml        # Production overrides
└── templates/              # Kubernetes manifests
    ├── gateway/
    ├── auth/
    ├── user/
    ├── notifications/
    ├── admin-ui/
    └── infrastructure/
```

### Installing with Helm

Install development:
```bash
helm install orion ./helm/orion \
  --namespace orion \
  --create-namespace \
  --values ./helm/orion/values-dev.yaml
```

Install staging:
```bash
helm install orion ./helm/orion \
  --namespace orion \
  --create-namespace \
  --values ./helm/orion/values-staging.yaml \
  --set postgresql.auth.password=SECURE_PASSWORD \
  --set auth.secrets.jwtSecret=SECURE_JWT_SECRET
```

Install production:
```bash
helm install orion ./helm/orion \
  --namespace orion \
  --create-namespace \
  --values ./helm/orion/values-prod.yaml \
  --set postgresql.auth.password=$DB_PASSWORD \
  --set auth.secrets.jwtSecret=$JWT_SECRET \
  --set rabbitmq.auth.password=$RABBITMQ_PASSWORD
```

### Upgrading

Upgrade release:
```bash
helm upgrade orion ./helm/orion \
  --namespace orion \
  --values ./helm/orion/values-prod.yaml
```

Upgrade with new image version:
```bash
helm upgrade orion ./helm/orion \
  --namespace orion \
  --set gateway.image.tag=1.1.0 \
  --set auth.image.tag=1.1.0
```

### Rollback

Rollback to previous version:
```bash
./scripts/k8s-rollback.sh
```

Rollback to specific revision:
```bash
./scripts/k8s-rollback.sh --revision 3
```

View rollback history:
```bash
helm history orion -n orion
```

## Deployment Scripts

### docker-build.sh

Build Docker images for all services.

**Usage:**
```bash
./scripts/docker-build.sh [OPTIONS]

Options:
  --push              Push images to registry after building
  --service SERVICE   Build only specified service
  --version VERSION   Tag version (default: latest)
  --registry REGISTRY Docker registry (default: docker.io/orion)
  --help              Show help message
```

**Examples:**
```bash
# Build all services
./scripts/docker-build.sh

# Build and push with version
./scripts/docker-build.sh --push --version 1.0.0

# Build single service
./scripts/docker-build.sh --service auth

# Use custom registry
./scripts/docker-build.sh --registry gcr.io/my-project --push
```

### k8s-deploy.sh

Deploy ORION to Kubernetes using Helm.

**Usage:**
```bash
./scripts/k8s-deploy.sh [OPTIONS]

Options:
  -e, --environment ENV   Environment (dev/staging/prod)
  -n, --namespace NS      Kubernetes namespace (default: orion)
  --release NAME          Helm release name (default: orion)
  --timeout DURATION      Deployment timeout (default: 10m)
  --dry-run               Perform dry run
  --skip-verification     Skip deployment verification
  --set KEY=VALUE         Set Helm values
  --help                  Show help message
```

**Examples:**
```bash
# Deploy to development
./scripts/k8s-deploy.sh -e dev

# Deploy to production with custom values
./scripts/k8s-deploy.sh -e prod \
  --set auth.replicaCount=5 \
  --set postgresql.persistence.size=100Gi

# Dry run
./scripts/k8s-deploy.sh -e staging --dry-run

# Deploy to custom namespace
./scripts/k8s-deploy.sh -e prod -n orion-prod
```

### k8s-rollback.sh

Rollback failed deployments.

**Usage:**
```bash
./scripts/k8s-rollback.sh [OPTIONS]

Options:
  -n, --namespace NS    Kubernetes namespace (default: orion)
  --release NAME        Helm release name (default: orion)
  -r, --revision NUM    Revision to rollback to
  --k8s-only            Use kubectl rollback instead of Helm
  -y, --yes             Auto-confirm rollback
  --help                Show help message
```

**Examples:**
```bash
# Rollback to previous version
./scripts/k8s-rollback.sh

# Rollback to specific revision
./scripts/k8s-rollback.sh --revision 5

# Auto-confirm rollback
./scripts/k8s-rollback.sh -y

# Use kubectl rollback
./scripts/k8s-rollback.sh --k8s-only
```

## Configuration

### Environment Variables

Each service supports environment-specific configuration:

**Common Variables:**
- `NODE_ENV` - Environment (development/staging/production)
- `PORT` - Service port
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `CORS_ORIGIN` - CORS allowed origins

**Auth Service:**
- `JWT_SECRET` - JWT signing secret
- `JWT_ACCESS_EXPIRY` - Access token expiration (default: 15m)
- `JWT_REFRESH_EXPIRY` - Refresh token expiration (default: 7d)

**Notification Service:**
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `EMAIL_FROM` - Default sender email

### Secrets Management

**Development:**
Use ConfigMaps and Secrets in k8s/base/

**Production:**
Use External Secrets Operator with Vault:

1. Enable in values-prod.yaml:
```yaml
externalSecrets:
  enabled: true
  provider: vault
  vaultUrl: https://vault.example.com
```

2. Create ExternalSecret resources:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: orion-secrets
spec:
  secretStoreRef:
    name: vault-backend
  target:
    name: orion-secrets
  data:
  - secretKey: jwt-secret
    remoteRef:
      key: secret/orion/auth
      property: jwt-secret
```

### Resource Limits

**Development:**
- CPU Request: 50m, Limit: 200m
- Memory Request: 64Mi, Limit: 256Mi

**Staging:**
- CPU Request: 100m, Limit: 500m
- Memory Request: 128Mi, Limit: 512Mi

**Production:**
- CPU Request: 200m, Limit: 1000m
- Memory Request: 256Mi, Limit: 1Gi

Adjust in values files based on load testing results.

### Auto-scaling

HorizontalPodAutoscaler configured per environment:

**Development:** Disabled

**Staging:**
- Min: 2, Max: 5
- CPU: 70%, Memory: 80%

**Production:**
- Gateway: Min: 3, Max: 20
- Auth: Min: 5, Max: 20
- User: Min: 3, Max: 20
- Notifications: Min: 3, Max: 20
- Admin UI: Min: 3, Max: 10

## Monitoring

### Health Checks

All services expose health endpoints:
- `/health` - General health check
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

### Prometheus Metrics

Metrics exposed on `/metrics` endpoint.

Enable ServiceMonitor:
```yaml
monitoring:
  enabled: true
  prometheus:
    enabled: true
    serviceMonitor:
      enabled: true
```

### Logging

View aggregated logs:
```bash
kubectl logs -n orion -l app.kubernetes.io/instance=orion --tail=100
```

Stream logs:
```bash
kubectl logs -n orion -f deployment/auth
```

### Grafana Dashboards

Access Grafana:
```bash
kubectl port-forward -n orion svc/grafana 3000:3000
```

Pre-configured dashboards included for:
- Service metrics
- Database performance
- Cache hit rates
- Message queue statistics

## Troubleshooting

### Common Issues

**Pods Not Starting:**
```bash
# Check pod status
kubectl get pods -n orion

# Describe pod
kubectl describe pod <pod-name> -n orion

# Check logs
kubectl logs <pod-name> -n orion

# Check events
kubectl get events -n orion --sort-by='.lastTimestamp'
```

**Database Connection Issues:**
```bash
# Check PostgreSQL pod
kubectl get pods -n orion -l app=postgresql

# Test connectivity
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -n orion -- \
  psql postgresql://orion:password@postgresql:5432/orion_prod
```

**Image Pull Errors:**
```bash
# Check image pull secrets
kubectl get secrets -n orion

# Create docker registry secret
kubectl create secret docker-registry regcred \
  --docker-server=docker.io \
  --docker-username=USERNAME \
  --docker-password=PASSWORD \
  -n orion
```

**Resource Constraints:**
```bash
# Check resource usage
kubectl top pods -n orion
kubectl top nodes

# Adjust resource limits in values file
helm upgrade orion ./helm/orion \
  --set auth.resources.limits.memory=1Gi
```

### Debugging

Access pod shell:
```bash
kubectl exec -it <pod-name> -n orion -- /bin/sh
```

Port forward for local access:
```bash
kubectl port-forward -n orion svc/auth 3001:3001
```

Run diagnostic commands:
```bash
# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -n orion -- nslookup auth

# Check network connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n orion -- \
  curl http://auth:3001/health
```

## Best Practices

1. **Always use specific image tags** in production (never `:latest`)
2. **Store secrets in external secret manager** (Vault, AWS Secrets Manager)
3. **Enable resource limits** to prevent resource exhaustion
4. **Use HPA** for automatic scaling based on load
5. **Enable monitoring** and set up alerts
6. **Implement network policies** to restrict pod-to-pod communication
7. **Regular backups** of PostgreSQL and RabbitMQ data
8. **Test rollbacks** in staging before deploying to production
9. **Use blue-green or canary deployments** for zero-downtime updates
10. **Keep Helm charts and manifests in version control**

## Support

For issues and questions:
- Check logs: `kubectl logs -n orion -l app=<service>`
- Review events: `kubectl get events -n orion`
- Check documentation: `/docs`
- Contact: team@orion.dev
