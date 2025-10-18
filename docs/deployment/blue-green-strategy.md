# Blue-Green Deployment Strategy

## Table of Contents
- [Overview](#overview)
- [Blue-Green Deployment Concept](#blue-green-deployment-concept)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Deployment Process](#deployment-process)
- [Traffic Switching](#traffic-switching)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring and Validation](#monitoring-and-validation)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Overview

Blue-green deployment is a release management strategy that reduces downtime and risk by running two identical production environments called Blue and Green. Only one environment serves production traffic at any given time, while the other remains idle or is used for testing new releases.

### Benefits

- **Zero-downtime deployments**: Traffic switches instantly from one environment to another
- **Quick rollbacks**: Instant rollback by switching traffic back to the previous environment
- **Testing in production**: New version can be tested in production infrastructure before going live
- **Reduced risk**: Problems with new version don't affect users until traffic is switched
- **Easy disaster recovery**: Previous version remains running and ready to take traffic

### When to Use Blue-Green Deployments

- Critical production services requiring zero downtime
- Applications where instant rollback is essential
- Services needing production environment testing before release
- Systems with complex state management requiring identical environments

## Blue-Green Deployment Concept

### How It Works

1. **Initial State**: Blue environment is active, serving all production traffic
2. **Deploy New Version**: Deploy new version to Green environment (inactive)
3. **Test**: Run tests against Green environment while Blue continues serving traffic
4. **Switch Traffic**: Route all traffic from Blue to Green
5. **Monitor**: Watch Green environment for issues
6. **Deactivate Old**: Scale down Blue environment if Green is stable
7. **Next Deployment**: Green is now active, next deployment goes to Blue

### Key Components

#### Deployments
- **Blue Deployment**: Current production version
- **Green Deployment**: New version being deployed
- Both deployments are identical except for the application version

#### Services
- **Main Service**: Routes traffic to active slot (blue or green)
- **Blue Service**: Direct access to blue deployment (testing)
- **Green Service**: Direct access to green deployment (testing)

#### Slots
A "slot" is identified by the `slot` label on pods:
- `slot: blue` - Blue environment pods
- `slot: green` - Green environment pods

## Architecture

### Service Structure

```yaml
# Main service (routes to active slot)
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  annotations:
    deployment.orion.io/active-slot: "blue"  # Current active slot
spec:
  selector:
    app: auth-service
    slot: blue  # Routes to blue pods
```

### Deployment Structure

```yaml
# Blue deployment (currently active)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service-blue
  labels:
    version: blue
spec:
  replicas: 3
  template:
    metadata:
      labels:
        slot: blue  # Identifies this as blue slot
---
# Green deployment (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service-green
  labels:
    version: green
spec:
  replicas: 0  # Initially scaled to 0
  template:
    metadata:
      labels:
        slot: green  # Identifies this as green slot
```

### Traffic Flow

```
                                    ┌─────────────────┐
                                    │  Load Balancer  │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Main Service   │
                                    │  (selector:     │
                                    │   slot=blue)    │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    │                                                  │
         ┌──────────▼──────────┐                          ┌──────────▼──────────┐
         │  Blue Deployment    │                          │  Green Deployment   │
         │  (Active: 3 pods)   │                          │  (Inactive: 0 pods) │
         │  Version: v1.0.0    │                          │  Version: v1.1.0    │
         └─────────────────────┘                          └─────────────────────┘
```

## Prerequisites

### Tools Required
- `kubectl` - Kubernetes CLI
- `jq` - JSON processor
- `curl` - HTTP client
- Access to Kubernetes cluster with appropriate permissions

### Kubernetes Resources
- Namespace created (`orion`)
- RBAC permissions for deployments and services
- Sufficient cluster resources for running both environments

### Before Deployment
1. Ensure Docker images are built and pushed
2. Run tests in staging environment
3. Database migrations completed (if required)
4. Configuration and secrets are up to date
5. Monitoring and alerting are configured

## Deployment Process

### Step 1: Prepare New Version

```bash
# Build and push Docker image
docker build -t ghcr.io/orion/auth:v1.2.3 .
docker push ghcr.io/orion/auth:v1.2.3
```

### Step 2: Run Deployment Script

```bash
# Deploy auth service with automatic traffic switch
./scripts/deployment/blue-green-deploy.sh auth v1.2.3

# Deploy without switching traffic (for testing)
./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --no-switch

# Deploy with dry-run to preview changes
./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --dry-run

# Deploy all services
./scripts/deployment/blue-green-deploy.sh all v1.2.3
```

### Step 3: Deployment Script Workflow

The script performs the following automatically:

1. **Validate Prerequisites**
   - Check required tools
   - Verify cluster connection
   - Confirm namespace exists

2. **Determine Slots**
   - Identify current active slot (blue or green)
   - Target inactive slot for deployment

3. **Deploy New Version**
   - Update deployment image
   - Scale up inactive deployment
   - Wait for pods to be ready

4. **Run Health Checks**
   - Verify all pods are healthy
   - Check readiness probes
   - Validate startup probes

5. **Execute Smoke Tests**
   - Test health endpoints
   - Validate basic functionality
   - Check service connectivity

6. **Switch Traffic**
   - Update service selector
   - Route traffic to new version
   - Update annotations

7. **Monitor**
   - Watch for errors
   - Check pod status
   - Verify metrics

8. **Scale Down Old Version**
   - Once stable, scale down previous version
   - Keep for quick rollback if needed

### Manual Deployment Steps

If you need to deploy manually:

```bash
# 1. Identify current active slot
ACTIVE_SLOT=$(kubectl get service auth-service -n orion \
  -o jsonpath='{.spec.selector.slot}')
echo "Active slot: $ACTIVE_SLOT"

# 2. Determine inactive slot
if [ "$ACTIVE_SLOT" == "blue" ]; then
  INACTIVE_SLOT="green"
else
  INACTIVE_SLOT="blue"
fi

# 3. Update inactive deployment image
kubectl set image deployment/auth-service-${INACTIVE_SLOT} \
  auth-service=ghcr.io/orion/auth:v1.2.3 -n orion

# 4. Scale up inactive deployment
kubectl scale deployment auth-service-${INACTIVE_SLOT} \
  --replicas=3 -n orion

# 5. Wait for rollout
kubectl rollout status deployment/auth-service-${INACTIVE_SLOT} -n orion

# 6. Test the new deployment
kubectl port-forward service/auth-service-${INACTIVE_SLOT} 8080:80 -n orion
curl http://localhost:8080/health

# 7. Switch traffic (update service selector)
kubectl patch service auth-service -n orion \
  -p "{\"spec\":{\"selector\":{\"slot\":\"${INACTIVE_SLOT}\"}}}"

# 8. Update annotation
kubectl annotate service auth-service -n orion \
  "deployment.orion.io/active-slot=${INACTIVE_SLOT}" --overwrite

# 9. Monitor the new deployment
kubectl get pods -n orion -l slot=${INACTIVE_SLOT} -w

# 10. Scale down old deployment
kubectl scale deployment auth-service-${ACTIVE_SLOT} \
  --replicas=0 -n orion
```

## Traffic Switching

### Service Selector Method

Traffic switching is accomplished by updating the Kubernetes Service selector:

```bash
# Switch to green
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"green"}}}'

# Switch to blue
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'
```

### Verification

```bash
# Check active slot
kubectl get service auth-service -n orion \
  -o jsonpath='{.spec.selector.slot}'

# Check annotation
kubectl get service auth-service -n orion \
  -o jsonpath='{.metadata.annotations.deployment\.orion\.io/active-slot}'

# Verify pods receiving traffic
kubectl get endpoints auth-service -n orion -o yaml
```

### Gradual Traffic Shift (Advanced)

For more controlled rollouts, you can use a service mesh or ingress controller to gradually shift traffic:

```yaml
# Example with Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  hosts:
  - auth-service
  http:
  - route:
    - destination:
        host: auth-service
        subset: blue
      weight: 90
    - destination:
        host: auth-service
        subset: green
      weight: 10
```

## Rollback Procedures

### Quick Rollback

The fastest way to rollback is to switch traffic back to the previous slot:

```bash
# If green is active and having issues, switch back to blue
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'

# Update annotation
kubectl annotate service auth-service -n orion \
  "deployment.orion.io/active-slot=blue" --overwrite
```

### Using the Script

```bash
# The script automatically rolls back on failure if --auto-rollback is enabled (default)
./scripts/deployment/blue-green-deploy.sh auth v1.2.3

# Manual rollback by deploying previous version to inactive slot
./scripts/deployment/blue-green-deploy.sh auth v1.2.2
```

### Rollback Scenarios

#### Scenario 1: Issues Detected During Monitoring

```bash
# If automated monitoring detects issues, script automatically:
# 1. Switches traffic back to old slot
# 2. Scales down new deployment
# 3. Logs error details
```

#### Scenario 2: Issues Reported After Deployment

```bash
# 1. Verify current active slot
ACTIVE_SLOT=$(kubectl get service auth-service -n orion \
  -o jsonpath='{.spec.selector.slot}')

# 2. Switch back to previous slot
if [ "$ACTIVE_SLOT" == "blue" ]; then
  NEW_SLOT="green"
else
  NEW_SLOT="blue"
fi

kubectl patch service auth-service -n orion \
  -p "{\"spec\":{\"selector\":{\"slot\":\"${NEW_SLOT}\"}}}"

# 3. Verify rollback
kubectl get pods -n orion -l slot=${NEW_SLOT}
```

#### Scenario 3: Data Corruption or Critical Bug

```bash
# 1. Immediate rollback
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'

# 2. Scale down problematic deployment
kubectl scale deployment auth-service-green --replicas=0 -n orion

# 3. Investigate and fix data issues
# 4. Review logs
kubectl logs -n orion -l slot=green --tail=100
```

### Rollback Verification

```bash
# Check service is routing to correct slot
kubectl get service auth-service -n orion -o yaml | grep slot

# Verify pods are receiving traffic
kubectl get endpoints auth-service -n orion

# Check application logs
kubectl logs -n orion -l slot=blue --tail=50

# Monitor error rates
kubectl top pods -n orion -l slot=blue
```

## Monitoring and Validation

### Pre-Deployment Checks

```bash
# Verify cluster resources
kubectl top nodes

# Check existing deployment health
kubectl get deployments -n orion
kubectl get pods -n orion

# Review recent logs for issues
kubectl logs -n orion -l app=auth-service --tail=100
```

### During Deployment

Monitor these metrics:

1. **Pod Status**
   ```bash
   kubectl get pods -n orion -l slot=green -w
   ```

2. **Resource Usage**
   ```bash
   kubectl top pods -n orion -l slot=green
   ```

3. **Application Logs**
   ```bash
   kubectl logs -n orion -l slot=green -f
   ```

4. **Health Endpoints**
   ```bash
   # Port-forward and check health
   kubectl port-forward service/auth-service-green 8080:80 -n orion
   curl http://localhost:8080/health
   ```

### Post-Deployment Validation

```bash
# 1. Check all pods are running
kubectl get pods -n orion -l slot=green

# 2. Verify service endpoints
kubectl get endpoints auth-service -n orion

# 3. Run smoke tests
curl -sf http://auth-service.orion.svc.cluster.local/health

# 4. Check error rates in logs
kubectl logs -n orion -l slot=green --tail=100 | grep -i error

# 5. Monitor response times
# Use your APM tool (Prometheus, DataDog, etc.)
```

### Key Metrics to Monitor

- **Pod Health**: Ready/Running status
- **Response Times**: p50, p95, p99 latencies
- **Error Rates**: 4xx and 5xx responses
- **Resource Usage**: CPU and memory consumption
- **Database Connections**: Connection pool health
- **Queue Depth**: Message queue backlogs

### Automated Monitoring

Set up alerts for:
- Pod crash loops
- High error rates (> 5% 5xx errors)
- Slow response times (p95 > threshold)
- Resource exhaustion (CPU > 80%, Memory > 85%)
- Failed health checks

## Best Practices

### 1. Always Test Before Switching

```bash
# Deploy without switching
./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --no-switch

# Test thoroughly
kubectl port-forward service/auth-service-green 8080:80 -n orion
# Run comprehensive tests

# Then switch traffic
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"green"}}}'
```

### 2. Maintain Database Compatibility

- New version must work with current database schema
- Run migrations before deployment
- Use backward-compatible schema changes
- Test with production database dump in staging

### 3. Keep Both Environments Identical

- Same resource limits
- Same configuration (except version-specific)
- Same secrets and ConfigMaps
- Same network policies
- Same monitoring configuration

### 4. Implement Proper Health Checks

```yaml
# Comprehensive health checks
livenessProbe:
  httpGet:
    path: /api/auth/health/liveness
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/auth/health/readiness
    port: http
  initialDelaySeconds: 10
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /api/auth/health
    port: http
  failureThreshold: 30
  periodSeconds: 10
```

### 5. Use Feature Flags

- Deploy code with features disabled
- Enable features gradually after deployment
- Quick feature rollback without redeployment

### 6. Monitor Actively During Switch

```bash
# Monitor in real-time
watch kubectl get pods -n orion -l slot=green

# Stream logs
kubectl logs -n orion -l slot=green -f

# Check metrics dashboard
# Have Grafana/Prometheus open during switch
```

### 7. Document Each Deployment

- Record version deployed
- Note any issues encountered
- Document rollback triggers
- Keep runbook updated

### 8. Automate Common Tasks

- Use CI/CD for automated deployments
- Implement automated smoke tests
- Set up automated rollback triggers
- Create deployment notifications

### 9. Plan for State Management

- Session state should be external (Redis)
- Avoid local caching issues
- Plan for connection draining
- Handle in-flight requests gracefully

### 10. Regular Drills

- Practice rollback procedures regularly
- Test disaster recovery scenarios
- Validate monitoring and alerting
- Train team on procedures

## Troubleshooting

### Issue: Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n orion

# Common causes:
# - Image pull errors: Check image name and registry access
# - Resource limits: Check cluster capacity
# - Configuration errors: Verify ConfigMaps and Secrets
# - Health check failures: Review probe configuration
```

### Issue: Health Checks Failing

```bash
# Check pod logs
kubectl logs <pod-name> -n orion

# Port-forward and test manually
kubectl port-forward <pod-name> 8080:3001 -n orion
curl http://localhost:8080/health

# Common causes:
# - Database connectivity issues
# - Missing environment variables
# - Slow startup time (adjust initialDelaySeconds)
```

### Issue: Traffic Not Switching

```bash
# Verify service selector
kubectl get service auth-service -n orion -o yaml | grep -A 2 selector

# Check endpoints
kubectl get endpoints auth-service -n orion

# Verify pod labels
kubectl get pods -n orion --show-labels | grep auth-service

# Common causes:
# - Label mismatch between service selector and pods
# - Pods not ready
# - Network policy blocking traffic
```

### Issue: High Memory Usage

```bash
# Check resource usage
kubectl top pods -n orion -l slot=green

# Review resource limits
kubectl get deployment auth-service-green -n orion -o yaml | grep -A 4 resources

# Solutions:
# - Increase memory limits
# - Investigate memory leaks
# - Profile application
# - Optimize garbage collection
```

### Issue: Database Connection Errors

```bash
# Check database connectivity
kubectl exec -it <pod-name> -n orion -- sh
# Inside pod:
nc -zv database-host 5432

# Verify database secrets
kubectl get secret auth-secrets -n orion -o yaml

# Common causes:
# - Wrong database URL
# - Network policies blocking egress
# - Database connection limits reached
# - Authentication failures
```

### Issue: Deployment Timeout

```bash
# Check rollout status
kubectl rollout status deployment/auth-service-green -n orion

# Review events
kubectl get events -n orion --sort-by='.lastTimestamp'

# Common causes:
# - Image pull timeout
# - Slow startup (increase timeout)
# - Resource contention
# - Persistent volume mounting issues
```

## Advanced Topics

### Blue-Green with Database Migrations

```bash
# 1. Run forward-compatible migration
kubectl exec -it <migration-pod> -- ./migrate.sh up

# 2. Deploy new version to green
./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --no-switch

# 3. Test with new schema
# ... testing ...

# 4. Switch traffic
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"green"}}}'

