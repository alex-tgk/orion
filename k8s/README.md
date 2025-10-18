# ORION Kubernetes Manifests

Production-ready Kubernetes manifests for the ORION microservices platform with comprehensive observability, high availability, and automated TLS certificate management.

## Features

### Monitoring and Observability
- **ServiceMonitor**: Automatic Prometheus metrics scraping
- **Metrics Endpoint**: Exposes application and system metrics at `/metrics`
- **Grafana Integration**: Ready for dashboard visualization

### High Availability
- **PodDisruptionBudget**: Ensures minimum availability during cluster operations
- **HorizontalPodAutoscaler**: Automatic scaling based on CPU/memory metrics
- **Anti-Affinity Rules**: Distributes pods across nodes
- **Resource Limits**: Prevents resource starvation

### Security
- **TLS/HTTPS**: Automated certificate provisioning via cert-manager
- **NetworkPolicy**: Restricts network traffic to authorized sources
- **Pod Security Context**: Runs as non-root with read-only filesystem
- **RBAC**: Service account with least-privilege access

### Certificate Management
- **cert-manager Integration**: Automated Let's Encrypt certificates
- **Auto-Renewal**: Certificates renewed 30 days before expiry
- **Staging/Production Issuers**: Separate issuers for testing and production
- **HTTP-01 Challenge**: Automatic domain validation

## Directory Structure

```
k8s/
├── base/                           # Base Kubernetes resources
│   ├── namespace.yaml              # Namespace definition
│   ├── auth-deployment.yaml        # Auth service deployment
│   ├── auth-service.yaml           # Service and ServiceAccount
│   ├── auth-configmap.yaml         # Configuration
│   ├── auth-hpa.yaml               # Horizontal Pod Autoscaler
│   ├── auth-networkpolicy.yaml     # Network policies
│   ├── auth-servicemonitor.yaml    # Prometheus ServiceMonitor ⭐ NEW
│   ├── auth-pdb.yaml               # PodDisruptionBudget ⭐ NEW
│   ├── issuer.yaml                 # cert-manager ClusterIssuers ⭐ NEW
│   ├── certificate.yaml            # TLS Certificate ⭐ NEW
│   ├── auth-ingress.yaml           # Ingress with TLS ⭐ NEW
│   └── kustomization.yaml          # Kustomize base config
│
├── overlays/                       # Environment-specific overlays
│   ├── staging/
│   │   ├── kustomization.yaml      # Staging overlay
│   │   ├── auth-deployment-patch.yaml
│   │   ├── certificate-patch.yaml  # Staging cert config ⭐ NEW
│   │   └── ingress-patch.yaml      # Staging ingress config ⭐ NEW
│   │
│   └── production/
│       ├── kustomization.yaml      # Production overlay
│       ├── auth-deployment-patch.yaml
│       ├── certificate-patch.yaml  # Production cert config ⭐ NEW
│       └── ingress-patch.yaml      # Production ingress config ⭐ NEW
│
├── DEPLOYMENT.md                   # Comprehensive deployment guide ⭐ NEW
├── README.md                       # This file
└── verify-deployment.sh            # Deployment verification script ⭐ NEW
```

## Quick Start

### Prerequisites

Ensure your cluster has these components installed:

1. **Prometheus Operator** (v0.60.0+)
   ```bash
   kubectl get crd servicemonitors.monitoring.coreos.com
   ```

2. **cert-manager** (v1.13.0+)
   ```bash
   kubectl get crd certificates.cert-manager.io
   ```

3. **NGINX Ingress Controller** (v1.9.0+)
   ```bash
   kubectl get ingressclass nginx
   ```

For installation instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md#step-1-prerequisites-installation).

### Deploy to Staging

```bash
# Deploy all resources
kubectl apply -k k8s/overlays/staging/

# Verify deployment
kubectl get all -n orion-staging

# Run verification script
./k8s/verify-deployment.sh staging orion-staging
```

### Deploy to Production

```bash
# Deploy all resources
kubectl apply -k k8s/overlays/production/

# Verify deployment
kubectl get all -n orion-prod

# Run verification script
./k8s/verify-deployment.sh production orion-prod
```

