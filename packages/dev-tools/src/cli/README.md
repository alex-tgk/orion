# Spec Validator CLI Documentation

## Overview

The Spec Validator CLI is a comprehensive tool for validating, managing, and maintaining specification documents in the ORION platform. It ensures all specs follow GitHub Spec Kit standards and provides coverage reporting.

## Installation

### Global Installation

```bash
# Install globally using pnpm
pnpm install -g @orion/dev-tools

# Or link locally during development
cd packages/dev-tools
pnpm link --global
```

### Project Installation

The tool is already available in the ORION workspace:

```bash
# Build the CLI
pnpm nx build:cli dev-tools

# Run via npm scripts
pnpm spec:validate
pnpm spec:coverage
pnpm spec:generate <service-name>
```

## Commands

### 1. validate [file]

Validate specification files against GitHub Spec Kit standards.

**Usage:**
```bash
# Validate all specs
spec-validator validate

# Validate specific file
spec-validator validate .claude/specs/auth-service.md

# Output as JSON
spec-validator validate --format json

# Validate and auto-fix
spec-validator validate .claude/specs/auth-service.md --fix

# Preview fixes without making changes
spec-validator validate .claude/specs/auth-service.md --fix --dry-run
```

**Example Output (Table):**
```
Spec Validation Results

✓ .claude/specs/auth-service.md (Score: 100%)

✗ .claude/specs/user-service.md (Score: 60%)
  Errors:
    - Data Model: Missing required section: Data Model
    - Dependencies: Missing required section: Dependencies
  Warnings:
    - Metadata: Missing version information
    - Implementation: No implementation found for service: user

✓ .claude/specs/notification-service.md (Score: 100%)

○ .claude/specs/gateway-service.md (Score: 80%)
  Warnings:
    - Testing: Missing recommended section: Testing
    - Monitoring: Missing recommended section: Monitoring

Summary:
  Valid: 2/4
  Average Score: 85%
```

**Example Output (JSON):**
```json
[
  {
    "file": ".claude/specs/auth-service.md",
    "valid": true,
    "errors": [],
    "warnings": [],
    "score": 100
  },
  {
    "file": ".claude/specs/user-service.md",
    "valid": false,
    "errors": [
      {
        "section": "Data Model",
        "message": "Missing required section: Data Model",
        "severity": "error"
      },
      {
        "section": "Dependencies",
        "message": "Missing required section: Dependencies",
        "severity": "error"
      }
    ],
    "warnings": [
      {
        "section": "Metadata",
        "message": "Missing version information"
      },
      {
        "section": "Implementation",
        "message": "No implementation found for service: user"
      }
    ],
    "score": 60
  }
]
```

### 2. coverage

Generate comprehensive coverage reports showing spec completeness.

**Usage:**
```bash
# Generate table report
spec-validator coverage

# Generate HTML report
spec-validator coverage --format html --output coverage.html

# Generate Markdown report
spec-validator coverage --format markdown --output COVERAGE.md

# Generate JSON report
spec-validator coverage --format json --output coverage.json
```

**Example Output (Table):**
```
Spec Coverage Report

Total Specs: 8
Valid Specs: 5
Coverage: 62%

Missing Specs:
  - analytics
  - scheduler
  - search

Specs Without Implementation:
  - gateway

Spec Files:
✓ auth (100%)
✓ user (100%)
✓ notifications (100%)
✓ cache (100%)
✓ storage (100%)
○ gateway (80%)
    Missing: Testing, Monitoring
○ webhooks (60%)
    Missing: Data Model, Dependencies, Testing
○ orchestrator (40%)
    Missing: Service Details, Data Model, Dependencies, Testing
```

**Example Output (Markdown):**
````markdown
# Spec Coverage Report

**Generated:** 2025-01-18T14:30:00.000Z

## Summary

- **Total Specs:** 8
- **Valid Specs:** 5
- **Coverage:** 62%

## Spec Files

| Service | File | Completeness | Implementation | Missing Sections |
|---------|------|--------------|----------------|------------------|
| auth | .claude/specs/auth-service.md | 100% | ✓ | None |
| user | .claude/specs/user-service.md | 100% | ✓ | None |
| notifications | .claude/specs/notification-service.md | 100% | ✓ | None |
| cache | .claude/specs/cache-service.md | 100% | ✓ | None |
| storage | .claude/specs/storage-service.md | 100% | ✓ | None |
| gateway | .claude/specs/gateway-service.md | 80% | ✗ | Testing, Monitoring |
| webhooks | .claude/specs/webhooks-service.md | 60% | ✓ | Data Model, Dependencies, Testing |
| orchestrator | .claude/specs/orchestrator-service.md | 40% | ✓ | Service Details, Data Model, Dependencies, Testing |

## Missing Specs

- analytics
- scheduler
- search

## Specs Without Implementation

- gateway
````

### 3. generate <service>

