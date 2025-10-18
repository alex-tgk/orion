# Kubernetes Enhancements Specification

## Overview

This specification outlines comprehensive Kubernetes enhancements for the ORION microservices platform, implementing production-grade observability, high availability, security, and TLS certificate management following the GitHub Spec Kit methodology.

## Status

- **Status**: Draft
- **Created**: 2025-10-18
- **Last Updated**: 2025-10-18
- **Version**: 1.0.0

## Context

The current Kubernetes infrastructure for the auth service includes basic deployment, service, HPA, and network policy configurations. This enhancement adds critical production features including Prometheus monitoring, pod disruption budgets, cert-manager integration for automated TLS certificate management, and ingress configuration.

## Goals

1. Enable Prometheus-based monitoring with ServiceMonitor CRDs
2. Ensure high availability during cluster operations with PodDisruptionBudgets
3. Implement automated TLS certificate management using cert-manager
4. Provide secure ingress routing with automatic certificate provisioning
5. Follow Kubernetes best practices for production workloads
6. Maintain consistency with existing ORION platform standards

## Non-Goals

- Implementing custom metrics beyond standard Prometheus metrics
- Setting up Prometheus Operator installation (assumes existing cluster setup)
- Configuring external DNS management
- Implementing service mesh features (Istio/Linkerd)

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Ingress Controller                   │  │
│  │              (TLS Termination Point)                  │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │             cert-manager (TLS Provider)              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │  │
│  │  │  Issuer    │  │Certificate │  │  Let's       │   │  │
│  │  │  (staging/ │→ │  Resource  │→ │  Encrypt     │   │  │
│  │  │  prod)     │  │            │  │  ACME        │   │  │
│  │  └────────────┘  └────────────┘  └──────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Auth Service Deployment                  │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐                 │  │
│  │  │ Pod 1  │  │ Pod 2  │  │ Pod 3  │  (min 3 pods)   │  │
│  │  └────┬───┘  └────┬───┘  └────┬───┘                 │  │
│  │       │           │           │                       │  │
│  │       └───────────┴───────────┘                       │  │
│  │                   │                                    │  │
│  │         ┌─────────▼──────────┐                        │  │
│  │         │ PodDisruptionBudget│                        │  │
│  │         │  (minAvailable: 1) │                        │  │
│  │         └────────────────────┘                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Prometheus (Monitoring)                     │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │            ServiceMonitor CRD                   │  │  │
│  │  │  - Endpoint: /metrics                           │  │  │
│  │  │  - Port: 3001                                   │  │  │
│  │  │  - Interval: 30s                                │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Resource Relationships

```
Ingress (TLS enabled)
  ├─→ Certificate (auto-provisioned)
  │     └─→ ClusterIssuer/Issuer (Let's Encrypt)
  └─→ Service (auth-service)
        └─→ Deployment (auth-service)
              ├─→ PodDisruptionBudget (ensures HA)
              └─→ ServiceMonitor (Prometheus scraping)
```

## Detailed Design

### 1. ServiceMonitor for Prometheus

**File**: `k8s/base/auth-servicemonitor.yaml`

The ServiceMonitor CRD enables automatic Prometheus scraping configuration through the Prometheus Operator.

**Key Features**:
- Automatic endpoint discovery based on service selector
- Configurable scrape interval (30 seconds)
- Metrics path: `/metrics`
- Port mapping to service's metrics port
- Labels for Prometheus service discovery