## Resource Overview

### Base Resources

| Resource | Purpose | Configuration |
|----------|---------|---------------|
| Deployment | Runs auth service pods | 3 replicas, resource limits, health checks |
| Service | Exposes pods internally | ClusterIP, port 80 → 3001 |
| ServiceAccount | Pod identity | RBAC integration |
| ConfigMap | Application config | Environment-specific settings |
| HPA | Auto-scaling | 3-10 replicas, CPU/memory targets |
| NetworkPolicy | Network security | Ingress/egress rules |
| **ServiceMonitor** ⭐ | Prometheus scraping | 30s interval, /metrics endpoint |
| **PodDisruptionBudget** ⭐ | High availability | minAvailable: 1 |
| **ClusterIssuer** ⭐ | Certificate authority | Let's Encrypt staging & prod |
| **Certificate** ⭐ | TLS certificate | 90-day validity, auto-renewal |
| **Ingress** ⭐ | External HTTPS access | TLS termination, routing rules |

### New Resources (Enhancements)

#### 1. ServiceMonitor (auth-servicemonitor.yaml)

Enables automatic Prometheus metrics collection:

```yaml
spec:
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

**Benefits**:
- No manual Prometheus configuration needed
- Automatic endpoint discovery
- Consistent metrics across all pods

**Verification**:
```bash
kubectl get servicemonitor -n orion-staging
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets
```

#### 2. PodDisruptionBudget (auth-pdb.yaml)

Ensures high availability during cluster operations:

```yaml
spec:
  minAvailable: 1
```

**Benefits**:
- Prevents complete service outage during node drains
- Ensures at least 1 pod always running
- Allows safe cluster maintenance

**Testing**:
```bash
kubectl get pdb -n orion-staging
kubectl drain <node-name> --ignore-daemonsets
# Verify at least 1 pod remains running
```

#### 3. ClusterIssuers (issuer.yaml)

Configures Let's Encrypt certificate authorities:

- **letsencrypt-staging**: For testing (higher rate limits)
- **letsencrypt-prod**: For production (trusted certificates)

**Benefits**:
- Automated certificate provisioning
- No manual CSR/key generation
- Centralized configuration

**Verification**:
```bash
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-staging
```

#### 4. Certificate (certificate.yaml)

Defines TLS certificate requirements:

```yaml
spec:
  secretName: auth-tls-secret
  dnsNames:
  - auth.orion.example.com
  issuerRef:
    name: letsencrypt-staging
```

**Benefits**:
- Automatic certificate issuance
- Auto-renewal 30 days before expiry
- Kubernetes-native secret storage

**Verification**:
```bash
kubectl get certificate -n orion-staging
kubectl describe certificate auth-tls-cert -n orion-staging
kubectl get secret auth-tls-secret -n orion-staging
```

#### 5. Ingress (auth-ingress.yaml)

Provides external HTTPS access:

```yaml
spec:
  tls:
  - hosts:
    - auth.orion.example.com
    secretName: auth-tls-secret
  rules:
  - host: auth.orion.example.com
    http:
      paths:
      - path: /api/auth
        pathType: Prefix
```

**Benefits**:
- TLS termination at ingress
- Automatic HTTPS redirect
- Rate limiting and security headers
- CORS configuration

**Verification**:
```bash
kubectl get ingress -n orion-staging
kubectl describe ingress auth-ingress -n orion-staging
curl -v https://auth-staging.your-domain.com/api/auth/health
```

## Environment-Specific Configuration

### Staging Overlay

Located in `k8s/overlays/staging/`:

- **Namespace**: `orion-staging`
- **Replicas**: 2 (lower cost)
- **Domain**: `auth-staging.orion.example.com`
- **Certificate Issuer**: `letsencrypt-staging` (testing)
- **Image Tag**: `develop`
- **Log Level**: `debug`

### Production Overlay

Located in `k8s/overlays/production/`:

- **Namespace**: `orion-prod`
- **Replicas**: 5 (high availability)
- **Domain**: `auth.orion.example.com`
- **Certificate Issuer**: `letsencrypt-prod` (trusted certs)
- **Image Tag**: `v1.0.0`
- **Log Level**: `info`

## Monitoring

### Prometheus Metrics

The auth service exposes metrics at `/metrics`:

```bash
# Port forward to a pod
kubectl port-forward -n orion-staging pod/<pod-name> 3001:3001

