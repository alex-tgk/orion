# Blue-Green Deployment Manifests

This directory contains Kubernetes manifests for blue-green deployments of ORION microservices.

## Overview

Blue-green deployment is a release management strategy that maintains two identical production environments (blue and green). Only one environment serves production traffic at any time, allowing for zero-downtime deployments and instant rollbacks.

## Directory Contents

- `auth-blue-green.yaml` - Auth service blue-green deployment
- `gateway-blue-green.yaml` - Gateway service blue-green deployment
- `notifications-blue-green.yaml` - Notification service blue-green deployment
- `user-blue-green.yaml` - User service blue-green deployment

## Manifest Structure

Each manifest contains:

1. **Blue Deployment** - Current/stable version deployment
2. **Green Deployment** - New version deployment (initially scaled to 0)
3. **Main Service** - Routes traffic to active slot (blue or green)
4. **Blue Service** - Direct access to blue deployment for testing
5. **Green Service** - Direct access to green deployment for testing
6. **ServiceAccount** - Shared between both deployments
7. **HorizontalPodAutoscaler** - Auto-scaling configuration for both slots

## Quick Start

### Deploy Manifests

```bash
# Apply blue-green configuration for auth service
kubectl apply -f auth-blue-green.yaml

# Apply all services
kubectl apply -f .
```

### Verify Deployment

```bash
# Check deployments
kubectl get deployments -n orion -l deployment-strategy=blue-green

# Check services
kubectl get services -n orion

# Check active slot
kubectl get service auth-service -n orion \
  -o jsonpath='{.metadata.annotations.deployment\.orion\.io/active-slot}'
```

## Usage

### Initial Setup

1. Apply the manifest:
   ```bash
   kubectl apply -f auth-blue-green.yaml
   ```

2. The blue deployment will start with replicas, green will be at 0

3. Traffic routes to blue by default

### Deploying New Version

Use the deployment script (recommended):

```bash
# From project root
./scripts/deployment/blue-green-deploy.sh auth v1.2.3
```

Or manually:

```bash
# 1. Update green deployment image
kubectl set image deployment/auth-service-green \
  auth-service=ghcr.io/orion/auth:v1.2.3 -n orion

# 2. Scale up green
kubectl scale deployment auth-service-green --replicas=3 -n orion

# 3. Wait for rollout
kubectl rollout status deployment/auth-service-green -n orion

# 4. Test green deployment
kubectl port-forward service/auth-service-green 8080:80 -n orion

# 5. Switch traffic to green
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"green"}}}'

# 6. Scale down blue
kubectl scale deployment auth-service-blue --replicas=0 -n orion
```

### Rollback

```bash
# Quick rollback - switch traffic back
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'

# Scale up blue if needed
kubectl scale deployment auth-service-blue --replicas=3 -n orion
```

## Service Architecture

### Traffic Flow

```
Traffic → Main Service (selector: slot=blue) → Blue Pods
                                              ↓ (on switch)
                                             Green Pods
```

### Slots

Pods are labeled with `slot: blue` or `slot: green`. The main service selector controls which slot receives traffic.

### Testing

Each slot has its own service for testing:
- `auth-service-blue` - Direct access to blue deployment
- `auth-service-green` - Direct access to green deployment
- `auth-service` - Main service (routes to active slot)

## Key Labels and Annotations

### Labels

- `app: <service-name>` - Service identifier
- `version: blue|green` - Deployment slot
- `slot: blue|green` - Pod slot identifier
- `deployment-strategy: blue-green` - Identifies blue-green deployments

### Annotations

On services:
- `deployment.orion.io/active-slot` - Currently active slot
- `deployment.orion.io/strategy` - Deployment strategy used

On deployments:
- `deployment.kubernetes.io/revision` - Deployment slot
- `deployment.orion.io/strategy` - Deployment strategy

## Environment Variables

Each deployment includes `DEPLOYMENT_SLOT` environment variable set to either "blue" or "green" for tracking and logging purposes.

## Resource Configuration

Both blue and green deployments have identical resource configurations:

**Auth Service:**
- Requests: 100m CPU, 128Mi memory
- Limits: 500m CPU, 512Mi memory

**Gateway:**
- Requests: 250m CPU, 256Mi memory
- Limits: 1000m CPU, 1Gi memory

**Notification Service:**
- Requests: 100m CPU, 128Mi memory
- Limits: 500m CPU, 512Mi memory

**User Service:**
- Requests: 250m CPU, 256Mi memory
- Limits: 500m CPU, 512Mi memory

## Auto-Scaling

HorizontalPodAutoscalers are configured for both slots:
- Min replicas: 3
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

## Health Checks

All deployments include:
- **Liveness Probe**: Ensures container is alive
- **Readiness Probe**: Determines if pod should receive traffic
- **Startup Probe**: Allows slow-starting applications time to initialize

## Security

All deployments follow security best practices:
- Run as non-root user (UID 1001)
- Read-only root filesystem
- Drop all capabilities
- No privilege escalation
- Pod anti-affinity for high availability

## Monitoring

All pods include Prometheus scraping annotations:
```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "<service-port>"
prometheus.io/path: "/metrics"
```

## Best Practices

1. **Always test before switching**: Use the slot-specific services to test new deployments
2. **Monitor after switch**: Watch metrics and logs after traffic switch
3. **Keep both running temporarily**: Don't scale down old deployment immediately
4. **Use automated script**: The blue-green-deploy.sh script handles all steps safely
5. **Document changes**: Note deployment details in change log

## Troubleshooting

### Traffic not switching

Check service selector:
```bash
kubectl get service auth-service -n orion -o yaml | grep -A 2 selector
```

### Pods not starting

Check pod status and logs:
```bash
kubectl describe pod <pod-name> -n orion
kubectl logs <pod-name> -n orion
```

### Health checks failing

Port-forward and test manually:
```bash
kubectl port-forward <pod-name> 8080:3001 -n orion
curl http://localhost:8080/health
```

## Related Documentation

- [Blue-Green Strategy Guide](../../../docs/deployment/blue-green-strategy.md)
- [Deployment Script](../../../scripts/deployment/blue-green-deploy.sh)
- [GitHub Actions Workflow](../../../.github/workflows/blue-green-deploy.yml)

## Support

For issues or questions:
- Check the [troubleshooting guide](../../../docs/deployment/blue-green-strategy.md#troubleshooting)
- Review deployment logs
- Contact DevOps team
