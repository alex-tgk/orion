# ORION Deployment Automation

This directory contains production-ready deployment scripts for the ORION microservices platform.

## Overview

The deployment automation provides:

- **Pre-deployment health checks** - Validate cluster state before deploying
- **Progressive rollout verification** - Monitor deployment progress in real-time
- **Automated smoke tests** - Verify critical functionality post-deployment
- **Automatic rollback** - Revert changes if deployment fails
- **Comprehensive logging** - Detailed output for troubleshooting
- **Safety guards** - Multiple validation layers for production deployments

## Scripts

### 1. deploy-staging.sh

Deploys ORION platform to the staging environment.

**Usage:**
```bash
./deploy-staging.sh [options]
```

**Options:**
- `--skip-checks` - Skip pre-deployment health checks
- `--skip-tests` - Skip post-deployment smoke tests
- `--dry-run` - Preview deployment without applying changes
- `--help` - Show help message

**Features:**
- Pre-deployment health checks
- Kustomize overlay application
- Rollout status verification
- Pod health monitoring
- Smoke test execution
- Manual rollback on test failure

**Example:**
```bash
# Normal staging deployment
./deploy-staging.sh

# Preview changes without deploying
./deploy-staging.sh --dry-run

# Deploy without running smoke tests
./deploy-staging.sh --skip-tests
```

**Exit Codes:**
- `0` - Deployment successful
- `1` - Pre-deployment checks failed
- `2` - Deployment failed
- `3` - Post-deployment verification failed
- `4` - Smoke tests failed

---

### 2. deploy-production.sh

Deploys ORION platform to the production environment with enhanced safety measures.

**Usage:**
```bash
./deploy-production.sh [options]
```

**Options:**
- `--skip-approval` - Skip manual approval prompt (USE WITH CAUTION)
- `--skip-tests` - Skip post-deployment smoke tests
- `--canary` - Deploy in canary mode (10% traffic) - *Coming soon*
- `--dry-run` - Preview deployment without applying changes
- `--help` - Show help message

**Features:**
- **Stringent pre-deployment checks**
  - Cluster connectivity verification
  - Production namespace validation
  - Secrets configuration validation
  - Current deployment health assessment
  - Recent deployment history check

- **Manual approval requirement**
  - Interactive confirmation prompt
  - Cluster context verification
  - Deployment summary preview

- **Progressive rollout monitoring**
  - Real-time deployment progress tracking
  - 30-second intervals between checks
  - Extended timeout (10 minutes)
  - Detailed pod status reporting

- **Comprehensive health checks**
  - Pod readiness verification (20 retries)
  - Crash loop detection
  - Service endpoint validation
  - Error rate monitoring

- **Automatic rollback**
  - Triggered on verification failure
  - Individual deployment rollback
  - Status verification after rollback
  - Critical error notifications

**Example:**
```bash
# Normal production deployment (with approval)
./deploy-production.sh

# Preview production changes
./deploy-production.sh --dry-run

# Deploy with approval skip (CI/CD only)
./deploy-production.sh --skip-approval
```

**Exit Codes:**
- `0` - Deployment successful
- `1` - Pre-deployment checks failed
- `2` - Deployment failed
- `3` - Post-deployment verification failed
- `4` - Smoke tests failed
- `5` - User cancelled deployment

**Safety Features:**
- ⚠️ Production namespace must exist before deployment
- ⚠️ Secrets file must not contain placeholder values
- ⚠️ Current deployments must be healthy before new deployment
- ⚠️ Manual approval required unless explicitly skipped
- ⚠️ Automatic rollback on any verification failure

---

### 3. smoke-tests.sh

Post-deployment validation to verify critical functionality.

**Usage:**
```bash
./smoke-tests.sh [environment] [options]
```

**Arguments:**
- `environment` - Environment to test: `local`, `staging`, or `production`

**Options:**
- `--comprehensive` - Run comprehensive tests (longer duration)
- `--service NAME` - Test specific service only
- `--timeout SECONDS` - Override default timeout (default: 30s)
- `--help` - Show help message

**Test Categories:**

1. **Infrastructure Tests**
   - Database connectivity
   - Redis connectivity
   - Pod health (Kubernetes)
   - Pod restart monitoring