**Configuration**:
```yaml
spec:
  selector:
    matchLabels:
      app: auth-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

**Benefits**:
- Automatic metrics collection without manual Prometheus config
- Dynamic endpoint discovery
- Consistent monitoring across all auth service pods
- Integration with existing Prometheus Operator setup

### 2. PodDisruptionBudget (PDB)

**File**: `k8s/base/auth-pdb.yaml`

PDBs ensure high availability during voluntary disruptions (node drains, cluster upgrades, etc.).

**Configuration**:
- `minAvailable: 1` - At least one pod must remain available
- Applies to all pods with `app: auth-service` label

**Protection Against**:
- Node maintenance operations
- Cluster scaling events
- Voluntary pod evictions
- Kubernetes version upgrades

**Decision Rationale**:
- With 3 replicas minimum (from HPA), `minAvailable: 1` allows:
  - 2 pods to be disrupted simultaneously
  - Always maintains service availability
  - Balances availability vs. maintenance flexibility

**Alternative Considered**: `minAvailable: 2`
- Would be more conservative but slower for rolling updates
- Current HPA (3-10 pods) makes minAvailable: 1 sufficient

### 3. Resource Limits (Already Implemented)

**File**: `k8s/base/auth-deployment.yaml` (already configured)

Current configuration meets best practices:

```yaml
resources:
  requests:
    cpu: 100m      # 0.1 CPU core
    memory: 128Mi  # 128 megabytes
  limits:
    cpu: 500m      # 0.5 CPU core
    memory: 512Mi  # 512 megabytes
```

**Benefits**:
- Prevents resource starvation
- Enables proper scheduling
- Supports HPA metrics
- Ensures QoS class (Burstable)

### 4. Cert-Manager Integration

**Files**:
- `k8s/base/issuer.yaml` - ClusterIssuers for staging and production
- `k8s/base/certificate.yaml` - Certificate resource for auth service
- `k8s/base/auth-ingress.yaml` - Ingress with TLS configuration

#### 4.1 ClusterIssuers

Two issuers for different environments:

**Staging Issuer** (`letsencrypt-staging`):
- ACME server: `https://acme-staging-v02.api.letsencrypt.org/directory`
- Use during development and testing
- Higher rate limits
- Issues untrusted certificates (for testing)

**Production Issuer** (`letsencrypt-prod`):
- ACME server: `https://acme-v02.api.letsencrypt.org/directory`
- Use in production
- Lower rate limits (important!)
- Issues trusted certificates

**ACME Challenge**: HTTP-01
- Validates domain ownership via HTTP
- Works with standard ingress controllers
- No DNS provider configuration required
- Simpler than DNS-01 for most use cases

**Private Key Storage**:
- Stored in Kubernetes Secret
- Name: `letsencrypt-{staging|prod}-key`
- Automatically managed by cert-manager

#### 4.2 Certificate Resource

Automatically provisions TLS certificates for:
- Primary domain: `auth.orion.example.com`
- Alternative domains can be added via `dnsNames` array

**Features**:
- Automatic renewal (60 days before expiry)
- Secret storage: `auth-tls-secret`
- References staging issuer by default
- Usable with production issuer via overlay patches

**Certificate Lifecycle**:
1. Certificate resource created
2. cert-manager detects resource
3. Creates ACME order with Let's Encrypt
4. Performs HTTP-01 challenge via ingress
5. Receives certificate
6. Stores in specified secret
7. Monitors expiry and auto-renews

#### 4.3 Ingress with TLS

**File**: `k8s/base/auth-ingress.yaml`

Provides external HTTPS access to auth service.

**Configuration**:
- Ingress class: `nginx`
- Host: `auth.orion.example.com` (update per environment)
- TLS termination at ingress
- Automatic certificate injection from secret
- Annotation-driven cert-manager integration

**TLS Configuration**:
```yaml
tls:
- hosts:
  - auth.orion.example.com
  secretName: auth-tls-secret  # Managed by cert-manager
```

**Annotations**:
- `cert-manager.io/cluster-issuer`: Links to ClusterIssuer
- `nginx.ingress.kubernetes.io/*`: Nginx-specific configurations
- SSL redirect enabled by default

### 5. Kustomization Updates

**File**: `k8s/base/kustomization.yaml`

Added resources:
1. `auth-servicemonitor.yaml` - Prometheus monitoring
2. `auth-pdb.yaml` - High availability
3. `issuer.yaml` - Certificate issuers
4. `certificate.yaml` - TLS certificates
5. `auth-ingress.yaml` - External access

## Implementation Plan

### Phase 1: Monitoring (Low Risk)
1. Deploy ServiceMonitor CRD
2. Verify Prometheus scraping
3. Validate metrics endpoint
4. Check Prometheus targets UI

