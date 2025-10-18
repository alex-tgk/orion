# MCP Implementation Guide for ORION

This guide provides step-by-step instructions for implementing MCP enhancements in the ORION project.

## Phase 1: Critical MCPs (Day 1)

### Step 1: Install GitHub MCP

```bash
# Install globally
npm install -g @modelcontextprotocol/server-github

# Set up GitHub token
export GITHUB_TOKEN="your_github_personal_access_token"

# Add to shell profile
echo 'export GITHUB_TOKEN="your_token"' >> ~/.zshrc  # or ~/.bashrc
```

### Step 2: Install PostgreSQL MCP

```bash
# Install globally
npm install -g @modelcontextprotocol/server-postgres

# Test connection
POSTGRES_URL="postgresql://orion:orion_dev@localhost:5432/orion_dev" \
  npx @modelcontextprotocol/server-postgres
```

### Step 3: Create MCP Configuration

```bash
# Already created at: .claude/mcp/config.json
# Verify it exists and has correct paths
cat .claude/mcp/config.json
```

### Step 4: Test MCP Connections

```bash
# Start services
pnpm docker:up

# Test in Claude Code
# Type: "List GitHub issues for this repository"
# Type: "Show database schema for orion_dev"
```

## Phase 2: Custom Slash Commands (Day 1-2)

### Create Commands Directory

```bash
mkdir -p .claude/commands
```

### Command 1: /commit-and-push

```bash
cat > .claude/commands/commit-and-push.md << 'EOF'
---
description: Create conventional commit, run checks, and push
---

Execute the following workflow:

1. Review current changes:
   - Run: git status
   - Run: git diff
   - Summarize changes for user

2. Create conventional commit:
   - Determine appropriate type (feat/fix/docs/etc.)
   - Generate clear, descriptive message
   - Include scope if applicable

3. Stage and commit:
   - Run: git add -A (or prompt user for specific files)
   - Run: git commit -m "generated message"

4. Run pre-commit checks manually if needed:
   - Run: pnpm lint:fix
   - Run: pnpm format
   - Run: pnpm test:affected

5. Push to remote:
   - Run: git push
   - Confirm success

6. Provide summary of what was committed and pushed
EOF
```

### Command 2: /new-service

```bash
cat > .claude/commands/new-service.md << 'EOF'
---
description: Generate a new microservice with spec, tests, and infrastructure
---

Create a new service following GitHub Spec Kit methodology:

1. **Create Specification** (.claude/specs/{name}-service.md):
   - Problem Analysis (First Principles)
   - Success Criteria
   - Design Decisions
   - API Contract
   - Implementation Plan

2. **Generate Service Structure**:
   ```bash
   pnpm nx g @nx/nest:app {name} --directory=packages/{name}
   ```

3. **Create Core Files**:
   - Controller with DTOs
   - Service with business logic
   - Module with dependencies
   - Unit tests for all

4. **Add Infrastructure**:
   - Dockerfile (multi-stage)
   - docker-compose entry
   - K8s manifests (base + overlays)
   - Helm chart

5. **Update Documentation**:
   - Service README
   - API documentation
   - Architecture diagrams

6. **Create Initial Commit**:
   - Commit: "feat: initialize {name} service"
   - Include all generated files

7. **Create GitHub Issue**:
   - Track implementation progress
   - Link to spec file
   - Add appropriate labels
EOF
```

### Command 3: /spec-sync

```bash
cat > .claude/commands/spec-sync.md << 'EOF'
---
description: Synchronize GitHub Spec Kit specs with implementation
---

Validate and sync specifications:

1. **List All Specs**:
   - Find all files in .claude/specs/
   - Display spec names and last modified dates

2. **Check Implementation Status**:
   For each spec:
   - Identify target service
   - Check if service exists
   - Verify key features are implemented

3. **Identify Gaps**:
   - Features in spec but not implemented
   - Implemented features not in spec
   - Outdated specs

4. **Generate Reports**:
   - Spec coverage percentage
   - List of missing features
   - List of undocumented features

5. **Create Action Items**:
   - GitHub issues for missing features
   - Update specs for new features
   - Mark deprecated features

6. **Update Spec Status**:
   - Add implementation status to specs
   - Update last reviewed dates
   - Note any deviations
EOF
```

