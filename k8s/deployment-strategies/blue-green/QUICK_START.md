# Blue-Green Deployment Quick Start Guide

## TL;DR

```bash
# Deploy new version to auth service
./scripts/deployment/blue-green-deploy.sh auth v1.2.3

# Deploy to all services
./scripts/deployment/blue-green-deploy.sh all v1.2.4

# Deploy without switching traffic (testing)
./scripts/deployment/blue-green-deploy.sh gateway v1.2.3 --no-switch

# Rollback by switching traffic
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'
```

## 5-Minute Setup

### 1. Apply Blue-Green Manifests (One-Time Setup)

```bash
# Navigate to project root
cd /path/to/orion

# Apply all blue-green configurations
kubectl apply -f k8s/deployment-strategies/blue-green/
```

### 2. Verify Setup

```bash
# Check deployments (you should see blue and green for each service)
kubectl get deployments -n orion -l deployment-strategy=blue-green

# Check services
kubectl get services -n orion | grep -E 'auth|gateway|notification|user'

# Check active slots (should show 'blue')
kubectl get services -n orion \
  -o custom-columns=NAME:.metadata.name,ACTIVE_SLOT:.spec.selector.slot
```

### 3. First Deployment

```bash
# Deploy auth service v1.2.3
./scripts/deployment/blue-green-deploy.sh auth v1.2.3

# The script will:
# ✓ Deploy to inactive slot (green)
# ✓ Run health checks
# ✓ Execute smoke tests
# ✓ Switch traffic
# ✓ Monitor for errors
# ✓ Scale down old version
```

## Common Commands

### Check Active Slot

```bash
# Quick check
kubectl get service auth-service -n orion \
  -o jsonpath='{.spec.selector.slot}'

# With annotation
kubectl get service auth-service -n orion \
  -o jsonpath='{.metadata.annotations.deployment\.orion\.io/active-slot}'
```

### Manual Traffic Switch

```bash
# Switch to green
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"green"}}}'

# Switch to blue
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'
```

### Test Before Switching

```bash
# Deploy to green without switching
./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --no-switch

# Port-forward to green service
kubectl port-forward service/auth-service-green 8080:80 -n orion

# Test in another terminal
curl http://localhost:8080/health
curl http://localhost:8080/api/auth/ping

# If tests pass, manually switch
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"green"}}}'
```

### Quick Rollback

```bash
# Instant rollback - just switch traffic back
kubectl patch service auth-service -n orion \
  -p '{"spec":{"selector":{"slot":"blue"}}}'

# Ensure old deployment is running
kubectl scale deployment auth-service-blue --replicas=3 -n orion
```

### Monitor Deployment

```bash
# Watch pods
kubectl get pods -n orion -l app=auth-service -w

# Check logs
kubectl logs -n orion -l slot=green -f

# Check resource usage
kubectl top pods -n orion -l app=auth-service
```

## Deployment Workflow

### Standard Flow

```
1. Build & Push Image
   ↓
2. Run Deployment Script
   ↓
3. Script deploys to inactive slot
   ↓
4. Script runs tests
   ↓
5. Script switches traffic
   ↓
6. Script monitors for errors
   ↓
7. Script scales down old version
   ✓ Done
```

### With Manual Switch

```
1. Build & Push Image
   ↓
2. Deploy with --no-switch
   ↓
3. Manually test green deployment
   ↓
4. Manually switch traffic
   ↓
5. Monitor deployment
   ↓
6. Manually scale down old version
   ✓ Done
```

## Script Options

```bash
./scripts/deployment/blue-green-deploy.sh <service> <version> [options]

Services:
  auth            - Authentication service
  gateway         - API Gateway
  notifications   - Notification service
  user            - User service
  all             - Deploy all services

Options:
  --namespace         - Kubernetes namespace (default: orion)
  --skip-tests        - Skip smoke tests
  --no-auto-rollback  - Don't rollback on failure
  --no-switch         - Deploy but don't switch traffic
  --dry-run           - Preview without making changes
```

## Troubleshooting

### Issue: "Cannot connect to cluster"

```bash
# Check kubectl config
kubectl cluster-info

# Check context
kubectl config current-context

# Switch context if needed
kubectl config use-context <context-name>
```

### Issue: "Pods not starting"