Generate a new specification file from template.

**Usage:**
```bash
# Generate spec for analytics service
spec-validator generate analytics

# Generate spec for scheduler service
spec-validator generate scheduler
```

**Example Output:**
```
✓ Created spec: .claude/specs/analytics-service.md
```

**Generated File Structure:**
```markdown
# Analytics Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** [Team/Person]
**Dependencies:** [List dependencies]

---

## Overview

[TODO: Add comprehensive service overview]

## Service Details

- **Name:** `analytics-service`
- **Port:** `[port]`
- **Base URL:** `/api/v1/analytics`
- **Type:** [Stateless/Stateful]

## Architecture

[TODO: Add architecture diagram]

## API Contract

### Endpoints

```typescript
GET /api/v1/analytics/health
Response: {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
}
```

## Data Model

```prisma
// TODO: Add data models
```

## Dependencies

- [dependency-1]
- [dependency-2]

## Implementation Plan

### Phase 1: Setup (X hours)
1. Generate service with Nx
2. Set up dependencies

## Testing

### Unit Tests
- [test scenario 1]

## Monitoring

### Metrics
- [metric 1]

## Changelog

- **2025-01-18:** Initial specification created
```

### 4. sync <service>

Synchronize specification with actual implementation.

**Usage:**
```bash
# Sync auth service spec
spec-validator sync auth

# Sync user service spec
spec-validator sync user
```

**Example Output:**
```
✓ Synced spec with implementation: 5 endpoints, 3 models
  Endpoints discovered:
    - POST /auth/login
    - POST /auth/logout
    - POST /auth/refresh
    - GET /auth/me
    - GET /auth/health

  Models discovered:
    - User
    - RefreshToken
    - Session

  Updated sections:
    - API Contract
    - Data Model
    - Changelog
```

### 5. fix <file>

Auto-fix specification by adding missing sections.

**Usage:**
```bash
# Fix spec file
spec-validator fix .claude/specs/user-service.md

# Preview fixes without making changes
spec-validator fix .claude/specs/user-service.md --dry-run
```

**Example Output (Dry Run):**
```
Would add 3 section(s): Service Details, Data Model, Dependencies

Preview of changes:
  + ## Service Details
  +
  + - **Name:** `user-service`
  + - **Port:** `[port]`
  + - **Base URL:** `[base-url]`
  + - **Type:** [type]
  +
  + ## Data Model
  +
  + ```prisma
  + model Entity {
  +   id String @id @default(uuid())
  + }
  + ```
  +
  + ## Dependencies
  +
  + - dependency-1
  + - dependency-2
```

**Example Output (Actual Fix):**
```
✓ Fixed 3 section(s) in .claude/specs/user-service.md
  Added sections:
    - Service Details
    - Data Model
    - Dependencies

  Next steps:
    1. Fill in [TODO] placeholders
    2. Add actual endpoint definitions
    3. Define proper data models
    4. List actual dependencies
```

## Integration Examples

### NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "spec:validate": "spec-validator validate",
    "spec:validate:fix": "spec-validator validate --fix",
    "spec:coverage": "spec-validator coverage",
    "spec:coverage:html": "spec-validator coverage --format html --output spec-coverage.html",
    "spec:generate": "spec-validator generate",
    "spec:sync": "spec-validator sync",
    "spec:fix": "spec-validator fix"
  }
}
```

### Pre-commit Hook

`.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Validating specs..."

# Validate specs before commit
pnpm spec:validate || {
  echo "❌ Spec validation failed. Please fix the issues or run 'pnpm spec:validate:fix'"
  exit 1
}

echo "✅ Spec validation passed"
```

### GitHub Actions Workflow

`.github/workflows/spec-validation.yml`:

```yaml
name: Spec Validation

on:
  pull_request:
    paths:
      - '.claude/specs/**'
      - 'packages/**'
  push:
    branches:
      - main

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Build CLI
        run: pnpm nx build:cli dev-tools

      - name: Validate specs
        run: pnpm spec:validate

      - name: Generate coverage report
        run: pnpm spec:coverage --format html --output coverage.html

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: spec-coverage
          path: coverage.html

      - name: Check coverage threshold
        run: |
          COVERAGE=$(pnpm spec:coverage --format json | jq '.coveragePercentage')
          echo "Coverage: $COVERAGE%"
          if [ "$COVERAGE" -lt 80 ]; then
            echo "❌ Spec coverage is below 80%: $COVERAGE%"
            exit 1
          fi
          echo "✅ Spec coverage meets threshold: $COVERAGE%"

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage.json', 'utf8'));

            const comment = `## 📊 Spec Coverage Report

            - **Coverage:** ${coverage.coveragePercentage}%
            - **Valid Specs:** ${coverage.validSpecs}/${coverage.totalSpecs}
            - **Missing Specs:** ${coverage.missingSpecs.length}

            ${coverage.missingSpecs.length > 0 ? `### Missing Specs\n${coverage.missingSpecs.map(s => `- ${s}`).join('\n')}` : ''}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - all validations passed |