**Rollback**: Delete ServiceMonitor resource

### Phase 2: High Availability (Medium Risk)
1. Deploy PodDisruptionBudget
2. Test with node drain simulation
3. Verify minimum pods maintained
4. Document disruption windows

**Rollback**: Delete PDB resource

### Phase 3: TLS & Cert-Manager (Higher Risk)
1. Install cert-manager (if not present)
2. Deploy staging ClusterIssuer
3. Deploy Certificate resource
4. Verify certificate issuance
5. Deploy Ingress with TLS
6. Test HTTPS access
7. Switch to production issuer
8. Monitor certificate renewal

**Rollback**: Remove ingress, certificate, and issuer resources

### Deployment Order
```bash
# 1. Prerequisites check
kubectl get crd servicemonitors.monitoring.coreos.com
kubectl get crd certificates.cert-manager.io

# 2. Deploy enhancements
kubectl apply -k k8s/base/

# 3. Verification
kubectl get servicemonitor -n orion
kubectl get pdb -n orion
kubectl get certificate -n orion
kubectl get ingress -n orion

# 4. Check certificate status
kubectl describe certificate auth-tls-cert -n orion
```

## Security Considerations

### TLS Certificate Security
- Private keys stored in Kubernetes Secrets (encrypted at rest)
- Automatic rotation prevents expiry
- Let's Encrypt provides industry-standard certificates
- ACME account key stored securely

### Ingress Security
- TLS 1.2+ only
- HTTPS redirect enabled
- Security headers can be added via annotations
- Rate limiting available via nginx annotations

### RBAC Requirements
cert-manager requires:
- Permission to read/write Secrets
- Permission to manage Certificate resources
- Permission to update Ingress resources (for challenges)

### Network Security
- Ingress NetworkPolicy already allows ingress-nginx namespace
- PDB does not affect NetworkPolicy
- ServiceMonitor does not affect NetworkPolicy

## Monitoring & Observability

### Prometheus Metrics

The ServiceMonitor enables automatic collection of:

**Application Metrics** (exposed by auth service):
- `http_requests_total` - Request counter
- `http_request_duration_seconds` - Request latency
- `auth_login_attempts_total` - Login attempts
- `auth_token_generation_total` - Token generation
- Custom business metrics

**System Metrics** (from Kubernetes):
- `container_cpu_usage_seconds_total`
- `container_memory_usage_bytes`
- `kube_pod_status_phase`
- `kube_deployment_status_replicas`

### Certificate Monitoring

cert-manager provides metrics:
- `certmanager_certificate_expiration_timestamp_seconds`
- `certmanager_certificate_ready_status`
- Alerts can be configured for certificates expiring soon

### Dashboards

Recommended Grafana dashboards:
1. **Kubernetes Dashboard** - Overall cluster health
2. **Auth Service Dashboard** - Application-specific metrics
3. **Cert-Manager Dashboard** - Certificate status and renewals
4. **Ingress Dashboard** - Traffic and TLS metrics

## Testing Strategy

### ServiceMonitor Testing
```bash
# Check if Prometheus discovered target
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Visit: http://localhost:9090/targets
# Look for: orion/auth-service endpoints
```

### PDB Testing
```bash
# Simulate node drain
kubectl drain <node-name> --ignore-daemonsets

# Verify at least 1 pod remains running
kubectl get pods -n orion -l app=auth-service -w

# Uncordon node
kubectl uncordon <node-name>
```

### Certificate Testing
```bash
# Check certificate status
kubectl get certificate -n orion auth-tls-cert -o yaml

# Check certificate secret
kubectl get secret -n orion auth-tls-secret -o yaml

# Test HTTPS access
curl -v https://auth.orion.example.com/api/auth/health

# Check certificate details
echo | openssl s_client -connect auth.orion.example.com:443 -servername auth.orion.example.com 2>/dev/null | openssl x509 -noout -dates
```