# 5. If rollback needed:
# Switch back and run backward migration
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'
kubectl exec -it <migration-pod> -- ./migrate.sh down
```

### Canary Releases with Blue-Green

Use both strategies together:

```bash
# 1. Deploy to green
./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --no-switch

# 2. Route 10% traffic to green using ingress
# (Configure ingress controller for weighted routing)

# 3. Monitor canary
# ... watch metrics ...

# 4. If successful, switch all traffic
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"green"}}}'
```

### Multi-Region Blue-Green

```bash
# Deploy to all regions in sequence
for region in us-east-1 eu-west-1 ap-south-1; do
  kubectl config use-context $region
  ./scripts/deployment/blue-green-deploy.sh auth v1.2.3
  # Monitor region before proceeding
  sleep 300
done
```

### Blue-Green with Stateful Services

For services with persistent state:

```yaml
# Use StatefulSet instead of Deployment
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: auth-service-blue
spec:
  serviceName: auth-service-blue
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### Custom Health Checks

Implement comprehensive health endpoints:

```typescript
// Example health check endpoint
app.get('/health/readiness', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    rabbitmq: await checkRabbitMQ(),
    externalApi: await checkExternalAPI(),
  };

  const healthy = Object.values(checks).every(c => c.healthy);

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    version: process.env.npm_package_version,
    slot: process.env.DEPLOYMENT_SLOT,
    timestamp: new Date().toISOString(),
  });
});
```

### Integration with CI/CD

```yaml
# GitHub Actions example
name: Blue-Green Deploy

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG }}" > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Deploy
        run: |
          ./scripts/deployment/blue-green-deploy.sh auth ${{ github.ref_name }}

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"Deployment failed for ${{ github.ref_name }}"}'
```

## Conclusion

Blue-green deployments provide a robust strategy for zero-downtime releases with quick rollback capabilities. By maintaining two identical production environments and carefully orchestrating traffic switches, you can deploy with confidence while minimizing risk to your users.

Key takeaways:
- Always test thoroughly before switching traffic
- Monitor actively during and after deployment
- Keep rollback procedures well-practiced
- Automate where possible to reduce human error
- Document every deployment for future reference

For additional help or questions, consult the ORION platform documentation or reach out to the DevOps team.