```bash
# Check pod status
kubectl get pods -n orion -l slot=green

# Describe pod
kubectl describe pod <pod-name> -n orion

# Check logs
kubectl logs <pod-name> -n orion

# Common causes:
# - Image pull errors (check image name/tag)
# - Resource limits (check node capacity)
# - ConfigMap/Secret missing
```

### Issue: "Health checks failing"

```bash
# Port-forward and test manually
kubectl port-forward <pod-name> 8080:3001 -n orion
curl http://localhost:8080/health

# Check environment variables
kubectl exec -it <pod-name> -n orion -- env | grep -E 'DATABASE|REDIS|JWT'

# Common causes:
# - Database connection issues
# - Missing secrets
# - Slow startup (increase initialDelaySeconds)
```

### Issue: "Traffic not switching"

```bash
# Verify service selector
kubectl get service auth-service -n orion -o yaml | grep -A 2 selector

# Check endpoints
kubectl get endpoints auth-service -n orion

# Verify pod labels
kubectl get pods -n orion -l app=auth-service --show-labels

# Common causes:
# - Label mismatch
# - Pods not ready
# - Network policy blocking
```

## GitHub Actions

### Manual Trigger

1. Go to Actions tab in GitHub
2. Select "Blue-Green Deployment"
3. Click "Run workflow"
4. Fill in parameters:
   - Service: auth/gateway/notifications/user/all
   - Image tag: v1.2.3
   - Environment: staging/production
   - Options: skip tests, no switch, etc.
5. Click "Run workflow"

### Automatic on Tag

```bash
# Create and push tag
git tag v1.2.3
git push origin v1.2.3

# Workflow automatically:
# - Builds images
# - Deploys to staging
# - Runs tests
# - (Manual approval for production)
```

## Best Practices

1. **Always test in staging first**
   ```bash
   ./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --namespace orion-staging
   ```

2. **Use --no-switch for risky deployments**
   ```bash
   ./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --no-switch
   # Test thoroughly before switching
   ```

3. **Monitor after switching**
   ```bash
   # Keep logs open
   kubectl logs -n orion -l slot=green -f

   # Watch metrics in Grafana
   # Watch error rates in Sentry
   ```

4. **Don't scale down old version immediately**
   ```bash
   # Wait 10-15 minutes before scaling down
   # Allows quick rollback if issues appear
   ```

5. **Keep deployment notes**
   ```bash
   # Document what was deployed and when
   echo "$(date): Deployed auth v1.2.3 to production" >> deployments.log
   ```

## Cheat Sheet

| Task | Command |
|------|---------|
| Deploy | `./scripts/deployment/blue-green-deploy.sh auth v1.2.3` |
| Deploy all | `./scripts/deployment/blue-green-deploy.sh all v1.2.3` |
| Deploy without switch | `./scripts/deployment/blue-green-deploy.sh auth v1.2.3 --no-switch` |
| Check active slot | `kubectl get svc auth-service -n orion -o jsonpath='{.spec.selector.slot}'` |
| Switch to green | `kubectl patch svc auth-service -n orion -p '{"spec":{"selector":{"slot":"green"}}}'` |
| Switch to blue | `kubectl patch svc auth-service -n orion -p '{"spec":{"selector":{"slot":"blue"}}}'` |
| Rollback | `kubectl patch svc auth-service -n orion -p '{"spec":{"selector":{"slot":"blue"}}}'` |
| Scale up | `kubectl scale deploy auth-service-green --replicas=3 -n orion` |
| Scale down | `kubectl scale deploy auth-service-blue --replicas=0 -n orion` |
| Watch pods | `kubectl get pods -n orion -l app=auth-service -w` |
| Check logs | `kubectl logs -n orion -l slot=green -f` |
| Port-forward | `kubectl port-forward svc/auth-service-green 8080:80 -n orion` |

## Next Steps

1. Read the full documentation: [docs/deployment/blue-green-strategy.md](/docs/deployment/blue-green-strategy.md)
2. Review the deployment script: [scripts/deployment/blue-green-deploy.sh](/scripts/deployment/blue-green-deploy.sh)
3. Check GitHub Actions: [.github/workflows/blue-green-deploy.yml](/.github/workflows/blue-green-deploy.yml)
4. Practice in staging environment
5. Set up monitoring and alerting

## Support

- Documentation: `/docs/deployment/blue-green-strategy.md`
- Issues: Create GitHub issue with `deployment` label
- Urgent: Contact DevOps team on Slack #devops
