# Kubernetes Deployment Guide

This guide provides step-by-step instructions for deploying the ORION platform to Kubernetes clusters with all enhanced features including monitoring, high availability, and automated TLS certificate management.

## Prerequisites

### Required Cluster Components

Before deploying, ensure the following components are installed in your Kubernetes cluster:

1. **Prometheus Operator** (v0.60.0+)
   - Provides ServiceMonitor CRD for metrics collection
   - Installation: https://prometheus-operator.dev/docs/prologue/quick-start/

2. **cert-manager** (v1.13.0+)
   - Manages TLS certificates via Let's Encrypt
   - Installation: https://cert-manager.io/docs/installation/

3. **NGINX Ingress Controller** (v1.9.0+)
   - Handles external HTTP/HTTPS traffic
   - Installation: https://kubernetes.github.io/ingress-nginx/deploy/

### Verification Commands

```bash
# Check Prometheus Operator
kubectl get crd servicemonitors.monitoring.coreos.com

# Check cert-manager
kubectl get crd certificates.cert-manager.io
kubectl get crd clusterissuers.cert-manager.io

# Check NGINX Ingress Controller
kubectl get pods -n ingress-nginx
kubectl get ingressclass
```

### Required Tools

- kubectl (v1.25+)
- kustomize (v4.5.7+) - Usually bundled with kubectl
- Optional: k9s for cluster monitoring

## Quick Start

### 1. Deploy to Staging

```bash
# Deploy all resources to staging environment
kubectl apply -k k8s/overlays/staging/

# Verify deployment
kubectl get all -n orion-staging
```

### 2. Deploy to Production

```bash
# Deploy all resources to production environment
kubectl apply -k k8s/overlays/production/

# Verify deployment
kubectl get all -n orion-prod
```

## Detailed Deployment Process

### Step 1: Prerequisites Installation

#### Install Prometheus Operator

```bash
# Using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

#### Install cert-manager

```bash
# Install cert-manager CRDs
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.crds.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager
```

#### Install NGINX Ingress Controller

```bash
# Using Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### Step 2: Configure Secrets

Create environment-specific secret files:

```bash
# Staging secrets
cat > k8s/overlays/staging/secrets.env <<EOF
database-url=postgresql://user:pass@staging-db.example.com:5432/orion_auth
redis-url=redis://staging-redis.example.com:6379/0
jwt-secret=your-staging-jwt-secret-here
EOF

# Production secrets
cat > k8s/overlays/production/secrets.env <<EOF
database-url=postgresql://user:pass@prod-db.example.com:5432/orion_auth
redis-url=redis://prod-redis.example.com:6379/0
jwt-secret=your-production-jwt-secret-here
EOF
```

**Important**: Add `secrets.env` to `.gitignore` to prevent committing sensitive data.

### Step 3: Update Domain Names

Update domain names in overlay patches:

**Staging** (`k8s/overlays/staging/ingress-patch.yaml`):
```yaml
spec:
  rules:
  - host: auth-staging.your-domain.com  # Update this
```

**Production** (`k8s/overlays/production/ingress-patch.yaml`):
```yaml
spec:
  rules:
  - host: auth.your-domain.com  # Update this
```

### Step 4: Update Email in Issuers

Edit `k8s/base/issuer.yaml`:
```yaml
spec:
  acme:
    email: platform-team@your-organization.com  # Update this
```

### Step 5: Deploy Base Resources

```bash
# Deploy namespace and ClusterIssuers (cluster-scoped)
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/issuer.yaml

# Verify ClusterIssuers
kubectl get clusterissuer
```

### Step 6: Deploy to Staging

```bash
# Build and preview manifests
kubectl kustomize k8s/overlays/staging/

# Apply staging configuration
kubectl apply -k k8s/overlays/staging/

# Watch deployment progress
kubectl get pods -n orion-staging -w
```

### Step 7: Verify Staging Deployment

```bash
# Check all resources
kubectl get all -n orion-staging

# Check certificate status
kubectl get certificate -n orion-staging
kubectl describe certificate auth-tls-cert -n orion-staging

# Check ingress
kubectl get ingress -n orion-staging
kubectl describe ingress auth-ingress -n orion-staging

# Check ServiceMonitor
kubectl get servicemonitor -n orion-staging

# Check PodDisruptionBudget
kubectl get pdb -n orion-staging
```

