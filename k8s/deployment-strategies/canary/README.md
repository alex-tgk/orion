# Canary Deployment Manifests

This directory contains Kubernetes manifests for canary deployments across all ORION microservices.

## Overview

Canary deployments allow you to gradually roll out new versions of services by directing a small percentage of traffic to the new version while monitoring its behavior. This approach minimizes risk and enables quick rollback if issues are detected.

## Structure

Each service has a dedicated canary manifest file:

- `auth-canary.yaml` - Authentication service canary deployment
- `gateway-canary.yaml` - API gateway canary deployment
- `notifications-canary.yaml` - Notification service canary deployment
- `user-canary.yaml` - User service canary deployment

## Manifest Components

Each canary manifest includes:

1. **Stable Deployment** - Current production version (95% traffic)
2. **Canary Deployment** - New version being tested (5% traffic initially)
3. **Base Service** - Routes traffic to both versions
4. **Istio VirtualService** - Manages traffic splitting (Istio)
5. **Istio DestinationRule** - Defines subsets and traffic policies
6. **Linkerd TrafficSplit** - Alternative traffic splitting (Linkerd)
7. **Linkerd Services** - Separate services for stable/canary (Linkerd)
8. **ServiceMonitors** - Prometheus metrics collection

## Service Mesh Options

### Using Istio

If you're using Istio, the VirtualService and DestinationRule resources will manage traffic splitting:

```bash
# Apply canary deployment
kubectl apply -f auth-canary.yaml

# Verify VirtualService
kubectl get virtualservice auth-service -n orion -o yaml
```

### Using Linkerd

If you're using Linkerd, the TrafficSplit resource will manage traffic distribution:

```bash
# Apply canary deployment
kubectl apply -f auth-canary.yaml

# Verify TrafficSplit
kubectl get trafficsplit auth-service-split -n orion -o yaml
```

## Quick Start

### 1. Deploy Canary Version

```bash
# Choose a service (auth, gateway, notifications, user)
SERVICE_NAME="auth"

# Apply the canary manifest
kubectl apply -f ${SERVICE_NAME}-canary.yaml

# Update canary image
kubectl set image deployment/${SERVICE_NAME}-service-canary \
  ${SERVICE_NAME}-service=ghcr.io/orion/${SERVICE_NAME}:v2.0.0 \
  -n orion
```

### 2. Monitor Canary

```bash
# Watch deployment rollout
kubectl rollout status deployment/${SERVICE_NAME}-service-canary -n orion

# Check pod status
kubectl get pods -n orion -l app=${SERVICE_NAME}-service,version=canary

# View logs
kubectl logs -n orion -l app=${SERVICE_NAME}-service,version=canary -f
```

### 3. Adjust Traffic Split

#### Istio

```bash
# Increase to 25% canary traffic
kubectl patch virtualservice ${SERVICE_NAME}-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 75},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 25}
  ]'
```

#### Linkerd

```bash
# Increase to 25% canary traffic
kubectl patch trafficsplit ${SERVICE_NAME}-service-split -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/backends/0/weight", "value": 750},
    {"op": "replace", "path": "/spec/backends/1/weight", "value": 250}
  ]'
```

### 4. Promote or Rollback

#### Promote to Stable

```bash
# Update stable deployment with canary image
kubectl set image deployment/${SERVICE_NAME}-service-stable \
  ${SERVICE_NAME}-service=ghcr.io/orion/${SERVICE_NAME}:v2.0.0 \
  -n orion

# Wait for rollout
kubectl rollout status deployment/${SERVICE_NAME}-service-stable -n orion

# Reset traffic to 100% stable
kubectl patch virtualservice ${SERVICE_NAME}-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
  ]'

# Scale down canary
kubectl scale deployment ${SERVICE_NAME}-service-canary -n orion --replicas=0
```

#### Rollback Canary

```bash
# Set traffic to 0% canary
kubectl patch virtualservice ${SERVICE_NAME}-service -n orion --type=json \
  -p='[
    {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
    {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
  ]'

# Scale down canary
kubectl scale deployment ${SERVICE_NAME}-service-canary -n orion --replicas=0
```

## Automated Deployment

Use the provided deployment script for automated canary rollouts:

```bash
# Basic usage
../../scripts/deployment/canary-deploy.sh auth-service ghcr.io/orion/auth:v2.0.0

# With custom options
../../scripts/deployment/canary-deploy.sh auth-service ghcr.io/orion/auth:v2.0.0 \
  --namespace orion \
  --mesh istio \
  --error-threshold 5 \
  --latency-p95 500 \
  --traffic-steps "5,25,50,100" \
  --step-duration 5 \
  --auto-promote
```

## Monitoring

### Real-time Monitoring

Use the monitoring script to watch canary health:

```bash
../../scripts/deployment/canary-monitor.sh auth-service \
  --namespace orion \
  --interval 10 \
  --duration 30
```

### Prometheus Metrics

Key metrics to monitor:

```promql
# Error rate
canary:error_rate:5m{job="auth-service-canary"}

# Latency P95
canary:latency_p95:5m{job="auth-service-canary"}

# Request rate
canary:request_rate:5m{job="auth-service-canary"}

# Traffic percentage
canary:traffic_percentage:5m{service="auth-service"}
```

### Alerts

Prometheus alerts are configured in `../../monitoring/canary-alerts.yaml`:

- `CanaryHighErrorRate` - Error rate > 5%
- `CanaryHighLatencyP95` - P95 latency > 500ms
- `CanaryLowSuccessRate` - Success rate < 95%
- `CanaryPodsNotReady` - Pods not ready
- And more...

## Traffic Split Percentages

Default progressive rollout:

| Stage | Stable | Canary | Duration | Decision Point |
|-------|--------|--------|----------|---------------|
| 1 | 95% | 5% | 5 min | Monitor metrics |
| 2 | 75% | 25% | 5 min | Check error rates |
| 3 | 50% | 50% | 5 min | Verify latency |
| 4 | 0% | 100% | 5 min | Final validation |
| 5 | 100% | 0% | - | Promote to stable |

## Header-Based Routing

Test canary version directly:

```bash
# Route request to canary
curl -H "x-canary: true" https://api.orion.io/auth/health

# Route request to stable
curl https://api.orion.io/auth/health
```

## Best Practices

1. **Start Small**: Begin with 5% traffic
2. **Monitor Closely**: Watch error rates and latency
3. **Be Patient**: Wait 5+ minutes between traffic increases
4. **Compare Versions**: Always compare canary vs stable metrics
5. **Have a Rollback Plan**: Document rollback procedures
6. **Test First**: Use header-based routing to test canary manually
7. **Automate**: Use the deployment script for consistency
8. **Alert Early**: Configure alerts for automatic detection

## Troubleshooting

### Canary Not Receiving Traffic

1. Check VirtualService/TrafficSplit configuration
2. Verify pod labels match service selector
3. Ensure service mesh sidecar is injected

```bash
# Check labels
kubectl get pods -n orion -l app=${SERVICE_NAME}-service,version=canary --show-labels

# Check sidecar
kubectl get pods -n orion -l app=${SERVICE_NAME}-service,version=canary \
  -o jsonpath='{.items[*].spec.containers[*].name}'
```

### High Error Rate

1. Check pod logs for errors
2. Verify environment variables
3. Check database connectivity
4. Compare with stable version

```bash
# View logs
kubectl logs -n orion -l app=${SERVICE_NAME}-service,version=canary --tail=100

# Check environment
kubectl get deployment ${SERVICE_NAME}-service-canary -n orion \
  -o jsonpath='{.spec.template.spec.containers[0].env}'
```

### Pods Crash Looping

1. Check resource limits
2. Review pod events
3. Examine startup probes

```bash
# Describe pod
kubectl describe pod -n orion -l app=${SERVICE_NAME}-service,version=canary

# Check previous logs
kubectl logs -n orion -l app=${SERVICE_NAME}-service,version=canary --previous
```

## Additional Resources

- [Canary Strategy Documentation](../../../docs/deployment/canary-strategy.md)
- [Deployment Scripts](../../../scripts/deployment/)
- [Monitoring Guide](../../../docs/monitoring/README.md)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Linkerd Documentation](https://linkerd.io/2/overview/)

## Support

For issues or questions:
- Create an issue in the ORION repository
- Contact the platform team on Slack: #orion-deployments
- Email: devops@orion.io