### Command 4: /health-check

```bash
cat > .claude/commands/health-check.md << 'EOF'
---
description: Comprehensive system health check
---

Perform complete system health analysis:

1. **Service Health**:
   - Run: pnpm health
   - Check all microservices responding
   - Verify health endpoints return 200

2. **Metrics Review**:
   - Run: pnpm metrics
   - Check error rates < 1%
   - Verify P95 latency < 1000ms
   - Review throughput trends

3. **Diagnostics**:
   - Run: pnpm diagnose
   - Check for warnings
   - Identify potential issues

4. **Infrastructure Check**:
   - Docker: docker ps (all services running)
   - Database: psql connection test
   - Redis: redis-cli ping
   - RabbitMQ: rabbitmq-diagnostics status

5. **Kubernetes Check** (if applicable):
   - kubectl get pods -n orion
   - kubectl get services -n orion
   - Check for CrashLoopBackOff or Error states

6. **Generate Report**:
   - Overall health score (0-100)
   - List of issues found
   - Recommended actions
   - Trends compared to previous checks
EOF
```

### Command 5: /deploy

```bash
cat > .claude/commands/deploy.md << 'EOF'
---
description: Deploy to specified environment (staging/production)
---

Execute deployment workflow:

1. **Validate Environment**:
   - Confirm environment: staging or production
   - Check user has appropriate permissions
   - Verify target cluster connection

2. **Pre-Deployment Checks**:
   - All tests passing
   - No uncommitted changes
   - Version bumped (if required)
   - Changelog updated

3. **Build**:
   - Run: pnpm build:prod
   - Build Docker images
   - Tag with version and environment

4. **Push Images**:
   - Push to container registry (GHCR)
   - Verify image upload successful
   - Scan for vulnerabilities

5. **Deploy to Environment**:
   ```bash
   # For Kubernetes
   kubectl apply -k k8s/overlays/{environment}

   # For Helm
   helm upgrade --install orion ./charts/orion \
     --namespace orion \
     --values ./charts/orion/values-{environment}.yaml
   ```

6. **Monitor Rollout**:
   - kubectl rollout status deployment/{service} -n orion
   - Watch pod status
   - Check logs for errors

7. **Run Smoke Tests**:
   - Test critical endpoints
   - Verify authentication works
   - Check database connectivity
   - Test key user flows

8. **Rollback Plan**:
   - If issues detected:
     - kubectl rollout undo deployment/{service} -n orion
     - Notify team
     - Create incident report

9. **Post-Deployment**:
   - Update deployment tracking
   - Notify team in Slack/Discord
   - Monitor metrics for 15 minutes
   - Update status page
EOF
```

## Phase 3: Enhanced Pre-Commit Hooks (Day 2)

### Update .lintstagedrc.json

```bash
cat > .lintstagedrc.json << 'EOF'
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "bash -c 'pnpm test:affected --passWithNoTests'"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ],
  "packages/*/src/**/*.{service,controller}.ts": [
    "bash -c 'pnpm docs:generate --no-verify'"
  ],
  ".claude/**/*.json": [
    "bash -c 'node scripts/validate-mcp-schema.js'"
  ],
  ".claude/specs/**/*.md": [
    "bash -c 'pnpm spec:validate --no-verify'"
  ]
}
EOF
```

### Create Validation Scripts

```bash
# Create scripts directory
mkdir -p scripts

# MCP Schema Validator
cat > scripts/validate-mcp-schema.js << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple JSON validation
const files = process.argv.slice(2);

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    JSON.parse(content);
    console.log(`✓ ${file} is valid JSON`);
  } catch (error) {
    console.error(`✗ ${file} has invalid JSON:`);
    console.error(error.message);
    process.exit(1);
  }
}
EOF

chmod +x scripts/validate-mcp-schema.js
```

## Phase 4: Monitoring & Observability (Day 3-4)

### Install Dependencies

