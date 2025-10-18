# Canary Deployment Strategy

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Traffic Split Configuration](#traffic-split-configuration)
- [Deployment Process](#deployment-process)
- [Monitoring Requirements](#monitoring-requirements)
- [Rollback Procedures](#rollback-procedures)
- [Progressive Delivery Patterns](#progressive-delivery-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Canary deployments are a progressive delivery strategy that gradually rolls out changes to a small subset of users before making them available to everyone. This approach minimizes the risk of introducing bugs or performance issues to production.

### Key Benefits

- **Risk Mitigation**: Issues affect only a small percentage of users initially
- **Early Detection**: Problems are identified before full rollout
- **Quick Rollback**: Easy to revert changes if issues are detected
- **Data-Driven Decisions**: Metrics guide promotion or rollback decisions
- **Zero Downtime**: No service interruption during deployment

### When to Use Canary Deployments

Use canary deployments for:
- High-traffic production services
- Critical business applications
- Features with uncertain performance impact
- Major version upgrades
- Database schema changes (with careful planning)

## Architecture

### Service Mesh Integration

The ORION platform supports two service mesh options for canary deployments:

#### Istio

```yaml
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
        subset: stable
      weight: 95
    - destination:
        host: auth-service
        subset: canary
      weight: 5
```

**Advantages:**
- Rich traffic management capabilities
- Built-in observability
- Advanced routing rules
- mTLS support

#### Linkerd

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: auth-service-split
spec:
  service: auth-service
  backends:
  - service: auth-service-stable
    weight: 950  # 95%
  - service: auth-service-canary
    weight: 50   # 5%
```

**Advantages:**
- Lightweight and fast
- Simple configuration
- Lower resource overhead
- SMI specification compliance

### Deployment Components

1. **Stable Deployment**: Current production version serving 95% of traffic
2. **Canary Deployment**: New version serving 5% of traffic initially
3. **Base Service**: Routes traffic to both deployments
4. **Virtual Service/Traffic Split**: Manages traffic distribution
5. **Service Monitors**: Collect metrics from both versions
6. **Prometheus Alerts**: Monitor canary health

## Traffic Split Configuration

### Progressive Traffic Rollout

The default traffic progression is: **5% → 25% → 50% → 100%**

Each stage lasts for a configurable duration (default: 5 minutes) with health checks between stages.

### Traffic Split Updates

#### Using Istio

```bash
# Update to 25% canary traffic
kubectl patch virtualservice auth-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 75},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 25}
  ]'
```

#### Using Linkerd

```bash
# Update to 25% canary traffic
kubectl patch trafficsplit auth-service-split -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/backends/0/weight", "value": 750},
    {"op": "replace", "path": "/spec/backends/1/weight", "value": 250}
  ]'
```

### Header-Based Routing

Force traffic to canary for testing:

```bash
curl -H "x-canary: true" https://api.orion.io/auth/login
```

This sends 100% of requests with the `x-canary` header to the canary version.

## Deployment Process

### Prerequisites

1. Service mesh installed (Istio or Linkerd)
2. Prometheus operator deployed
3. Stable version running in production
4. Canary manifest configured
5. Health endpoints implemented

### Automated Deployment

Use the provided deployment script:

```bash
./scripts/deployment/canary-deploy.sh auth-service ghcr.io/orion/auth:v2.0.0 \
  --namespace orion \
  --mesh istio \
  --error-threshold 5 \
  --latency-p95 500 \
  --traffic-steps "5,25,50,100" \
  --step-duration 5 \
  --auto-promote
```

#### Script Options

| Option | Description | Default |
|--------|-------------|---------|
| `--namespace` | Kubernetes namespace | orion |
| `--mesh` | Service mesh (istio\|linkerd) | istio |
| `--error-threshold` | Max error rate % | 5 |
| `--latency-p95` | Max P95 latency ms | 500 |
| `--traffic-steps` | Traffic progression | 5,25,50,100 |
| `--step-duration` | Duration per step (min) | 5 |
| `--dry-run` | Simulate without applying | false |
| `--auto-promote` | Auto-promote on success | false |

### Manual Deployment

#### Step 1: Deploy Canary Version

```bash
# Update canary deployment image
kubectl set image deployment/auth-service-canary \
  auth-service=ghcr.io/orion/auth:v2.0.0 \
  -n orion

# Wait for rollout
kubectl rollout status deployment/auth-service-canary -n orion
```

#### Step 2: Monitor Initial Traffic (5%)

```bash
# Use monitoring script
./scripts/deployment/canary-monitor.sh auth-service \
  --namespace orion \
  --interval 10 \
  --duration 5
```

#### Step 3: Increase Traffic Gradually

```bash
# Increase to 25%
kubectl patch virtualservice auth-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 75},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 25}
  ]'