### Ingress Testing
```bash
# Check ingress status
kubectl get ingress -n orion auth-ingress

# Verify TLS secret attached
kubectl describe ingress -n orion auth-ingress

# Test HTTP redirect to HTTPS
curl -I http://auth.orion.example.com/api/auth/health
# Should return: Location: https://auth.orion.example.com/...
```

## Configuration Management

### Environment-Specific Overrides

**Staging Overlay** (`k8s/overlays/staging/`):
```yaml
# Use staging issuer
- target:
    kind: Certificate
    name: auth-tls-cert
  patch: |-
    - op: replace
      path: /spec/issuerRef/name
      value: letsencrypt-staging
```

**Production Overlay** (`k8s/overlays/production/`):
```yaml
# Use production issuer
- target:
    kind: Certificate
    name: auth-tls-cert
  patch: |-
    - op: replace
      path: /spec/issuerRef/name
      value: letsencrypt-prod
```

### Domain Configuration

Update domains per environment in overlays:
- Staging: `auth-staging.orion.example.com`
- Production: `auth.orion.example.com`

## Operational Runbook

### Certificate Renewal Issues

**Symptom**: Certificate not renewing
**Check**:
```bash
kubectl logs -n cert-manager deploy/cert-manager
kubectl describe certificate -n orion auth-tls-cert
kubectl describe order -n orion
kubectl describe challenge -n orion
```

**Common Causes**:
- Rate limit hit (use staging issuer first)
- HTTP-01 challenge failing (check ingress accessibility)
- DNS not resolving correctly
- Firewall blocking port 80

**Resolution**:
1. Check cert-manager logs
2. Verify domain DNS resolves
3. Test HTTP access to challenge endpoint
4. Delete certificate and recreate if stuck

### Pod Disruption During Updates

**Symptom**: Deployment stuck during rolling update
**Check**:
```bash
kubectl get pdb -n orion
kubectl describe pdb -n orion auth-service-pdb
kubectl get deployment -n orion auth-service -o yaml
```

**Resolution**:
- PDB may be too restrictive
- Temporarily lower minAvailable
- Check pod health (may be failing health checks)

### Prometheus Not Scraping

**Symptom**: No metrics in Prometheus
**Check**:
```bash
kubectl get servicemonitor -n orion
kubectl logs -n monitoring prometheus-operator
```

**Resolution**:
1. Verify ServiceMonitor labels match Prometheus selector
2. Check service selector matches deployment labels
3. Verify metrics endpoint responds: `curl http://<pod-ip>:3001/metrics`
4. Check Prometheus serviceMonitorSelector

## Dependencies

### Required Components

1. **Prometheus Operator**
   - Version: v0.60.0+
   - Provides ServiceMonitor CRD
   - Installation: https://prometheus-operator.dev/

2. **cert-manager**
   - Version: v1.13.0+
   - Provides Certificate and Issuer CRDs
   - Installation: https://cert-manager.io/docs/installation/

3. **NGINX Ingress Controller**
   - Version: v1.9.0+
   - Supports cert-manager integration
   - Installation: https://kubernetes.github.io/ingress-nginx/

### Optional Components

1. **Grafana** - For visualization
2. **AlertManager** - For alerting
3. **External DNS** - For automatic DNS management

## Migration Path

### Existing Clusters