2. **Service Health Tests**
   - Auth service health/readiness
   - Gateway service health
   - Notification service health
   - User service health

3. **Performance Tests** (comprehensive mode)
   - Response time validation
   - Service latency checks

**Examples:**
```bash
# Basic staging tests
./smoke-tests.sh staging

# Comprehensive production tests
./smoke-tests.sh production --comprehensive

# Test specific service
./smoke-tests.sh staging --service auth

# Local environment tests
./smoke-tests.sh local
```

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more tests failed

---

## Deployment Workflow

### Staging Deployment

```
┌─────────────────────────────────────────────┐
│  1. Pre-deployment Checks                   │
│     ✓ Prerequisites (kubectl, curl, jq)     │
│     ✓ Kubernetes cluster connection         │
│     ✓ Kustomize overlay validation          │
│     ✓ Secrets configuration                 │
│     ✓ Current deployment health             │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  2. Deployment                              │
│     → kubectl apply -k k8s/overlays/staging │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  3. Rollout Verification                    │
│     ✓ Wait for deployment rollout           │
│     ✓ Check pod health (10 retries)         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  4. Smoke Tests                             │
│     → ./smoke-tests.sh staging              │
└──────────────────┬──────────────────────────┘
                   │
            ┌──────┴──────┐
            │  Tests Pass? │
            └──────┬──────┘
                   │
        ┌──────────┴──────────┐
        │                     │
       YES                   NO
        │                     │
        ▼                     ▼
   ┌────────┐          ┌──────────┐
   │ SUCCESS│          │ ROLLBACK │
   └────────┘          └──────────┘
```

### Production Deployment

```
┌─────────────────────────────────────────────┐
│  1. Enhanced Pre-deployment Checks          │
│     ✓ Prerequisites validation              │
│     ✓ Production cluster verification       │
│     ✓ Kustomize overlay validation          │
│     ✓ Secrets validation (no placeholders)  │
│     ✓ Current deployment health (required)  │
│     ✓ Recent deployment check               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  2. Manual Approval                         │
│     → Interactive confirmation prompt        │
│     → Cluster context display               │
│     → Deployment summary                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  3. Deployment                              │
│     → kubectl apply -k k8s/overlays/prod    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  4. Progressive Rollout Monitoring          │
│     ✓ Real-time progress tracking           │
│     ✓ 30-second check intervals             │
│     ✓ 10-minute timeout                     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  5. Comprehensive Health Checks             │
│     ✓ Pod health (20 retries, 10s interval) │
│     ✓ Crash loop detection                  │
│     ✓ Service endpoint validation           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  6. Comprehensive Smoke Tests               │
│     → ./smoke-tests.sh production --comp    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  7. Error Rate Monitoring                   │
│     ✓ Check logs for error patterns         │
└──────────────────┬──────────────────────────┘
                   │
            ┌──────┴──────┐
            │  All Pass?  │
            └──────┬──────┘
                   │
        ┌──────────┴──────────┐
        │                     │
       YES                   NO
        │                     │
        ▼                     ▼
   ┌────────┐     ┌────────────────────┐
   │ SUCCESS│     │ AUTOMATIC ROLLBACK │
   └────────┘     └────────────────────┘
```

## Prerequisites

### Required Tools

- `kubectl` - Kubernetes command-line tool
- `curl` - HTTP client for health checks
- `jq` - JSON processor (recommended)
- `kustomize` - Template-free Kubernetes configuration (optional, kubectl has built-in support)

### Kubernetes Access

Ensure your `kubectl` is configured with the correct context:

```bash
# Check current context
kubectl config current-context

# Switch context if needed
kubectl config use-context your-cluster-context

# Verify access
kubectl cluster-info
```

### Secrets Configuration

Before deploying, ensure secrets are configured:

**Staging:**
```bash
cd k8s/overlays/staging
cp secrets.env.example secrets.env
# Edit secrets.env with actual values
```

**Production:**
```bash
cd k8s/overlays/production
cp secrets.env.example secrets.env
# Edit secrets.env with actual production values
# IMPORTANT: No placeholder values allowed
```

**Required secrets:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)

## Environment-Specific Configurations

### Staging