# View metrics
curl http://localhost:3001/metrics
```

**Available Metrics**:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `auth_login_attempts_total` - Login attempts counter
- `auth_token_generation_total` - Token generation counter
- `process_*` - Node.js process metrics
- `nodejs_*` - Node.js runtime metrics

### Grafana Dashboards

Access Grafana:

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Visit http://localhost:3000 (default: admin/prom-operator)
```

Import recommended dashboards:
- **13770**: Kubernetes / Pods
- **315**: Kubernetes cluster monitoring
- **10000**: cert-manager dashboard

### Alerts

Configure AlertManager rules for:
- High error rate (5xx responses)
- High response latency (p95 > 1s)
- Pod restarts
- Certificate expiry (< 7 days)
- High memory usage (> 80%)

## Certificate Management

### Certificate Lifecycle

1. **Issuance**: cert-manager automatically requests certificate from Let's Encrypt
2. **Validation**: HTTP-01 challenge via ingress controller
3. **Storage**: Certificate stored in `auth-tls-secret`
4. **Renewal**: Automatic renewal 30 days before expiry
5. **Injection**: Ingress uses certificate from secret

### Check Certificate Status

```bash
# View certificate resource
kubectl get certificate -n orion-staging
kubectl describe certificate auth-tls-cert -n orion-staging

# Check certificate expiry
kubectl get secret auth-tls-secret -n orion-staging -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -dates
```

### Force Certificate Renewal

```bash
# Delete certificate to trigger renewal
kubectl delete certificate auth-tls-cert -n orion-staging

# Recreate certificate
kubectl apply -k k8s/overlays/staging/

# Watch renewal
kubectl get certificate -n orion-staging -w
```

### Troubleshooting Certificates

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager

# Check certificate challenges
kubectl get challenges -n orion-staging

# Check certificate orders
kubectl get orders -n orion-staging

# Describe challenge
kubectl describe challenge <challenge-name> -n orion-staging
```

## High Availability

### PodDisruptionBudget Behavior

With `minAvailable: 1` and 3 replicas:

- ✅ Allows 2 pods to be disrupted simultaneously
- ✅ Always maintains service availability
- ✅ Enables safe node maintenance
- ✅ Supports rolling updates

### Testing High Availability

```bash
# Simulate node drain
kubectl drain <node-name> --ignore-daemonsets

# Verify at least 1 pod remains running
kubectl get pods -n orion-staging -l app=auth-service -w

# Check PDB status
kubectl get pdb -n orion-staging

# Uncordon node
kubectl uncordon <node-name>
```

## Scaling

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment auth-service -n orion-staging --replicas=5

# Verify scaling
kubectl get pods -n orion-staging -l app=auth-service
```

### Auto-Scaling (HPA)

The HorizontalPodAutoscaler automatically scales based on:

- CPU utilization target: 70%
- Memory utilization target: 80%
- Min replicas: 3 (staging: 2)
- Max replicas: 10

```bash
# View HPA status
kubectl get hpa -n orion-staging

# Describe HPA
kubectl describe hpa auth-service-hpa -n orion-staging
```

### Load Testing

```bash
# Install hey
brew install hey  # macOS
# or: go install github.com/rakyll/hey@latest

# Generate load
hey -z 5m -c 50 https://auth-staging.your-domain.com/api/auth/health

# Watch HPA scale
kubectl get hpa -n orion-staging -w
```

## Security

### TLS/HTTPS

All external traffic is encrypted:

- TLS 1.2+ only
- Automatic HTTPS redirect
- HSTS enabled (31536000s max-age)
- Certificate auto-renewal

### Network Policies

NetworkPolicy restricts traffic:

**Ingress**:
- Allow from ingress-nginx namespace
- Allow from api-gateway pods
- Allow from monitoring namespace

**Egress**:
- Allow DNS (port 53)
- Allow PostgreSQL (port 5432)
- Allow Redis (port 6379)
- Allow HTTPS (port 443)