### Step 8: Test Staging

```bash
# Check certificate was issued
kubectl get secret auth-tls-secret -n orion-staging -o yaml

# Test HTTPS endpoint
curl -v https://auth-staging.your-domain.com/api/auth/health

# Verify Prometheus is scraping metrics
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Open http://localhost:9090/targets in browser
```

### Step 9: Deploy to Production

**Important**: Only proceed after staging is fully validated!

```bash
# Build and preview manifests
kubectl kustomize k8s/overlays/production/

# Apply production configuration
kubectl apply -k k8s/overlays/production/

# Watch deployment progress
kubectl get pods -n orion-prod -w
```

### Step 10: Verify Production Deployment

```bash
# Check all resources
kubectl get all -n orion-prod

# Check certificate status (uses production Let's Encrypt)
kubectl get certificate -n orion-prod
kubectl describe certificate auth-tls-cert -n orion-prod

# Verify certificate is trusted
curl -v https://auth.your-domain.com/api/auth/health
```

## Monitoring and Observability

### Prometheus Integration

The ServiceMonitor automatically configures Prometheus to scrape metrics:

```bash
# Port forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Access Prometheus UI
open http://localhost:9090

# Check targets: Status > Targets
# Look for: orion/auth-service-monitor
```

### Available Metrics

The auth service exposes these metrics at `/metrics`:

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `auth_login_attempts_total` - Login attempts
- `auth_token_generation_total` - Tokens generated
- Standard Node.js metrics (memory, CPU, etc.)

### Grafana Dashboards

Import recommended dashboards:

```bash
# Port forward to Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Access Grafana (default: admin/prom-operator)
open http://localhost:3000
```

Import these dashboard IDs:
- 13770 - Kubernetes / Pods
- 315 - Kubernetes cluster monitoring
- 10000 - cert-manager

## High Availability Testing

### Test PodDisruptionBudget

Simulate node drain to verify PDB:

```bash
# Get node name
kubectl get nodes

# Drain node (simulates maintenance)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Verify at least 1 pod remains running
kubectl get pods -n orion-prod -l app=auth-service -w

# Uncordon node when done
kubectl uncordon <node-name>
```

### Test Horizontal Pod Autoscaler

Generate load to trigger autoscaling:

```bash
# Install hey (HTTP load generator)
# macOS: brew install hey
# Linux: go install github.com/rakyll/hey@latest

# Generate load
hey -z 5m -c 50 https://auth.your-domain.com/api/auth/health

# Watch HPA scale
kubectl get hpa -n orion-prod -w
```

## Certificate Management

### Certificate Lifecycle

1. **Initial Issuance**: cert-manager automatically requests certificate from Let's Encrypt
2. **Storage**: Certificate stored in `auth-tls-secret`
3. **Renewal**: Automatically renewed 30 days before expiry
4. **Injection**: Ingress automatically uses certificate from secret

### Check Certificate Status

```bash
# Get certificate details
kubectl describe certificate auth-tls-cert -n orion-prod

# Check certificate expiry
kubectl get secret auth-tls-secret -n orion-prod -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# View certificate details
kubectl get secret auth-tls-secret -n orion-prod -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text
```

### Force Certificate Renewal

```bash
# Delete certificate to trigger renewal
kubectl delete certificate auth-tls-cert -n orion-prod

# Recreate certificate
kubectl apply -k k8s/overlays/production/

# Watch renewal process
kubectl get certificate -n orion-prod -w
```

### Certificate Troubleshooting

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager

# Check certificate challenges
kubectl get challenges -n orion-prod

# Check certificate orders
kubectl get orders -n orion-prod

# Describe challenge for details
kubectl describe challenge <challenge-name> -n orion-prod
```

## Updating the Deployment

### Update Application Version

```bash
# Edit overlay kustomization
vim k8s/overlays/production/kustomization.yaml

# Change image tag
images:
- name: ghcr.io/orion/auth
  newTag: v1.1.0  # Update version

# Apply changes
kubectl apply -k k8s/overlays/production/

# Watch rolling update
kubectl rollout status deployment/prod-auth-service -n orion-prod
```

### Update Configuration

```bash
# Edit configmap
kubectl edit configmap auth-config -n orion-prod