# Monitor for 5 minutes, then continue to 50%, 100%
```

#### Step 4: Promote to Stable

```bash
# Update stable deployment
kubectl set image deployment/auth-service-stable \
  auth-service=ghcr.io/orion/auth:v2.0.0 \
  -n orion

# Wait for rollout
kubectl rollout status deployment/auth-service-stable -n orion

# Reset traffic to 100% stable
kubectl patch virtualservice auth-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
  ]'

# Scale down canary
kubectl scale deployment auth-service-canary -n orion --replicas=0
```

## Monitoring Requirements

### Key Metrics

Monitor these metrics for both stable and canary versions:

1. **Error Rate**: Percentage of 5xx responses
2. **Latency**: P50, P95, P99 response times
3. **Request Rate**: Requests per second
4. **Success Rate**: Percentage of 2xx responses
5. **CPU Usage**: Container CPU utilization
6. **Memory Usage**: Container memory utilization

### Success Criteria

| Metric | Threshold | Action if Exceeded |
|--------|-----------|-------------------|
| Error Rate | > 5% | Immediate rollback |
| P95 Latency | > 500ms | Warning, consider rollback |
| P99 Latency | > 1000ms | Immediate rollback |
| Success Rate | < 95% | Immediate rollback |
| CPU Usage | > 80% | Warning, monitor |
| Memory Usage | > 80% | Warning, monitor |

### Prometheus Queries

```promql
# Error rate
sum(rate(http_requests_total{job="auth-service-canary",status=~"5.."}[5m]))
/
sum(rate(http_requests_total{job="auth-service-canary"}[5m]))
* 100

# P95 latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{job="auth-service-canary"}[5m])) by (le)
) * 1000

# Success rate
sum(rate(http_requests_total{job="auth-service-canary",status=~"2.."}[5m]))
/
sum(rate(http_requests_total{job="auth-service-canary"}[5m]))
* 100
```

### Grafana Dashboards

Import the canary deployment dashboard:

```bash
kubectl apply -f k8s/monitoring/grafana/canary-dashboard.yaml
```

Access at: `https://grafana.orion.io/d/canary-deployment`

## Rollback Procedures

### Automated Rollback

The deployment script automatically rolls back if thresholds are exceeded:

```bash
./scripts/deployment/canary-deploy.sh auth-service ghcr.io/orion/auth:v2.0.0
# Automatic rollback on threshold violation
```

### Manual Rollback

If you need to manually rollback:

```bash
# Set traffic to 0% canary
kubectl patch virtualservice auth-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
  ]'

# Scale down canary deployment
kubectl scale deployment auth-service-canary -n orion --replicas=0

# Verify stable version is handling all traffic
kubectl get pods -n orion -l app=auth-service,version=stable
```

### Emergency Rollback

For critical issues:

```bash
# Immediate traffic cutoff
kubectl delete virtualservice auth-service -n orion

# This routes all traffic to stable version via base service
# Recreate VirtualService with 0% canary traffic
kubectl apply -f k8s/deployment-strategies/canary/auth-canary.yaml

# Patch to 0% canary
kubectl patch virtualservice auth-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
  ]'
```

## Progressive Delivery Patterns

### Feature Flags Integration

Combine canary deployments with feature flags for fine-grained control:

```typescript
// Service code
if (featureFlags.isEnabled('new-auth-flow')) {
  return newAuthenticationHandler(request);
} else {
  return legacyAuthenticationHandler(request);
}
```

Deploy canary with feature flag enabled for gradual rollout.

### User-Based Routing

Route specific users to canary:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  http:
  - match:
    - headers:
        x-user-tier:
          exact: "beta"
    route:
    - destination:
        host: auth-service
        subset: canary
  - route:
    - destination:
        host: auth-service
        subset: stable
      weight: 95
    - destination:
        host: auth-service
        subset: canary
      weight: 5
```

### Geographic Routing

Deploy canary to specific regions first:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  http:
  - match:
    - headers:
        x-region:
          exact: "us-west-2"
    route:
    - destination:
        host: auth-service
        subset: canary
  - route:
    - destination:
        host: auth-service
        subset: stable
```

### Time-Based Rollout

Schedule canary rollout during low-traffic periods:

```bash
# Deploy at 2 AM UTC
echo "0 2 * * * /path/to/canary-deploy.sh auth-service ..." | crontab -
```

## Best Practices

### 1. Define Clear Success Criteria

Document specific metrics and thresholds before deployment:

```yaml
# deployment-config.yaml
successCriteria:
  errorRate:
    threshold: 5
    unit: percent
  latencyP95:
    threshold: 500
    unit: milliseconds
  minimumDuration: 5
  minimumRequests: 1000
```

### 2. Monitor Comparison Metrics

Always compare canary to stable:

```promql
# Canary error rate vs stable
(canary:error_rate:5m / stable:error_rate:5m) > 2
```

### 3. Use Gradual Traffic Increases