| 1 | Validation failed - errors found |
| 2 | CLI error - invalid arguments or command |
| 3 | File not found |
| 4 | Permission denied |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPECS_DIR` | Override specs directory | `.claude/specs` |
| `PACKAGES_DIR` | Override packages directory | `packages` |
| `COVERAGE_THRESHOLD` | Minimum coverage percentage | `80` |
| `AUTO_FIX` | Auto-fix issues on validation | `false` |

**Example:**
```bash
SPECS_DIR=docs/specs COVERAGE_THRESHOLD=90 spec-validator coverage
```

## Troubleshooting

### Error: "Spec file not found"

**Cause:** File path is incorrect or spec doesn't exist

**Solution:**
```bash
# Check if file exists
ls -la .claude/specs/

# Use absolute path
spec-validator validate $(pwd)/.claude/specs/auth-service.md

# Or run from workspace root
cd /path/to/orion
spec-validator validate
```

### Error: "No implementation found"

**Cause:** Package directory doesn't exist or isn't a NestJS service

**Solution:**
1. Check package exists: `ls packages/`
2. Verify it's a service: `cat packages/auth/package.json | grep @nestjs/core`
3. Create implementation or remove spec

### Error: "Coverage shows 0% but specs exist"

**Cause:** Specs might not be in correct directory

**Solution:**
```bash
# Check specs location
find . -name "*-service.md"

# Move specs to correct location
mv specs/*.md .claude/specs/

# Verify directory structure
tree .claude/specs/
```

### Warning: "Missing recommended section"

**Cause:** Optional sections are missing

**Solution:**
```bash
# Auto-fix to add missing sections
spec-validator fix .claude/specs/auth-service.md

# Or add manually
vim .claude/specs/auth-service.md
```

## Best Practices

### 1. Validate Before Committing

Always run validation before committing specs:

```bash
pnpm spec:validate && git commit -m "docs: update auth service spec"
```

### 2. Keep Specs Synced

Regularly sync specs with implementation:

```bash
# After making code changes
pnpm spec:sync auth
git add .claude/specs/auth-service.md
git commit -m "docs: sync auth spec with implementation"
```

### 3. Monitor Coverage

Track coverage over time:

```bash
# Generate weekly report
pnpm spec:coverage:html
open spec-coverage.html

# Set coverage goals
# Target: 100% coverage for all services
```

### 4. Use Templates

Always generate new specs from templates:

```bash
# Don't create manually
# ❌ touch .claude/specs/new-service.md

# Do generate from template
# ✅ pnpm spec:generate new-service
```

### 5. Review Auto-fixes

Always review auto-generated content:

```bash
# Preview first
spec-validator fix .claude/specs/service.md --dry-run

# Then apply
spec-validator fix .claude/specs/service.md

# Review changes
git diff .claude/specs/service.md
```

## Advanced Usage

### Custom Validation Rules

Create `.specvalidatorrc.json`:

```json
{
  "specsDir": ".claude/specs",
  "packagesDir": "packages",
  "excludePackages": ["shared", "dev-tools", "mcp-server"],
  "requiredSections": [
    "Overview",
    "Service Details",
    "API Contract",
    "Data Model",
    "Dependencies"
  ],
  "recommendedSections": [
    "Implementation Plan",
    "Testing",
    "Monitoring",
    "Performance Targets",
    "Security"
  ],
  "coverageThreshold": 80,
  "autoFix": false,
  "apiEndpointPattern": "```typescript\\n(GET|POST|PUT|PATCH|DELETE)\\s+\\/[^\\n]+",
  "dataModelPattern": "```(prisma|typescript)\\nmodel\\s+\\w+"
}
```

### Batch Operations

Validate and fix multiple specs:

```bash
# Fix all incomplete specs
for spec in .claude/specs/*.md; do
  spec-validator validate "$spec" || spec-validator fix "$spec"
done

# Sync all services
for service in auth user notifications gateway; do
  spec-validator sync "$service"
done
```

### Continuous Monitoring

Set up automated coverage reports:

```bash
# Daily coverage report (cron job)
0 9 * * * cd /path/to/orion && pnpm spec:coverage:html && \
  curl -X POST https://slack.webhook.url \
  -d '{"text": "Daily spec coverage: $(cat coverage.json | jq .coveragePercentage)%"}'
```

## Contributing

To add new validation rules:

1. Edit `packages/dev-tools/src/cli/spec-validator.ts`
2. Add new section to `REQUIRED_SECTIONS` array
3. Update tests in `spec-validator.spec.ts`
4. Update this documentation

## Support

For issues or questions:
- Create issue in ORION repository
- Tag with `spec-validator` label
- Include command output and spec file (if applicable)