# Restart deployment to pick up changes
kubectl rollout restart deployment/prod-auth-service -n orion-prod
```

### Update Secrets

```bash
# Update secrets file
vim k8s/overlays/production/secrets.env

# Regenerate secret
kubectl apply -k k8s/overlays/production/

# Restart deployment
kubectl rollout restart deployment/prod-auth-service -n orion-prod
```

## Rollback Procedures

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/prod-auth-service -n orion-prod

# Rollback to previous version
kubectl rollout undo deployment/prod-auth-service -n orion-prod

# Rollback to specific revision
kubectl rollout undo deployment/prod-auth-service -n orion-prod --to-revision=2
```

### Delete All Resources

```bash
# Delete production resources
kubectl delete -k k8s/overlays/production/

# Delete staging resources
kubectl delete -k k8s/overlays/staging/

# Delete ClusterIssuers (if needed)
kubectl delete clusterissuer letsencrypt-staging letsencrypt-prod
```

## Common Issues and Solutions

### Issue: Certificate Stuck in Pending

**Cause**: HTTP-01 challenge cannot be completed

**Solution**:
1. Verify domain DNS resolves to ingress IP
2. Check ingress is accessible via HTTP (port 80)
3. Review cert-manager logs
4. Check for rate limiting (switch to staging issuer)

### Issue: Prometheus Not Scraping

**Cause**: ServiceMonitor not discovered by Prometheus

**Solution**:
1. Verify ServiceMonitor exists: `kubectl get servicemonitor -n orion-prod`
2. Check Prometheus serviceMonitorSelector matches labels
3. Verify service selector matches deployment labels
4. Test metrics endpoint: `kubectl port-forward -n orion-prod pod/<pod-name> 3001:3001`, then `curl localhost:3001/metrics`

### Issue: Pods Not Starting

**Cause**: Resource constraints, failed health checks, or missing dependencies

**Solution**:
1. Check pod logs: `kubectl logs -n orion-prod <pod-name>`
2. Describe pod: `kubectl describe pod -n orion-prod <pod-name>`
3. Check events: `kubectl get events -n orion-prod --sort-by='.lastTimestamp'`
4. Verify secrets exist: `kubectl get secrets -n orion-prod`

### Issue: Ingress Not Working

**Cause**: Misconfigured ingress or DNS issues

**Solution**:
1. Check ingress status: `kubectl get ingress -n orion-prod`
2. Describe ingress: `kubectl describe ingress auth-ingress -n orion-prod`
3. Verify DNS: `nslookup auth.your-domain.com`
4. Check ingress controller logs: `kubectl logs -n ingress-nginx <ingress-pod>`

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to git
   - Use external secret managers (AWS Secrets Manager, HashiCorp Vault)
   - Rotate secrets regularly

2. **Network Security**
   - Use NetworkPolicies (already configured)
   - Implement service mesh for mTLS between services
   - Enable pod security policies/standards

3. **Certificate Management**
   - Monitor certificate expiry (set up alerts)
   - Use production issuer only after testing
   - Implement certificate rotation procedures

4. **Access Control**
   - Use RBAC for cluster access
   - Implement least privilege principle
   - Audit access logs regularly

## Production Checklist

Before deploying to production:

- [ ] All prerequisites installed (Prometheus Operator, cert-manager, NGINX Ingress)
- [ ] Secrets configured and secured
- [ ] Domain DNS configured correctly
- [ ] Certificate successfully issued in staging
- [ ] Prometheus scraping metrics successfully
- [ ] Health checks passing
- [ ] PodDisruptionBudget tested
- [ ] HPA tested under load
- [ ] Monitoring dashboards configured
- [ ] Alerts configured for critical metrics
- [ ] Backup and disaster recovery procedures documented
- [ ] Rollback procedure tested
- [ ] Team trained on operational procedures

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [Prometheus Operator Documentation](https://prometheus-operator.dev/)
- [cert-manager Documentation](https://cert-manager.io/)
- [NGINX Ingress Documentation](https://kubernetes.github.io/ingress-nginx/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [ORION Kubernetes Enhancements Spec](../.claude/specs/kubernetes-enhancements.md)