```bash
# Sentry for error tracking
pnpm add @sentry/node @sentry/nestjs

# OpenTelemetry for tracing
pnpm add @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/instrumentation-http \
  @opentelemetry/instrumentation-nestjs-core

# Prometheus for metrics
pnpm add @willsoto/nestjs-prometheus prom-client

# Winston for logging
pnpm add winston
```

### Configure Sentry

```typescript
// packages/shared/src/sentry/sentry.config.ts
import * as Sentry from '@sentry/node';

export const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
};
```

### Configure OpenTelemetry

```typescript
// packages/shared/src/telemetry/telemetry.config.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const initTelemetry = () => {
  const sdk = new NodeSDK({
    serviceName: process.env.SERVICE_NAME || 'orion',
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
};
```

## Phase 5: Testing Infrastructure (Day 4-5)

### Add Test Utilities

```typescript
// packages/shared/src/testing/test-utils.ts
import { Test, TestingModule } from '@nestjs/testing';

export const createMockRepository = <T>() => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

export const createMockRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  exists: jest.fn(),
});

export const createTestingModule = async (metadata: any): Promise<TestingModule> => {
  return await Test.createTestingModule(metadata).compile();
};
```

### Add E2E Test Setup

```bash
# Generate E2E test app
pnpm nx g @nx/nest:app auth-e2e --directory=packages/auth-e2e
```

## Phase 6: CI/CD Enhancements (Day 5)

### Add MCP Validation Job

```yaml
# .github/workflows/mcp-validation.yml
name: MCP Validation

on:
  push:
    paths:
      - '.claude/**/*.json'
  pull_request:
    paths:
      - '.claude/**/*.json'

jobs:
  validate-mcp:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Validate MCP Schemas
        run: node scripts/validate-mcp-schema.js .claude/**/*.json
```

### Add Spec Validation Job

```yaml
# .github/workflows/spec-validation.yml
name: Spec Validation

on:
  push:
    paths:
      - '.claude/specs/**/*.md'
      - 'packages/**/*.ts'
  pull_request:

jobs:
  validate-specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Validate Specs
        run: pnpm spec:validate

      - name: Check Spec Coverage
        run: pnpm spec:coverage
```

## Testing Your MCP Setup

### Test 1: GitHub MCP

```bash
# In Claude Code, try:
# "List all open issues in this repository"
# "Create a new issue titled 'Test MCP Integration'"
```

### Test 2: PostgreSQL MCP

```bash
# In Claude Code, try:
# "Show the schema for the users table"
# "List all tables in the orion_dev database"
```

### Test 3: Custom Commands

```bash
# In Claude Code, try:
# /health-check
# /spec-sync
# /commit-and-push
```

## Troubleshooting

### MCP Not Connecting

```bash
# Check if MCP servers are installed
which mcp-server-github
which mcp-server-postgres

# Check if config file is valid
cat .claude/mcp/config.json | jq .

# Check environment variables
echo $GITHUB_TOKEN
echo $DATABASE_URL
```

### Slash Commands Not Working

```bash
# Verify commands directory exists
ls -la .claude/commands/

# Check command format
head -5 .claude/commands/health-check.md

# Restart Claude Code
```

### Pre-Commit Hooks Failing

```bash
# Run hooks manually
pnpm lint-staged

# Check husky installation
ls -la .husky/

# Reinstall hooks
pnpm prepare
```

## Next Steps

1. **Week 1**: Implement Phase 1-3 (MCPs, Commands, Hooks)
2. **Week 2**: Implement Phase 4-5 (Monitoring, Testing)
3. **Week 3**: Implement Phase 6 (CI/CD Enhancements)
4. **Week 4**: Document, measure, and optimize

## Success Criteria

- [ ] All critical MCPs installed and working
- [ ] 5+ custom slash commands created
- [ ] Enhanced pre-commit hooks running
- [ ] Monitoring integrated (Sentry, OpenTelemetry)
- [ ] Test utilities created and used
- [ ] CI/CD pipeline includes MCP/spec validation
- [ ] Documentation updated
- [ ] Team trained on new workflows

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://docs.nestjs.com)