Never jump directly to high traffic percentages:
- ✅ Good: 5% → 25% → 50% → 100%
- ❌ Bad: 5% → 100%

### 4. Wait Between Stages

Allow sufficient time for metrics to stabilize:
- Minimum 5 minutes per stage
- 10 minutes for critical services
- 15+ minutes for services with database migrations

### 5. Implement Health Checks

Ensure comprehensive health checks:

```typescript
// health.controller.ts
@Get('/health/readiness')
async readiness() {
  return {
    status: 'ok',
    version: process.env.VERSION,
    checks: {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
      dependencies: await this.checkDependencies()
    }
  };
}
```

### 6. Test Canary Manually

Use header-based routing to test before exposing to users:

```bash
# Test canary version
curl -H "x-canary: true" https://api.orion.io/auth/login

# Run automated tests against canary
./scripts/smoke-tests.sh --target canary
```

### 7. Document Rollback Procedures

Maintain runbooks for each service with specific rollback steps.

### 8. Use Circuit Breakers

Configure outlier detection to automatically remove unhealthy canary pods:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: auth-service
spec:
  trafficPolicy:
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Troubleshooting

### Canary Not Receiving Traffic

**Symptoms:**
- Canary pods running but receiving 0 requests
- Metrics show no activity

**Solutions:**

1. Check VirtualService/TrafficSplit configuration:
```bash
kubectl get virtualservice auth-service -n orion -o yaml
```

2. Verify service labels:
```bash
kubectl get pods -n orion -l app=auth-service,version=canary --show-labels
```

3. Check service mesh sidecar injection:
```bash
kubectl get pods -n orion -l app=auth-service,version=canary -o jsonpath='{.items[*].spec.containers[*].name}'
```

### High Error Rate in Canary

**Symptoms:**
- Canary error rate > 5%
- Alert: `CanaryHighErrorRate` firing

**Solutions:**

1. Check pod logs:
```bash
kubectl logs -n orion -l app=auth-service,version=canary --tail=100
```

2. Examine error details:
```bash
kubectl logs -n orion -l app=auth-service,version=canary | grep ERROR
```

3. Compare with stable version:
```bash
# Check if stable has same errors
kubectl logs -n orion -l app=auth-service,version=stable | grep ERROR
```

4. Rollback immediately if critical:
```bash
./scripts/deployment/canary-deploy.sh auth-service ghcr.io/orion/auth:v1.0.0
```

### Canary Latency Higher Than Stable

**Symptoms:**
- Canary P95 latency > stable P95 * 1.5
- Alert: `CanaryLatencyHigherThanStable` firing

**Solutions:**

1. Check resource utilization:
```bash
kubectl top pods -n orion -l app=auth-service,version=canary
```

2. Examine database queries:
```bash
# Check slow query logs
kubectl exec -n orion postgres-0 -- psql -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

3. Profile the application:
```bash
# Enable profiling endpoint
curl https://api.orion.io/auth/debug/pprof/profile?seconds=30
```

4. Increase resources if needed:
```bash
kubectl patch deployment auth-service-canary -n orion -p '{"spec":{"template":{"spec":{"containers":[{"name":"auth-service","resources":{"requests":{"cpu":"200m","memory":"256Mi"}}}]}}}}'
```

### Canary Pods Crash Looping

**Symptoms:**
- Pods restarting frequently
- Alert: `CanaryPodCrashLooping` firing

**Solutions:**

1. Check pod events:
```bash
kubectl describe pod -n orion -l app=auth-service,version=canary
```

2. View container logs:
```bash
kubectl logs -n orion -l app=auth-service,version=canary --previous
```

3. Check resource limits:
```bash
kubectl get deployment auth-service-canary -n orion -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

4. Verify environment variables:
```bash
kubectl get deployment auth-service-canary -n orion -o jsonpath='{.spec.template.spec.containers[0].env}'
```

### Traffic Split Not Working

**Symptoms:**
- All traffic going to stable or canary
- Incorrect traffic distribution

**Solutions:**

1. Verify service mesh installation:
```bash
# For Istio
kubectl get pods -n istio-system

# For Linkerd
kubectl get pods -n linkerd
```

2. Check VirtualService/TrafficSplit:
```bash
kubectl get virtualservice auth-service -n orion -o yaml
```

3. Validate DestinationRule subsets:
```bash
kubectl get destinationrule auth-service -n orion -o yaml
```

4. Test with header routing:
```bash
curl -H "x-canary: true" https://api.orion.io/auth/health
```

## Additional Resources

- [Istio Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Linkerd Traffic Split](https://linkerd.io/2/features/traffic-split/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [ORION Monitoring Guide](../monitoring/README.md)
- [ORION Deployment Guide](../../k8s/DEPLOYMENT.md)

## Support

For issues or questions:
- Create an issue in the ORION repository
- Contact the platform team on Slack: #orion-deployments
- Email: devops@orion.io
