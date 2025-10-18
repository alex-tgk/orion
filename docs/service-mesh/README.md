# ORION Service Mesh Documentation

Comprehensive guide to the ORION platform's Istio-based service mesh implementation with advanced traffic management, security, and observability features.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Components](#components)
- [Traffic Management](#traffic-management)
- [Security Policies](#security-policies)
- [Observability Features](#observability-features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Monitoring with Kiali](#monitoring-with-kiali)
- [Distributed Tracing](#distributed-tracing)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

The ORION service mesh is built on Istio and provides:

- **Traffic Management**: Intelligent routing, load balancing, circuit breaking, and fault injection
- **Security**: Mutual TLS, authorization policies, and certificate management
- **Observability**: Metrics, logs, and distributed tracing with Kiali and Jaeger
- **Resilience**: Circuit breakers, retries, timeouts, and outlier detection

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Istio Control Plane                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Pilot   │  │  Citadel │  │  Galley  │  │  Mixer   │       │
│  │(Traffic) │  │ (Security)│  │ (Config) │  │(Telemetry)│      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Configuration
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Data Plane                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Gateway         │  │  Auth Service    │  │  User Service │ │
│  │  ┌────────────┐  │  │  ┌────────────┐  │  │  ┌──────────┐ │ │
│  │  │   Envoy    │  │  │  │   Envoy    │  │  │  │  Envoy   │ │ │
│  │  │   Proxy    │  │  │  │   Sidecar  │  │  │  │ Sidecar  │ │ │
│  │  └────────────┘  │  │  └────────────┘  │  │  └──────────┘ │ │
│  │  │ Application│  │  │  │ Application│  │  │  │Application││ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Telemetry
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Observability Stack                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Kiali   │  │  Jaeger  │  │Prometheus│  │ Grafana  │        │
│  │(Topology)│  │ (Tracing)│  │ (Metrics)│  │(Dashboard)│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Control Plane (Istio)

- **Istiod**: Unified control plane for traffic management, security, and configuration
- **Ingress Gateway**: Handles external traffic entering the mesh
- **Egress Gateway**: Controls traffic leaving the mesh (optional)

### Data Plane (Envoy Sidecars)

Each service pod contains:
- Application container
- Envoy proxy sidecar (automatically injected)
- Handles all inbound/outbound traffic

### Observability Stack

- **Kiali**: Service mesh visualization and topology
- **Jaeger**: Distributed tracing
- **Prometheus**: Metrics collection
- **Grafana**: Dashboard visualization

## Traffic Management

### Virtual Services

Virtual Services define routing rules for services. Example:

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
      perTryTimeout: 5s
```

**Features**:
- Path-based routing
- Request timeouts
- Automatic retries
- Traffic mirroring
- Fault injection

### Destination Rules

Destination Rules configure service policies:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: auth-service
spec:
  host: auth-service
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    loadBalancer:
      simple: LEAST_REQUEST
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

**Features**:
- Connection pooling
- Load balancing strategies
- Circuit breaking
- Outlier detection
- Traffic splitting (canary/blue-green)

### Gateway Configuration

Gateways manage ingress/egress traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: orion-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.orion.example.com"
    tls:
      mode: SIMPLE
      credentialName: orion-tls-credential
```

## Security Policies

### Mutual TLS (mTLS)

All service-to-service communication is encrypted:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: orion-mtls
  namespace: orion
spec:
  mtls:
    mode: STRICT  # Enforce mTLS for all services
```

**Benefits**:
- Encrypted communication
- Service identity verification
- No application code changes
- Automatic certificate rotation

### Authorization Policies

Fine-grained access control:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: auth-service-policy
spec:
  selector:
    matchLabels:
      app: auth-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/orion/sa/gateway-service"]
    to:
    - operation:
        paths: ["/api/auth/login"]
        methods: ["POST"]
```

**Features**:
- Service-to-service authorization
- Path and method-based rules
- Namespace isolation
- JWT validation support

## Observability Features

### Metrics Collection

Automatic metrics for:
- Request rate (RPS)
- Error rate (4xx, 5xx)
- Latency (p50, p95, p99)
- Traffic patterns
- Circuit breaker status

### Distributed Tracing

Jaeger integration provides:
- Request flow visualization
- Latency analysis
- Dependency mapping
- Error tracking

### Service Topology

Kiali shows:
- Real-time service graph
- Traffic flow
- Health status
- Configuration errors

## Installation

### Quick Start

```bash
# Run the automated installation script
./scripts/service-mesh/install.sh
```

### Manual Installation

#### 1. Install Istio

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH

# Install Istio with production profile
istioctl install --set profile=production -y

# Enable sidecar injection for namespaces
kubectl label namespace orion istio-injection=enabled
kubectl label namespace orion-staging istio-injection=enabled
kubectl label namespace orion-prod istio-injection=enabled
```

#### 2. Deploy Service Mesh Configuration

```bash
# Apply gateway configuration
kubectl apply -f k8s/service-mesh/gateway.yaml

# Apply virtual services
kubectl apply -f k8s/service-mesh/virtual-services/

# Apply destination rules
kubectl apply -f k8s/service-mesh/destination-rules/

# Apply telemetry configuration
kubectl apply -f k8s/service-mesh/telemetry.yaml

# Apply security policies
kubectl apply -f k8s/service-mesh/peer-authentication.yaml
```

#### 3. Deploy Kiali

```bash
kubectl apply -f k8s/monitoring/kiali/kiali-deployment.yaml

# Access Kiali UI
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Open http://localhost:20001/kiali
```

#### 4. Deploy Jaeger

```bash
kubectl apply -f k8s/monitoring/jaeger/jaeger-deployment.yaml

# Access Jaeger UI
kubectl port-forward -n istio-system svc/jaeger-query 16686:16686
# Open http://localhost:16686
```

#### 5. Import Grafana Dashboards

```bash
# Dashboards are automatically loaded from ConfigMap
kubectl create configmap grafana-dashboards \
  -n monitoring \
  --from-file=k8s/monitoring/grafana/dashboards/
```

## Configuration

### Environment-Specific Settings

**Staging**:
```yaml
# Higher sampling rate for traces
randomSamplingPercentage: 50.0

# More permissive circuit breakers
outlierDetection:
  consecutiveErrors: 10
```

**Production**:
```yaml
# Lower sampling rate to reduce overhead
randomSamplingPercentage: 10.0

# Stricter circuit breakers
outlierDetection:
  consecutiveErrors: 5
  baseEjectionTime: 30s
```

### Canary Deployments

Enable canary deployments with traffic splitting:

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

### Circuit Breaker Configuration

```yaml
trafficPolicy:
  connectionPool:
    http:
      http2MaxRequests: 1000
      maxRequestsPerConnection: 10
  outlierDetection:
    consecutiveErrors: 5
    interval: 30s
    baseEjectionTime: 30s
    maxEjectionPercent: 50
```

**Behavior**:
- Ejects unhealthy instances after 5 consecutive errors
- Re-evaluates every 30 seconds
- Ejects for at least 30 seconds
- Max 50% of instances can be ejected

## Usage Guide

### Check Service Mesh Status

```bash
# Verify Istio installation
istioctl version
istioctl verify-install

# Check control plane status
kubectl get pods -n istio-system

# Verify sidecar injection
kubectl get pods -n orion -o jsonpath='{.items[*].spec.containers[*].name}'
```

### View Traffic Metrics

```bash
# Real-time metrics from Envoy
kubectl exec -n orion <pod-name> -c istio-proxy -- \
  curl localhost:15000/stats/prometheus | grep istio_requests

# View configuration
istioctl proxy-config routes <pod-name> -n orion
istioctl proxy-config clusters <pod-name> -n orion
```

### Test Circuit Breaker

```bash
# Generate load to trigger circuit breaker
hey -z 30s -c 100 https://auth.orion.example.com/api/auth/health

# Check circuit breaker status in Grafana
# Dashboard: Circuit Breaker Status
```

### Canary Deployment Workflow

```bash
# 1. Deploy canary version
kubectl set image deployment/auth-service \
  auth-service=ghcr.io/orion/auth:v2.0.0-canary \
  -n orion

# 2. Update labels
kubectl patch deployment auth-service \
  -n orion \
  -p '{"spec":{"template":{"metadata":{"labels":{"version":"canary"}}}}}'

# 3. Configure traffic split (10% canary)
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
  namespace: orion
spec:
  hosts:
  - auth-service
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
EOF

# 4. Monitor in Kiali and Grafana
# 5. Gradually increase traffic to canary
# 6. Promote canary to stable when validated
```

## Monitoring with Kiali

### Accessing Kiali

```bash
# Port forward
kubectl port-forward -n istio-system svc/kiali 20001:20001

# Or via Ingress (production)
https://kiali.orion.example.com/kiali
```

### Key Features

#### 1. Service Graph

- **Overview Tab**: High-level service topology
- **Graph Tab**: Real-time traffic visualization
- **Versioned App Graph**: Show multiple versions (canary/stable)

**Filters**:
- Namespace: `orion`, `orion-staging`, `orion-prod`
- Time range: Last 1m, 5m, 15m, 1h
- Traffic direction: Inbound, Outbound, Both

#### 2. Traffic Metrics

View per-service metrics:
- Request rate
- Error rate
- Response time (p50, p95, p99)
- TCP traffic

#### 3. Distributed Tracing

- Click on service edge
- View trace spans
- Jump to Jaeger for details

#### 4. Validations

Automatic detection of:
- Missing sidecars
- Configuration errors
- Security issues
- Best practice violations

#### 5. Istio Config

- View and edit Virtual Services
- View Destination Rules
- Check Gateway configuration
- Validate authorization policies

### Kiali Workflows

#### Troubleshoot High Error Rate

1. Open Kiali Service Graph
2. Look for red edges (errors)
3. Click on problematic edge
4. View metrics and traces
5. Identify error pattern
6. Check destination rule configuration
7. Verify circuit breaker settings

#### Analyze Latency

1. Select service in graph
2. View response time metrics
3. Check p95/p99 latencies
4. Click "View Traces"
5. Identify slow spans in Jaeger
6. Optimize slow service

#### Validate Canary Deployment

1. Switch to "Versioned App Graph"
2. Verify traffic split percentages
3. Compare error rates between versions
4. Check latency differences
5. Monitor over time

## Distributed Tracing

### Jaeger Overview

Jaeger provides end-to-end distributed tracing:

```bash
# Access Jaeger UI
kubectl port-forward -n istio-system svc/jaeger-query 16686:16686
# Open http://localhost:16686
```

### Using Jaeger

#### 1. Search Traces

- **Service**: Select service (e.g., `auth-service.orion`)
- **Operation**: Select endpoint (e.g., `POST /api/auth/login`)
- **Tags**: Filter by tags (e.g., `http.status_code=500`)
- **Lookback**: Last 1h, 6h, 24h
- **Limit**: Max results (default: 20)

#### 2. Analyze Trace

Click on trace to see:
- **Span timeline**: Visual representation of request flow
- **Span details**: Duration, tags, logs
- **Service dependencies**: What services were called
- **Critical path**: Slowest operations

#### 3. Common Queries

**Find slow requests**:
```
min_duration=1s
```

**Find errors**:
```
error=true
http.status_code=500
```

**Find requests by user**:
```
x-user-id=12345
```

**Find requests by tenant**:
```
x-tenant-id=acme-corp
```

### Trace Propagation

ORION services automatically propagate trace headers:
- `x-request-id`
- `x-b3-traceid`
- `x-b3-spanid`
- `x-b3-parentspanid`
- `x-b3-sampled`

No application changes needed!

### Sampling Configuration

**Production** (10% sampling):
```yaml
tracing:
  randomSamplingPercentage: 10.0
```

**Staging** (50% sampling):
```yaml
tracing:
  randomSamplingPercentage: 50.0
```

**Debug** (100% sampling):
```yaml
tracing:
  randomSamplingPercentage: 100.0
```

## Grafana Dashboards

### Service Mesh Overview

**URL**: `/d/service-mesh-overview`

**Metrics**:
- Control plane health
- Total request rate
- Success rate (%)
- Request volume by service
- Error rate by service
- Latency percentiles (p50, p95, p99)
- Active connections
- mTLS status

### Service Communication

**URL**: `/d/service-communication`

**Features**:
- Service-to-service traffic map
- Inbound/outbound traffic rates
- Success rate by source
- Request duration heatmap
- Failed requests table
- Retry statistics
- Connection pool status

### Traffic Patterns

**URL**: `/d/traffic-patterns`

**Analysis**:
- Traffic volume trends
- Distribution by protocol
- Top services by traffic
- Response code distribution
- Latency heatmap
- Peak traffic hours
- Traffic anomalies
- Canary traffic split
- Bandwidth usage

### Circuit Breaker Status

**URL**: `/d/circuit-breaker-status`

**Monitoring**:
- Circuit breaker status
- Connection pool overflow
- Pending request overflow
- Retry budget status
- Outlier detection
- Health check status
- Timeout rates

## Troubleshooting

### Common Issues

#### Sidecar Not Injected

**Symptom**: Pod only has one container

**Solution**:
```bash
# Check namespace label
kubectl get namespace orion -o yaml | grep istio-injection

# Enable injection
kubectl label namespace orion istio-injection=enabled

# Restart pods
kubectl rollout restart deployment/auth-service -n orion
```

#### mTLS Issues

**Symptom**: Connection refused or timeout errors

**Solution**:
```bash
# Check mTLS status
istioctl authn tls-check <pod-name>.<namespace>

# Verify PeerAuthentication
kubectl get peerauthentication -n orion

# Check for conflicting policies
kubectl get authorizationpolicy -n orion
```

#### Circuit Breaker Triggering

**Symptom**: High error rate, requests failing

**Solution**:
```bash
# Check circuit breaker metrics
kubectl exec -n orion <pod-name> -c istio-proxy -- \
  curl localhost:15000/stats/prometheus | \
  grep envoy_cluster_circuit_breakers

# View in Grafana dashboard
# Adjust DestinationRule if needed
```

#### High Latency

**Symptom**: Slow response times

**Solution**:
1. Check Jaeger for slow spans
2. Review retry configuration
3. Check circuit breaker ejections
4. Verify connection pool limits
5. Check for network issues

### Debug Commands

```bash
# View Envoy configuration
istioctl proxy-config all <pod-name> -n orion

# Check routes
istioctl proxy-config routes <pod-name> -n orion

# Check clusters
istioctl proxy-config clusters <pod-name> -n orion

# View listeners
istioctl proxy-config listeners <pod-name> -n orion

# Analyze configuration
istioctl analyze -n orion

# View logs
kubectl logs <pod-name> -n orion -c istio-proxy

# Proxy stats
kubectl exec -n orion <pod-name> -c istio-proxy -- \
  curl localhost:15000/stats/prometheus
```

### Get Help

- **Istio Docs**: https://istio.io/docs
- **Kiali Docs**: https://kiali.io/docs
- **Jaeger Docs**: https://www.jaegertracing.io/docs

## Best Practices

1. **Always use mTLS** in production
2. **Configure circuit breakers** for all services
3. **Set appropriate timeouts** for all routes
4. **Monitor circuit breaker metrics** in Grafana
5. **Use canary deployments** for safe rollouts
6. **Enable distributed tracing** for debugging
7. **Review Kiali validations** regularly
8. **Test fault injection** in staging
9. **Keep Istio updated** for security patches
10. **Document custom configurations** in version control

## Next Steps

- Configure advanced routing rules
- Implement rate limiting
- Set up multi-cluster mesh
- Configure egress gateway
- Implement custom metrics
- Create custom Grafana dashboards
- Integrate with APM tools
- Set up alerting rules

For detailed implementation guides, see the [Istio documentation](https://istio.io/latest/docs/).
