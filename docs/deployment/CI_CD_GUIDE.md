# ORION CI/CD Pipeline Guide

## Overview

This document describes the comprehensive CI/CD pipeline setup for the ORION platform, including GitHub Actions workflows, GitLab CI configuration, and deployment scripts.

## Table of Contents

1. [Pipeline Architecture](#pipeline-architecture)
2. [GitHub Actions Workflows](#github-actions-workflows)
3. [GitLab CI Configuration](#gitlab-ci-configuration)
4. [Deployment Strategies](#deployment-strategies)
5. [Scripts Reference](#scripts-reference)
6. [Environment Configuration](#environment-configuration)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)

## Pipeline Architecture

### CI Pipeline Flow

```
┌─────────────┐
│   Commit    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│           Setup & Cache                 │
│  - Install dependencies (pnpm)          │
│  - Cache node_modules & Nx cache        │
└──────┬──────────────────────────────────┘
       │
       ├──────────────────┬─────────────────┬─────────────────┐
       ▼                  ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│ Code Quality │  │  Unit Tests  │  │ Integration │  │   E2E Tests  │
│  - ESLint    │  │  - Parallel  │  │    Tests    │  │              │
│  - Prettier  │  │  - Coverage  │  └─────────────┘  └──────────────┘
│  - TypeCheck │  └──────────────┘
└──────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│            Build Services               │
│  - auth, gateway, notifications, user   │
│  - Parallel builds with Nx              │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         Docker Build & Scan             │
│  - Build images for each service        │
│  - Trivy security scanning              │
│  - Push to ghcr.io                      │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│        SonarQube Analysis               │
│  - Code quality metrics                 │
│  - Coverage analysis                    │
│  - Quality gate check                   │
└─────────────────────────────────────────┘
```

### CD Pipeline Flow

```
Development Branch (develop)
       │
       ▼
┌─────────────────────────┐
│   Auto Deploy to Dev    │
└──────────┬──────────────┘
           │
Staging Branch (staging)
           │
           ▼
┌─────────────────────────┐
│  Manual Deploy Staging  │
│  - Blue-Green           │
│  - Smoke Tests          │
└──────────┬──────────────┘
           │
Main Branch (main)
           │
           ▼
┌─────────────────────────┐
│   Approval Required     │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Deploy to Production   │
│  - Blue-Green           │
│  - Canary Release       │
│  - Comprehensive Tests  │
└─────────────────────────┘
```

## GitHub Actions Workflows

### Main CI Pipeline (ci.yml)

**Trigger:** Push to any branch, Pull Requests

**Jobs:**
- `setup`: Install dependencies, setup caching
- `code-quality`: ESLint, Prettier, TypeScript checks
- `test`: Parallel unit tests for each service
- `test-integration`: Integration tests with DB/Redis
- `test-e2e`: End-to-end tests
- `build`: Build all services
- `docker-build`: Build and scan Docker images
- `sonarqube`: Code quality analysis
- `summary`: Aggregate results
- `notify`: Send Slack/Discord notifications

**Optimizations:**
- Parallel test execution per service
- Nx computation caching
- pnpm store caching
- Docker layer caching

### Development Deployment (cd-dev.yml)

**Trigger:** Push to `develop` or `feature/**` branches

**Strategy:** Direct kubectl apply

**Steps:**
1. Configure kubectl
2. Apply Kubernetes manifests
3. Run migrations
4. Verify deployment
5. Basic smoke tests

### Staging Deployment (cd-staging.yml)

**Trigger:** Push to `staging` branch

**Strategy:** Blue-Green deployment

**Steps:**
1. Backup current deployment
2. Deploy to green environment
3. Run database migrations
4. Verify green deployment
5. Run comprehensive smoke tests
6. Switch traffic to green
7. Monitor for 30 seconds
8. Cleanup blue deployment
9. Rollback on failure

### Production Deployment (cd-production.yml)

**Trigger:** Push to `main` or tags `v*.*.*`

**Strategy:** Canary + Blue-Green deployment

**Approval:** Manual approval required

**Steps:**
1. Request approval
2. Backup deployment state
3. Deploy to green environment
4. Run database migrations
5. Verify green deployment
6. Run comprehensive tests
7. Performance tests
8. Canary release (10% traffic)
9. Monitor metrics
10. Increase to 50% traffic
11. Full traffic switch
12. Monitor production
13. Cleanup blue (after 1 hour)
14. Rollback on failure

### Security Scanning (security-scan.yml)

**Trigger:** Daily at 2 AM, Push, Pull Requests

**Scanners:**
- Trivy: Filesystem and Docker image scanning
- Snyk: Dependency vulnerability scanning
- CodeQL: Static code analysis
- npm audit: npm package vulnerabilities

### Dependency Updates (dependency-update.yml)

**Trigger:** Weekly on Mondays

**Process:**
1. Update dependencies with pnpm
2. Run full test suite
3. Create pull request if tests pass
4. Assign to maintainers

## GitLab CI Configuration

### Pipeline Stages

1. **setup**: Install dependencies, build
2. **quality**: Code quality checks
3. **test**: Unit and integration tests
4. **build**: Docker image builds
5. **security**: Security scanning
6. **deploy**: Environment deployments

### Key Features

- YAML anchors for DRY configuration
- Service containers for DB/Redis
- Docker-in-Docker for image builds
- Environment-specific deployments
- Manual approval gates

## Deployment Strategies

### Blue-Green Deployment

Used for: Staging and Production

**Benefits:**
- Zero-downtime deployments
- Instant rollback capability
- Full traffic switch

**Process:**
1. Deploy to inactive environment (green)
2. Verify green deployment
3. Switch traffic from blue to green
4. Monitor green environment
5. Cleanup blue after verification

### Canary Release

Used for: Production only

**Benefits:**
- Gradual traffic increase
- Risk mitigation
- Real-world validation

**Process:**
1. Deploy new version
2. Route 10% traffic to new version
3. Monitor metrics and errors
4. Increase to 50% if stable
5. Full traffic switch
6. Rollback if issues detected

## Scripts Reference

### ci-setup.sh

Setup CI environment with required tools.

```bash
./scripts/ci-setup.sh [environment]
```

**Actions:**
- Install kubectl, helm, kustomize
- Configure kubectl for environment
- Setup Docker credentials
- Load environment variables

### deploy.sh

Generic deployment script for all environments.

```bash
./scripts/deploy.sh [environment] [options]

Options:
  --service <name>     Deploy specific service
  --skip-migrations    Skip database migrations
  --skip-tests         Skip smoke tests
  --dry-run           Preview deployment
```

### rollback.sh

Rollback deployment to previous version.

```bash
./scripts/rollback.sh [environment] [options]

Options:
  --revision <number>  Rollback to specific revision
  --service <name>     Rollback specific service
```

### backup-deployment.sh

Backup current Kubernetes state.

```bash
./scripts/backup-deployment.sh [environment]
```

**Backs up:**
- Deployments
- Services
- ConfigMaps
- Secrets
- Ingress
- HPA

### verify-deployment.sh

Verify deployment health and readiness.

```bash
./scripts/verify-deployment.sh [environment]
```

**Checks:**
- Deployment status
- Pod health
- Service endpoints
- Resource usage

### smoke-tests.sh

Run smoke tests against deployed environment.

```bash
./scripts/smoke-tests.sh [environment]
```

## Environment Configuration

### Required Secrets

#### GitHub Actions

```yaml
# Kubernetes Configuration
KUBE_CONFIG_DEV         # Base64 encoded kubeconfig for dev
KUBE_CONFIG_STAGING     # Base64 encoded kubeconfig for staging
KUBE_CONFIG_PROD        # Base64 encoded kubeconfig for production

# Container Registry
GITHUB_TOKEN            # Automatically provided by GitHub

# Code Quality
SONAR_TOKEN            # SonarQube authentication token
SONAR_HOST_URL         # SonarQube server URL
CODECOV_TOKEN          # Codecov upload token

# Security Scanning
SNYK_TOKEN             # Snyk authentication token

# Notifications
SLACK_WEBHOOK_URL      # Slack webhook for notifications

# Optional
NX_CLOUD_ACCESS_TOKEN  # Nx Cloud for distributed caching
```

#### GitLab CI

```yaml
# Kubernetes
KUBE_CONFIG            # Kubernetes configuration

# Registry
CI_REGISTRY            # GitLab container registry
CI_REGISTRY_USER       # Registry username
CI_REGISTRY_PASSWORD   # Registry password

# Deployment
DEPLOY_TOKEN           # Deployment authentication
```

### Environment Variables

Create `.env.[environment]` files:

```bash
# .env.development
DATABASE_URL=postgresql://user:pass@localhost:5432/orion_dev
REDIS_URL=redis://localhost:6379
NODE_ENV=development

# .env.staging
DATABASE_URL=postgresql://user:pass@db.staging:5432/orion_staging
REDIS_URL=redis://redis.staging:6379
NODE_ENV=staging

# .env.production
DATABASE_URL=postgresql://user:pass@db.prod:5432/orion_prod
REDIS_URL=redis://redis.prod:6379
NODE_ENV=production
```

## Security

### Best Practices

1. **Secrets Management**
   - Never commit secrets to repository
   - Use environment secrets
   - Rotate secrets regularly
   - Use different secrets per environment

2. **Image Scanning**
   - Scan all Docker images before deployment
   - Block deployment on critical vulnerabilities
   - Regular dependency updates

3. **Access Control**
   - Require approvals for production
   - Use RBAC for Kubernetes
   - Limit CI/CD permissions

4. **Audit Trail**
   - Log all deployments
   - Track who deployed what
   - Monitor deployment changes

### Security Scanning Results

- **Trivy**: Uploaded to GitHub Security tab
- **Snyk**: Results in Snyk dashboard
- **CodeQL**: Uploaded to GitHub Security tab
- **SonarQube**: Available in SonarQube dashboard

## Troubleshooting

### Common Issues

#### 1. Failed Tests

```bash
# Run tests locally
pnpm test

# Run specific service tests
pnpm nx test auth

# Check test logs
kubectl logs -n orion-dev job/tests
```

#### 2. Deployment Failures

```bash
# Check deployment status
kubectl get deployments -n orion-staging

# Check pod logs
kubectl logs -n orion-staging -l app=auth-service

# Describe failing pod
kubectl describe pod <pod-name> -n orion-staging

# Rollback manually
./scripts/rollback.sh staging
```

#### 3. Database Migration Issues

```bash
# Check migration job
kubectl get jobs -n orion-staging

# View migration logs
kubectl logs -n orion-staging job/migrations

# Rollback migration manually
kubectl exec -it <pod-name> -n orion-staging -- npm run prisma:migrate:rollback
```

#### 4. Image Pull Failures

```bash
# Check image exists
docker pull ghcr.io/org/orion/auth:latest

# Verify registry credentials
kubectl get secret -n orion-staging

# Update image pull secret
kubectl create secret docker-registry ghcr \
  --docker-server=ghcr.io \
  --docker-username=$USERNAME \
  --docker-password=$TOKEN \
  -n orion-staging
```

### Debug Mode

Enable verbose logging:

```bash
# GitHub Actions
export ACTIONS_RUNNER_DEBUG=true
export ACTIONS_STEP_DEBUG=true

# Scripts
export DEBUG=true
./scripts/deploy.sh staging
```

### Health Checks

```bash
# Check service health
curl https://api.orion.example.com/health

# Check metrics
curl https://api.orion.example.com/metrics

# Kubernetes health
kubectl get --raw /healthz
```

## Monitoring

### Deployment Metrics

Track these metrics after deployment:

- **Response Time**: API endpoint latency
- **Error Rate**: HTTP 5xx errors
- **Pod Health**: Ready/Total replicas
- **Resource Usage**: CPU and memory utilization
- **Database Performance**: Query execution time

### Alerting

Configure alerts for:

- Deployment failures
- High error rates
- Resource exhaustion
- Failed health checks
- Security vulnerabilities

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Nx Documentation](https://nx.dev/getting-started/intro)

## Support

For CI/CD pipeline issues:
- Check GitHub Actions/GitLab CI logs
- Review deployment scripts
- Contact DevOps team
- Create issue in repository

---

**Last Updated:** 2025-10-18  
**Version:** 1.0.0  
**Maintained By:** ORION DevOps Team