1. **Pre-deployment Checklist**:
   - [ ] Prometheus Operator installed
   - [ ] cert-manager installed
   - [ ] NGINX Ingress Controller installed
   - [ ] DNS records configured
   - [ ] Cluster has internet access (for Let's Encrypt)

2. **Staged Rollout**:
   - Week 1: Deploy ServiceMonitor and PDB
   - Week 2: Deploy staging issuer and test certificate
   - Week 3: Deploy ingress with staging certificate
   - Week 4: Switch to production issuer

3. **Validation Gates**:
   - Each phase requires 48h observation
   - No alerts or errors in monitoring
   - Successful certificate renewal test (staging)
   - Load testing with production traffic pattern

## Success Metrics

### Availability
- **Target**: 99.9% uptime during maintenance windows
- **Measure**: Pod availability during node drains
- **Success**: No service disruption with PDB in place

### Observability
- **Target**: 100% metric collection success rate
- **Measure**: Prometheus scrape success rate
- **Success**: Metrics visible in Grafana within 1 minute

### Certificate Management
- **Target**: 100% automated renewal success
- **Measure**: Certificate renewals without manual intervention
- **Success**: Zero certificate expiry incidents

### Security
- **Target**: 100% encrypted traffic
- **Measure**: TLS connection success rate
- **Success**: All external traffic uses HTTPS

## Future Enhancements

### Short-term (Next Quarter)
1. Add custom metrics for business KPIs
2. Implement Grafana dashboards
3. Configure AlertManager rules
4. Add certificate expiry alerts

### Medium-term (Next 6 Months)
1. Implement mutual TLS (mTLS) between services
2. Add rate limiting rules to ingress
3. Implement WAF rules
4. Add geo-blocking capabilities

### Long-term (Next Year)
1. Consider service mesh (Istio/Linkerd)
2. Implement advanced traffic management
3. Add chaos engineering tests
4. Implement multi-cluster certificate management

## References

- [Prometheus Operator Documentation](https://prometheus-operator.dev/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Kubernetes Pod Disruption Budgets](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [GitHub Spec Kit](https://github.com/github/github-spec-kit)
- [ORION Architecture Documentation](../../README.md)

## Appendix A: Resource Definitions

### Complete ServiceMonitor
See: `/Users/acarroll/dev/projects/orion/k8s/base/auth-servicemonitor.yaml`

### Complete PodDisruptionBudget
See: `/Users/acarroll/dev/projects/orion/k8s/base/auth-pdb.yaml`

### Complete Certificate Configuration
See: `/Users/acarroll/dev/projects/orion/k8s/base/certificate.yaml`

### Complete Issuer Configuration
See: `/Users/acarroll/dev/projects/orion/k8s/base/issuer.yaml`

### Complete Ingress Configuration
See: `/Users/acarroll/dev/projects/orion/k8s/base/auth-ingress.yaml`

## Appendix B: Troubleshooting Guide

### Common Issues and Solutions

#### Issue: ServiceMonitor not being discovered

**Symptoms**:
- Prometheus not scraping auth-service
- No targets visible in Prometheus UI

**Diagnosis**:
```bash
kubectl get servicemonitor -n orion auth-service-monitor -o yaml
kubectl get prometheus -n monitoring -o yaml | grep serviceMonitorSelector
```

**Solution**:
Ensure ServiceMonitor labels match Prometheus serviceMonitorSelector

#### Issue: Certificate stuck in Pending state

**Symptoms**:
- Certificate status shows "Pending"
- TLS secret not created

**Diagnosis**:
```bash
kubectl describe certificate -n orion auth-tls-cert
kubectl get order -n orion
kubectl get challenge -n orion
kubectl logs -n cert-manager deploy/cert-manager
```

**Solution**:
1. Check HTTP-01 challenge is accessible
2. Verify DNS resolves correctly
3. Check rate limits (switch to staging if needed)
4. Verify ingress controller is working

#### Issue: PDB preventing updates

**Symptoms**:
- Deployment stuck during rolling update
- Pods not being evicted

**Diagnosis**:
```bash
kubectl describe pdb -n orion auth-service-pdb
kubectl get pods -n orion -l app=auth-service
```

**Solution**:
1. Check pod health (may be failing readiness checks)
2. Temporarily increase maxUnavailable or decrease minAvailable
3. Fix underlying pod issues

## Appendix C: Environment Variables

### cert-manager Configuration

No environment variables required in auth-service deployment for cert-manager integration. All configuration is done via Kubernetes resources.

### Prometheus Configuration

No environment variables required. Metrics endpoint is exposed via standard application configuration.

## Changelog

### Version 1.0.0 (2025-10-18)
- Initial specification
- ServiceMonitor for Prometheus monitoring
- PodDisruptionBudget for high availability
- cert-manager integration for TLS certificates
- Ingress configuration with automatic HTTPS
- Comprehensive testing and operational guidelines
