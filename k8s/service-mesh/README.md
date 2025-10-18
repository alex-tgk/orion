# ORION Service Mesh Configuration

This directory contains Istio service mesh configuration for the ORION platform.

## Directory Structure

```
service-mesh/
├── gateway.yaml                    # Istio ingress gateway configuration
├── virtual-services/               # Routing rules for each service
│   ├── auth-virtualservice.yaml
│   ├── gateway-virtualservice.yaml
│   ├── user-virtualservice.yaml
│   ├── notification-virtualservice.yaml
│   └── admin-ui-virtualservice.yaml
├── destination-rules/              # Service policies (circuit breakers, load balancing)
│   ├── auth-destinationrule.yaml
│   ├── gateway-destinationrule.yaml
│   ├── user-destinationrule.yaml
│   ├── notification-destinationrule.yaml
│   └── admin-ui-destinationrule.yaml
├── telemetry.yaml                  # Metrics, logging, and tracing configuration
├── peer-authentication.yaml        # mTLS and authorization policies
├── kustomization.yaml              # Kustomize configuration
└── README.md                       # This file
```

## Quick Start

### Prerequisites

1. **Istio installed** (v1.20.0+)
   ```bash
   istioctl version
   ```

2. **Sidecar injection enabled**
   ```bash
   kubectl label namespace orion istio-injection=enabled
   ```

### Deploy All Resources

```bash
# Using kustomize
kubectl apply -k k8s/service-mesh/

# Or individually
kubectl apply -f k8s/service-mesh/gateway.yaml
kubectl apply -f k8s/service-mesh/virtual-services/
kubectl apply -f k8s/service-mesh/destination-rules/
kubectl apply -f k8s/service-mesh/telemetry.yaml
kubectl apply -f k8s/service-mesh/peer-authentication.yaml
```

### Automated Installation

```bash
# Run installation script
./scripts/service-mesh/install.sh

# With options
./scripts/service-mesh/install.sh --environment production --istio-version 1.20.0
```

## Components

### Gateway

**File**: `gateway.yaml`

Configures Istio ingress gateway for external traffic:
- HTTPS/TLS termination
- HTTP to HTTPS redirect
- Multi-domain support

**Usage**:
```bash
kubectl get gateway -n orion
kubectl describe gateway orion-gateway -n orion
```

### Virtual Services

**Directory**: `virtual-services/`

Defines routing rules for each service:
- Path-based routing
- Request timeouts
- Retry policies
- Fault injection
- Traffic mirroring

**Example**:
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  hosts:
  - auth-service
  http:
  - match:
    - uri:
        prefix: /api/auth/login
    route:
    - destination:
        host: auth-service
        subset: stable
    timeout: 10s
    retries:
      attempts: 2
```

**Usage**:
```bash
kubectl get virtualservice -n orion
kubectl describe virtualservice auth-service -n orion
```

### Destination Rules

**Directory**: `destination-rules/`

Configures service policies:
- Connection pooling
- Load balancing
- Circuit breakers
- Outlier detection
- Traffic subsets (canary/blue-green)

**Features**:
- **Connection Pool**: Limits concurrent connections
- **Circuit Breaker**: Ejects unhealthy instances
- **Load Balancer**: LEAST_REQUEST, ROUND_ROBIN, RANDOM
- **mTLS**: Enforces encrypted communication

**Usage**:
```bash
kubectl get destinationrule -n orion
kubectl describe destinationrule auth-service -n orion
```

### Telemetry

**File**: `telemetry.yaml`

Configures observability:
- Prometheus metrics
- Access logging
- Distributed tracing (Jaeger)
- Custom tags

**Sampling Rates**:
- Production: 10%
- Staging: 50%
- Debug: 100%

**Usage**:
```bash
kubectl get telemetry -n orion
```

### Security Policies

**File**: `peer-authentication.yaml`

Enforces security:
- **PeerAuthentication**: Enforces mTLS (STRICT mode)
- **AuthorizationPolicy**: Service-to-service authorization
- **Deny-all by default**: Requires explicit ALLOW rules

**Usage**:
```bash
kubectl get peerauthentication -n orion
kubectl get authorizationpolicy -n orion
```

## Configuration Examples

### Canary Deployment

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  http:
  - route:
    - destination:
        host: auth-service
        subset: stable
      weight: 90
    - destination:
        host: auth-service
        subset: canary
      weight: 10
```

