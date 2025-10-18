# Kubernetes Quick Reference

Quick reference for ORION Kubernetes deployments.

## Files Created

### Base Manifests (k8s/base/)
- `auth-servicemonitor.yaml` - Prometheus metrics scraping
- `auth-pdb.yaml` - PodDisruptionBudget (minAvailable: 1)
- `issuer.yaml` - Let's Encrypt ClusterIssuers (staging/prod)
- `certificate.yaml` - TLS certificate definition
- `auth-ingress.yaml` - Ingress with TLS and HTTPS

### Overlay Patches
- `overlays/staging/certificate-patch.yaml` - Staging cert (letsencrypt-staging)
- `overlays/staging/ingress-patch.yaml` - Staging domain
- `overlays/production/certificate-patch.yaml` - Prod cert (letsencrypt-prod)
- `overlays/production/ingress-patch.yaml` - Prod domain

### Documentation
- `.claude/specs/kubernetes-enhancements.md` - Full specification (950 lines)
- `k8s/DEPLOYMENT.md` - Deployment guide (550 lines)
- `k8s/README.md` - Complete reference (650 lines)
- `k8s/verify-deployment.sh` - Verification script (600 lines)

## Quick Deploy

```bash
# Staging
kubectl apply -k k8s/overlays/staging/

# Production
kubectl apply -k k8s/overlays/production/
```

## Quick Verify

```bash
# Run verification script
./k8s/verify-deployment.sh staging orion-staging
./k8s/verify-deployment.sh production orion-prod

# Manual checks
kubectl get all,servicemonitor,pdb,certificate,ingress -n orion-staging
```

## Common Commands

### ServiceMonitor
```bash
kubectl get servicemonitor -n orion
kubectl describe servicemonitor auth-service-monitor -n orion
```

### PodDisruptionBudget
```bash
kubectl get pdb -n orion
kubectl describe pdb auth-service-pdb -n orion
```

### Certificate
```bash
kubectl get certificate -n orion
kubectl describe certificate auth-tls-cert -n orion
kubectl get secret auth-tls-secret -n orion
```

### Ingress
```bash
kubectl get ingress -n orion
kubectl describe ingress auth-ingress -n orion
```

### ClusterIssuers
```bash
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-staging
kubectl describe clusterissuer letsencrypt-prod
```

## Verification URLs

### Prometheus
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# http://localhost:9090/targets
```

### Grafana
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# http://localhost:3000 (admin/prom-operator)
```

### Metrics
```bash
kubectl port-forward -n orion pod/<pod-name> 3001:3001
# http://localhost:3001/metrics
```

### HTTPS Endpoint
```bash
curl -v https://auth-staging.your-domain.com/api/auth/health
curl -v https://auth.your-domain.com/api/auth/health
```

## Testing

### Test PodDisruptionBudget
```bash
kubectl drain <node-name> --ignore-daemonsets
kubectl get pods -n orion -l app=auth-service -w
kubectl uncordon <node-name>
```

### Test Certificate
```bash
openssl s_client -connect auth.your-domain.com:443 -servername auth.your-domain.com
```

### Test Metrics
```bash
kubectl exec -n orion pod/<pod-name> -- wget -qO- http://localhost:3001/metrics
```

## Troubleshooting

### Certificate Issues
```bash
kubectl logs -n cert-manager deploy/cert-manager
kubectl get order,challenge -n orion
kubectl describe certificate auth-tls-cert -n orion
```

### Prometheus Issues
```bash
kubectl logs -n monitoring prometheus-operator
kubectl get servicemonitor -n orion -o yaml
```

### Ingress Issues
```bash
kubectl logs -n ingress-nginx <ingress-pod>
kubectl describe ingress auth-ingress -n orion
```

## Environment Differences

| Feature | Staging | Production |
|---------|---------|------------|
| Namespace | orion-staging | orion-prod |
| Domain | auth-staging.orion.example.com | auth.orion.example.com |
| Issuer | letsencrypt-staging | letsencrypt-prod |
| Replicas | 2 | 5 |
| Rate Limit | 100 RPS | 200 RPS |
| Image Tag | develop | v1.0.0 |
| Log Level | debug | info |

## Configuration Checklist

Before deploying:

- [ ] Update domains in overlay patches
- [ ] Create secrets.env files (never commit!)
- [ ] Update email in issuer.yaml
- [ ] Install Prometheus Operator
- [ ] Install cert-manager
- [ ] Install NGINX Ingress Controller
- [ ] Configure DNS records
- [ ] Test in staging first
- [ ] Verify certificates issued
- [ ] Verify metrics scraping
- [ ] Run verification script

## Resource Limits

Current configuration (already set):
- CPU request: 100m
- CPU limit: 500m
- Memory request: 128Mi
- Memory limit: 512Mi

## Key Features

1. **ServiceMonitor**: Auto Prometheus scraping (30s interval)
2. **PodDisruptionBudget**: minAvailable: 1 (allows 2 pod disruptions)
3. **Certificate**: 90-day validity, 30-day renewal window
4. **Ingress**: TLS termination, HTTPS redirect, rate limiting
5. **HPA**: 3-10 replicas (staging: 2-10)

## Support

- Full spec: `.claude/specs/kubernetes-enhancements.md`
- Deployment guide: `k8s/DEPLOYMENT.md`
- Complete reference: `k8s/README.md`
- Verification: `./k8s/verify-deployment.sh`
