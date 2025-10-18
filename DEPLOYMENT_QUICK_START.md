# ORION Deployment Quick Start

Quick reference for deploying ORION microservices platform.

## Prerequisites

- Docker 24.0+ and Docker Compose 2.20+
- Kubernetes 1.27+ (for K8s deployment)
- Helm 3.12+ (for K8s deployment)
- pnpm 10.15.1

## 🚀 Local Development (Docker Compose)

### Start All Services
```bash
# Copy environment file
cp .env.example .env

# Start infrastructure and all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Access Services
- Gateway: http://localhost:3000
- Auth API: http://localhost:3001
- User API: http://localhost:3002
- Notifications API: http://localhost:3003
- Admin UI: http://localhost:3004
- Adminer (DB): http://localhost:8080
- Redis Commander: http://localhost:8081
- RabbitMQ Management: http://localhost:15672

### Common Commands
```bash
# Restart a service
docker compose restart auth

# Rebuild and restart
docker compose up -d --build auth

# View service logs
docker compose logs -f auth

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

## 🧪 Testing Environment

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker compose -f docker-compose.test.yml down
```

## 🏗️ Build Docker Images

```bash
# Build all services
./scripts/docker-build.sh

# Build specific service
./scripts/docker-build.sh --service auth

# Build with version tag
./scripts/docker-build.sh --version 1.0.0

# Build and push to registry
./scripts/docker-build.sh --push --version 1.0.0 --registry docker.io/yourorg
```

## ☸️ Kubernetes Deployment

### Development
```bash
./scripts/k8s-deploy.sh --environment dev
```

### Staging
```bash
./scripts/k8s-deploy.sh --environment staging \
  --set auth.secrets.jwtSecret=$JWT_SECRET
```

### Production
```bash
./scripts/k8s-deploy.sh --environment prod \
  --set postgresql.auth.password=$DB_PASSWORD \
  --set auth.secrets.jwtSecret=$JWT_SECRET \
  --set rabbitmq.auth.password=$RABBITMQ_PASSWORD
```

### Verify Deployment
```bash
# Check pods
kubectl get pods -n orion

# Check services
kubectl get services -n orion

# Check ingress
kubectl get ingress -n orion

# View logs
kubectl logs -n orion -l app=auth -f
```

## 🔄 Rollback

```bash
# Rollback to previous version
./scripts/k8s-rollback.sh

# Rollback to specific revision
./scripts/k8s-rollback.sh --revision 5

# View deployment history
helm history orion -n orion
```

## 🔧 Troubleshooting

### Docker Compose Issues
```bash
# View all logs
docker compose logs

# Check specific service
docker compose logs auth

# Restart failed service
docker compose restart auth

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Kubernetes Issues
```bash
# Check pod status
kubectl get pods -n orion

# Describe pod
kubectl describe pod <pod-name> -n orion

# View logs
kubectl logs <pod-name> -n orion

# Check events
kubectl get events -n orion --sort-by='.lastTimestamp'

# Port forward for debugging
kubectl port-forward -n orion svc/auth 3001:3001
```

### Database Issues
```bash
# Access PostgreSQL
docker compose exec postgres psql -U orion -d orion_dev

# In Kubernetes
kubectl exec -it -n orion postgresql-0 -- psql -U orion -d orion_prod
```

### Redis Issues
```bash
# Access Redis CLI
docker compose exec redis redis-cli

# In Kubernetes
kubectl exec -it -n orion redis-0 -- redis-cli
```

## 📊 Monitoring

### Check Service Health
```bash
# Docker Compose
curl http://localhost:3000/health  # Gateway
curl http://localhost:3001/api/auth/health  # Auth
curl http://localhost:3002/api/user/health  # User
curl http://localhost:3003/api/v1/health  # Notifications
curl http://localhost:3004/health  # Admin UI

# Kubernetes
kubectl get pods -n orion -w  # Watch pod status
kubectl top pods -n orion     # Resource usage
```

### View Metrics
```bash
# In Kubernetes with Prometheus
kubectl port-forward -n orion svc/prometheus 9090:9090

# Access Grafana
kubectl port-forward -n orion svc/grafana 3000:3000
```

## 🔐 Secrets Management

### Docker Compose
Update .env file:
```bash
vi .env
docker compose up -d  # Restart to apply
```

### Kubernetes
```bash
# Create secret
kubectl create secret generic orion-secrets \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=db-password=$DB_PASSWORD \
  -n orion

# Update secret
kubectl edit secret orion-secrets -n orion

# Using Helm
./scripts/k8s-deploy.sh --environment prod \
  --set auth.secrets.jwtSecret=$JWT_SECRET
```

## 🔄 Updates and Upgrades

### Docker Compose
```bash
# Pull latest images
docker compose pull

# Rebuild and restart
docker compose up -d --build
```

### Kubernetes
```bash
# Update Helm release
helm upgrade orion ./helm/orion \
  --namespace orion \
  --values ./helm/orion/values-prod.yaml

# Update with new image version
./scripts/k8s-deploy.sh --environment prod \
  --set gateway.image.tag=1.1.0
```

## 📝 Environment Configuration

### Docker Compose (.env)
```bash
# Core
NODE_ENV=development
JWT_SECRET=your-secret-key

# Database
DB_USER=orion
DB_PASSWORD=orion_dev
DB_NAME=orion_dev

# Ports
GATEWAY_PORT=3000
AUTH_PORT=3001
USER_PORT=3002
NOTIFICATION_PORT=3003
ADMIN_UI_PORT=3004
```

### Kubernetes (Helm Values)
```yaml
# values-prod.yaml
auth:
  replicaCount: 5
  secrets:
    jwtSecret: "override-with-real-secret"

postgresql:
  auth:
    password: "override-with-real-password"
```

## 🎯 Common Workflows

### Deploy New Feature
```bash
# 1. Build new images
./scripts/docker-build.sh --version 1.1.0 --push

# 2. Deploy to staging
./scripts/k8s-deploy.sh --environment staging \
  --set gateway.image.tag=1.1.0

# 3. Test staging
# ... run tests ...

# 4. Deploy to production
./scripts/k8s-deploy.sh --environment prod \
  --set gateway.image.tag=1.1.0
```

### Rollback After Failed Deploy
```bash
# 1. Check current status
kubectl get pods -n orion

# 2. View deployment history
helm history orion -n orion

# 3. Rollback
./scripts/k8s-rollback.sh --revision 10

# 4. Verify
kubectl get pods -n orion
```

### Scale Services
```bash
# Docker Compose (not recommended for production)
docker compose up -d --scale auth=3

# Kubernetes (manual)
kubectl scale deployment auth --replicas=5 -n orion

# Kubernetes (using HPA - recommended)
# HPA automatically scales based on CPU/memory
kubectl get hpa -n orion
```

## 📚 Additional Resources

- Full Guide: [DOCKER_K8S_GUIDE.md](./DOCKER_K8S_GUIDE.md)
- Implementation Details: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)
- Environment Variables: [.env.example](./.env.example)

## 🆘 Getting Help

```bash
# Script help
./scripts/docker-build.sh --help
./scripts/k8s-deploy.sh --help
./scripts/k8s-rollback.sh --help

# Kubernetes debugging
kubectl describe pod <pod-name> -n orion
kubectl logs <pod-name> -n orion --previous  # Previous container logs
kubectl exec -it <pod-name> -n orion -- /bin/sh  # Shell access

# Docker debugging
docker compose logs --tail=100 auth
docker compose exec auth /bin/sh
```

---

**Pro Tip:** Always test deployments in staging before production!