### Circuit Breaker

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: auth-service
spec:
  host: auth-service
  trafficPolicy:
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

### Rate Limiting

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  http:
  - match:
    - uri:
        prefix: /api/auth/login
    route:
    - destination:
        host: auth-service
    fault:
      delay:
        percentage:
          value: 0.1
        fixedDelay: 5s
```

## Monitoring

### Kiali

View service topology:
```bash
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Open http://localhost:20001/kiali
```

### Jaeger

View distributed traces:
```bash
kubectl port-forward -n istio-system svc/jaeger-query 16686:16686
# Open http://localhost:16686
```

### Grafana Dashboards

Access dashboards:
- Service Mesh Overview: `/d/service-mesh-overview`
- Service Communication: `/d/service-communication`
- Traffic Patterns: `/d/traffic-patterns`
- Circuit Breaker Status: `/d/circuit-breaker-status`

## Common Operations

### Check Service Mesh Status

```bash
# Verify installation
istioctl verify-install

# Analyze configuration
istioctl analyze -n orion

# Check proxy status
istioctl proxy-status
```

### View Configuration

```bash
# View routes
istioctl proxy-config routes <pod-name> -n orion

# View clusters
istioctl proxy-config clusters <pod-name> -n orion

# View listeners
istioctl proxy-config listeners <pod-name> -n orion

# View all config
istioctl proxy-config all <pod-name> -n orion
```

### Debug Traffic

```bash
# View metrics
kubectl exec -n orion <pod-name> -c istio-proxy -- \
  curl localhost:15000/stats/prometheus | grep istio_requests

# View logs
kubectl logs -n orion <pod-name> -c istio-proxy

# Enable debug logging
istioctl proxy-config log <pod-name> -n orion --level debug
```

### Test Circuit Breaker

```bash
# Generate load
hey -z 30s -c 100 https://auth.orion.example.com/api/auth/health

# Check circuit breaker status in Grafana
# Dashboard: Circuit Breaker Status
```

## Troubleshooting

### Sidecar Not Injected

```bash
# Check namespace label
kubectl get namespace orion -o yaml | grep istio-injection

# Enable injection
kubectl label namespace orion istio-injection=enabled

# Restart pods
kubectl rollout restart deployment/auth-service -n orion
```

### Configuration Issues

```bash
# Analyze for issues
istioctl analyze -n orion

# Validate specific resource
istioctl validate -f k8s/service-mesh/virtual-services/auth-virtualservice.yaml
```

### mTLS Issues

```bash
# Check mTLS status
istioctl authn tls-check <pod-name>.<namespace>

# Verify peer authentication
kubectl get peerauthentication -n orion
```

## Best Practices

1. **Always test in staging** before production
2. **Use circuit breakers** for all services
3. **Set appropriate timeouts** for all routes
4. **Enable mTLS in STRICT mode** for production
5. **Monitor circuit breaker metrics** regularly
6. **Use canary deployments** for safe rollouts
7. **Keep Istio updated** for security patches
8. **Document custom configurations** in Git
9. **Review Kiali validations** weekly
10. **Test fault injection** in staging environment

## Resources

- **Full Documentation**: `/docs/service-mesh/README.md`
- **Installation Script**: `/scripts/service-mesh/install.sh`
- **Grafana Dashboards**: `/k8s/monitoring/grafana/dashboards/`
- **Istio Docs**: https://istio.io/latest/docs/
- **Kiali Docs**: https://kiali.io/docs/
- **Jaeger Docs**: https://www.jaegertracing.io/docs/

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Istio documentation
3. Analyze configuration: `istioctl analyze -n orion`
4. Check Kiali for validation errors
5. Review Grafana dashboards for anomalies