- **Namespace:** `orion-staging`
- **Replicas:** 2 per service
- **Resources:** Moderate limits
- **Image Tag:** `develop`
- **Log Level:** `debug`
- **Timeout:** 5 minutes
- **Health Check Retries:** 10

### Production

- **Namespace:** `orion-prod`
- **Replicas:** 5 per service
- **Resources:** Higher limits with autoscaling
- **Image Tag:** Versioned (e.g., `v1.0.0`)
- **Log Level:** `info`
- **Timeout:** 10 minutes
- **Health Check Retries:** 20
- **Manual Approval:** Required

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=./kubeconfig

      - name: Deploy to staging
        run: |
          chmod +x scripts/deploy-staging.sh
          ./scripts/deploy-staging.sh
```

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.PROD_KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=./kubeconfig

      - name: Deploy to production
        run: |
          chmod +x scripts/deploy-production.sh
          # Skip approval in CI/CD (manual approval via GitHub environment)
          ./scripts/deploy-production.sh --skip-approval
```

## Troubleshooting

### Common Issues

**1. "Cannot connect to Kubernetes cluster"**
```bash
# Check kubectl configuration
kubectl config view
kubectl cluster-info

# Test cluster access
kubectl get nodes
```

**2. "Secrets file not found"**
```bash
# Create secrets file from template
cd k8s/overlays/staging
cp secrets.env.example secrets.env
# Edit with actual values
```

**3. "Deployment timeout"**
```bash
# Check pod status
kubectl get pods -n orion-staging

# Check pod logs
kubectl logs <pod-name> -n orion-staging

# Describe pod for events
kubectl describe pod <pod-name> -n orion-staging
```

**4. "Smoke tests failing"**
```bash
# Run tests with verbose output
./smoke-tests.sh staging --comprehensive

# Test specific service
./smoke-tests.sh staging --service auth

# Check service endpoints
kubectl get endpoints -n orion-staging
```

### Manual Rollback

If automatic rollback fails:

```bash
# List deployment history
kubectl rollout history deployment/staging-auth-service -n orion-staging

# Rollback to previous version
kubectl rollout undo deployment/staging-auth-service -n orion-staging

# Rollback to specific revision
kubectl rollout undo deployment/staging-auth-service --to-revision=2 -n orion-staging

# Check rollout status
kubectl rollout status deployment/staging-auth-service -n orion-staging
```

### Debug Mode

Enable debug output:

```bash
# Add -x flag to script
bash -x ./deploy-staging.sh
```

## Security Considerations

1. **Secrets Management**
   - Never commit `secrets.env` files to version control
   - Use restricted file permissions (600 or 400)
   - Consider using external secrets management (HashiCorp Vault, AWS Secrets Manager)

2. **Production Access**
   - Limit production kubectl access to authorized personnel
   - Use separate service accounts for CI/CD
   - Enable audit logging in Kubernetes

3. **Deployment Approval**
   - Always require manual approval for production
   - Use `--skip-approval` only in controlled CI/CD environments
   - Implement change management processes

## Best Practices

1. **Always test in staging first**
   ```bash
   ./deploy-staging.sh
   # Verify staging, then:
   ./deploy-production.sh
   ```

2. **Use dry-run for verification**
   ```bash
   ./deploy-production.sh --dry-run
   ```

3. **Monitor deployments**
   ```bash
   # In another terminal
   watch kubectl get pods -n orion-prod
   ```

4. **Review logs after deployment**
   ```bash
   kubectl logs -f -n orion-prod -l app=auth-service
   ```

5. **Keep deployment history**
   ```bash
   kubectl rollout history deployment/prod-auth-service -n orion-prod
   ```

## Future Enhancements

- [ ] Canary deployments with traffic splitting
- [ ] Blue-green deployment strategy
- [ ] Integration with Argo Rollouts
- [ ] Slack/email notifications
- [ ] Metrics-based rollback (via Prometheus)
- [ ] Database migration automation
- [ ] Load testing integration
- [ ] Performance regression detection

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review deployment logs
3. Check Kubernetes events: `kubectl get events -n orion-staging --sort-by='.lastTimestamp'`
4. Contact the platform team

---

**Last Updated:** 2025-10-18
**Version:** 1.0.0
**Maintained By:** ORION Platform Team
