# ORION Deployment Quick Reference

## Quick Start

### Deploy to Staging
```bash
cd /path/to/orion
./scripts/deploy-staging.sh
```

### Deploy to Production
```bash
cd /path/to/orion
./scripts/deploy-production.sh
# Requires manual confirmation
```

### Run Smoke Tests
```bash
./scripts/smoke-tests.sh staging
./scripts/smoke-tests.sh production --comprehensive
```

## Common Commands

### Preview Changes (Dry Run)
```bash
./scripts/deploy-staging.sh --dry-run
./scripts/deploy-production.sh --dry-run
```

### Deploy Without Tests
```bash
./scripts/deploy-staging.sh --skip-tests
```

### Test Specific Service
```bash
./scripts/smoke-tests.sh staging --service auth
```

## Quick Checks

### Check Deployment Status
```bash
# Staging
kubectl get pods -n orion-staging
kubectl get deployments -n orion-staging

# Production
kubectl get pods -n orion-prod
kubectl get deployments -n orion-prod
```

### View Logs
```bash
# Staging
kubectl logs -f -n orion-staging -l app=auth-service

# Production
kubectl logs -f -n orion-prod -l app=auth-service
```

### Manual Rollback
```bash
# Staging
kubectl rollout undo deployment/staging-auth-service -n orion-staging

# Production
kubectl rollout undo deployment/prod-auth-service -n orion-prod
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Pre-deployment checks failed |
| 2 | Deployment failed |
| 3 | Post-deployment verification failed |
| 4 | Smoke tests failed |
| 5 | User cancelled (production only) |

## File Locations

```
scripts/
├── deploy-staging.sh       # Staging deployment
├── deploy-production.sh    # Production deployment
├── smoke-tests.sh          # Post-deployment tests
├── DEPLOYMENT.md           # Full documentation
└── QUICK_REFERENCE.md      # This file

k8s/
├── base/                   # Base Kubernetes configs
├── overlays/
│   ├── staging/            # Staging-specific configs
│   │   └── secrets.env     # ⚠️ Create before deploy
│   └── production/         # Production-specific configs
│       └── secrets.env     # ⚠️ Create before deploy
```

## Pre-deployment Checklist

### Staging
- [ ] kubectl context is correct
- [ ] `k8s/overlays/staging/secrets.env` exists and configured
- [ ] Cluster has sufficient resources
- [ ] Previous deployment is healthy (if exists)

### Production
- [ ] kubectl context is production cluster
- [ ] `k8s/overlays/production/secrets.env` exists with NO placeholders
- [ ] All staging tests passed
- [ ] Manual approval prepared
- [ ] Rollback plan documented
- [ ] Team notified

## Emergency Procedures

### Immediate Rollback
```bash
# Production
./scripts/deploy-production.sh  # Will auto-rollback on failure

# Or manual rollback
kubectl rollout undo deployment/prod-auth-service -n orion-prod
kubectl rollout undo deployment/prod-gateway -n orion-prod
kubectl rollout undo deployment/prod-notification -n orion-prod
kubectl rollout undo deployment/prod-user -n orion-prod
```

### Check Cluster Health
```bash
kubectl get nodes
kubectl top nodes
kubectl get events --sort-by='.lastTimestamp' -n orion-prod | tail -20
```

### Service Recovery
```bash
# Restart specific deployment
kubectl rollout restart deployment/prod-auth-service -n orion-prod

# Scale deployment
kubectl scale deployment/prod-auth-service --replicas=10 -n orion-prod
```

## Help

```bash
./scripts/deploy-staging.sh --help
./scripts/deploy-production.sh --help
./scripts/smoke-tests.sh --help
```

## Support Contacts

- Platform Team: platform@orion.com
- On-Call: oncall@orion.com
- Slack: #orion-platform

---

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive documentation**