### Pod Security

- Runs as non-root user (UID 1001)
- Read-only root filesystem
- No privilege escalation
- Drops all capabilities

## Common Operations

### View Logs

```bash
# All pods
kubectl logs -n orion-staging -l app=auth-service -f

# Specific pod
kubectl logs -n orion-staging pod/<pod-name> -f

# Previous container (after crash)
kubectl logs -n orion-staging pod/<pod-name> --previous
```

### Execute Commands

```bash
# Open shell in pod
kubectl exec -it -n orion-staging pod/<pod-name> -- /bin/sh

# Run single command
kubectl exec -n orion-staging pod/<pod-name> -- wget -qO- http://localhost:3001/metrics
```

### Update Configuration

```bash
# Edit ConfigMap
kubectl edit configmap auth-config -n orion-staging

# Restart deployment to apply changes
kubectl rollout restart deployment auth-service -n orion-staging
```

### Update Secrets

```bash
# Update secrets file
vim k8s/overlays/staging/secrets.env

# Regenerate secret
kubectl apply -k k8s/overlays/staging/

# Restart deployment
kubectl rollout restart deployment auth-service -n orion-staging
```

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment auth-service -n orion-staging

# Rollback to previous version
kubectl rollout undo deployment auth-service -n orion-staging

# Rollback to specific revision
kubectl rollout undo deployment auth-service -n orion-staging --to-revision=2
```

## Verification

### Automated Verification

Run the verification script:

```bash
./k8s/verify-deployment.sh staging orion-staging
```

The script checks:
- Prerequisites (CRDs, cluster access)
- Deployment status
- Service endpoints
- ServiceMonitor configuration
- PodDisruptionBudget status
- HorizontalPodAutoscaler
- Certificate provisioning
- Ingress configuration
- Health checks

### Manual Verification

```bash
# Check all resources
kubectl get all -n orion-staging

# Check certificates
kubectl get certificate,clusterissuer -n orion-staging

# Check ServiceMonitor
kubectl get servicemonitor -n orion-staging

# Check PDB
kubectl get pdb -n orion-staging

# Check events
kubectl get events -n orion-staging --sort-by='.lastTimestamp'

# Test HTTPS endpoint
curl -v https://auth-staging.your-domain.com/api/auth/health
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n orion-staging

# Describe pod
kubectl describe pod <pod-name> -n orion-staging

# Check logs
kubectl logs <pod-name> -n orion-staging

# Check events
kubectl get events -n orion-staging --field-selector involvedObject.name=<pod-name>
```

### Certificate Issues

See [Certificate Management](#troubleshooting-certificates) section.

### Ingress Not Working

```bash
# Check ingress status
kubectl get ingress -n orion-staging
kubectl describe ingress auth-ingress -n orion-staging

# Check ingress controller logs
kubectl logs -n ingress-nginx <ingress-pod>

# Verify DNS
nslookup auth-staging.your-domain.com

# Test HTTP (should redirect to HTTPS)
curl -I http://auth-staging.your-domain.com/api/auth/health
```

### Prometheus Not Scraping

```bash
# Check ServiceMonitor
kubectl get servicemonitor -n orion-staging
kubectl describe servicemonitor auth-service-monitor -n orion-staging

# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Test metrics endpoint
kubectl port-forward -n orion-staging pod/<pod-name> 3001:3001
curl http://localhost:3001/metrics
```

## Additional Resources

- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Comprehensive deployment guide
- **[Kubernetes Enhancements Spec](../.claude/specs/kubernetes-enhancements.md)**: Detailed specification
- **[Prometheus Operator Docs](https://prometheus-operator.dev/)**: ServiceMonitor documentation
- **[cert-manager Docs](https://cert-manager.io/)**: Certificate management guide
- **[NGINX Ingress Docs](https://kubernetes.github.io/ingress-nginx/)**: Ingress configuration
- **[Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)**: Important for production

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review logs: `kubectl logs -n <namespace> -l app=auth-service`
3. Check events: `kubectl get events -n <namespace>`
4. Run verification: `./k8s/verify-deployment.sh`
5. Consult [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed procedures

## License

Part of the ORION microservices platform.
