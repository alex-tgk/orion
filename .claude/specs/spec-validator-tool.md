# Spec Validator Tool Specification

**Version:** 1.0.0
**Status:** Production
**Owner:** Dev Tools Team
**Dependencies:** None (standalone CLI tool)

---

## Overview

The Spec Validator Tool is a comprehensive CLI utility that validates specification documents against GitHub Spec Kit standards, generates coverage reports, and provides auto-fix capabilities. It ensures consistency and completeness across all service specifications in the ORION platform.

## Purpose

- **Validate** spec files against required standards
- **Track** spec coverage across the entire platform
- **Identify** missing or orphaned specifications
- **Auto-fix** incomplete spec files
- **Sync** specs with actual implementations
- **Generate** new specs from templates

## Service Details

- **Name:** `spec-validator`
- **Type:** CLI Tool
- **Binary:** `spec-validator`
- **Language:** TypeScript
- **Framework:** Commander.js
- **Output Formats:** JSON, HTML, Markdown, Table

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Spec Validator CLI                  │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼───┐      ┌───▼───┐      ┌───▼────┐
    │Validate│      │Coverage│      │Generate│
    │Engine │      │Reporter│      │Engine  │
    └───┬───┘      └───┬───┘      └───┬────┘
        │              │               │
        └──────────────┼───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    ┌───▼────┐                   ┌───▼────┐
    │  Spec  │                   │  Code  │
    │  Files │                   │ Parser │
    └────────┘                   └────────┘
```

---

## CLI Commands

### 1. validate [file]

Validate one or all specification files.

**Usage:**
```bash
spec-validator validate [file] [options]
```

**Options:**
- `-f, --format <type>` - Output format: table (default), json
- `--fix` - Auto-fix issues
- `--dry-run` - Show what would be fixed without changing files

**Examples:**
```bash
# Validate all specs
spec-validator validate

# Validate single spec
spec-validator validate .claude/specs/auth-service.md

# Validate and output JSON
spec-validator validate --format json

# Auto-fix issues
spec-validator validate .claude/specs/auth-service.md --fix

# Dry run to preview fixes
spec-validator validate .claude/specs/auth-service.md --fix --dry-run
```

**Output (Table Format):**
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

Summary:
  Valid: 1/2
  Average Score: 80%
```

**Output (JSON Format):**
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
      }
    ],
    "warnings": [
      {
        "section": "Metadata",
        "message": "Missing version information"
      }
    ],
    "score": 60
  }
]
```

---

### 2. coverage

Generate comprehensive coverage report.

**Usage:**
```bash
spec-validator coverage [options]
```

**Options:**
- `-f, --format <type>` - Output format: table (default), json, html, markdown
- `-o, --output <file>` - Output file path

**Examples:**
```bash
# Generate coverage report
spec-validator coverage

# Generate HTML report
spec-validator coverage --format html --output coverage-report.html

# Generate Markdown report
spec-validator coverage --format markdown --output COVERAGE.md

# Generate JSON report
spec-validator coverage --format json --output coverage.json
```

**Output (Table Format):**
```
Spec Coverage Report

Total Specs: 5
Valid Specs: 3
Coverage: 60%

Missing Specs:
  - analytics
  - scheduler

Specs Without Implementation:
  - gateway

Spec Files:
✓ auth (100%)
✓ user (100%)
✓ notifications (100%)
○ gateway (80%)
    Missing: Testing, Monitoring
○ cache (60%)
    Missing: Data Model, Dependencies, Testing
```

**Output (HTML Report):**

Generates a styled HTML page with:
- Summary statistics (total specs, valid specs, coverage percentage)
- Interactive table of all spec files with completeness scores
- List of missing specs
- List of orphaned implementations
- Color-coded status indicators

**Output (Markdown Report):**
```markdown
# Spec Coverage Report

**Generated:** 2025-01-18T14:30:00Z

## Summary

- **Total Specs:** 5
- **Valid Specs:** 3
- **Coverage:** 60%

## Spec Files

| Service | File | Completeness | Implementation | Missing Sections |
|---------|------|--------------|----------------|------------------|
| auth | .claude/specs/auth-service.md | 100% | ✓ | None |
| user | .claude/specs/user-service.md | 100% | ✓ | None |
| notifications | .claude/specs/notification-service.md | 100% | ✓ | None |
| gateway | .claude/specs/gateway-service.md | 80% | ✗ | Testing, Monitoring |
| cache | .claude/specs/cache-service.md | 60% | ✓ | Data Model, Dependencies, Testing |

## Missing Specs

- analytics
- scheduler

## Specs Without Implementation

- gateway
```

---

### 3. generate <service>

Generate new spec file from template.

**Usage:**
```bash
spec-validator generate <service>
```

**Examples:**
```bash
# Generate spec for analytics service
spec-validator generate analytics

# Generate spec for scheduler service
spec-validator generate scheduler
```

**Output:**
```
✓ Created spec: .claude/specs/analytics-service.md
```

**Generated Spec Template:**
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

```
[TODO: Add architecture diagram]
```

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

### Phase 2: Core Features (X hours)
1. Implement core functionality

## Testing

### Unit Tests
- [test scenario 1]

### Integration Tests
- [test scenario 1]

## Monitoring

### Metrics
- [metric 1]

### Alerts
- [alert 1]

## Performance Targets

- Response Time: < Xms (P95)
- Throughput: X req/sec
- Availability: 99.9%

## Security

[TODO: Add security considerations]

## Deployment

[TODO: Add deployment configuration]

## Changelog

- **2025-01-18:** Initial specification created
```

---

### 4. sync <service>

Sync spec with actual implementation.

**Usage:**
```bash
spec-validator sync <service>
```

**Examples:**
```bash
# Sync auth service spec with implementation
spec-validator sync auth

# Sync user service spec with implementation
spec-validator sync user
```

**Output:**
```
✓ Synced spec with implementation: 5 endpoints, 3 models
```

**What it does:**
1. Extracts actual endpoints from controller files
2. Extracts data models from Prisma schema
3. Updates spec file with discovered information
4. Adds changelog entry for sync operation
5. Validates endpoint format matches specification
6. Identifies discrepancies between spec and code

---

### 5. fix <file>

Auto-fix spec file by adding missing sections.

**Usage:**
```bash
spec-validator fix <file> [options]
```

**Options:**
- `--dry-run` - Preview fixes without making changes

**Examples:**
```bash
# Fix spec file
spec-validator fix .claude/specs/auth-service.md

# Preview fixes
spec-validator fix .claude/specs/auth-service.md --dry-run
```

**Output (Dry Run):**
```
Would add 3 section(s): Service Details, Data Model, Dependencies
```

**Output (Actual Fix):**
```
✓ Fixed 3 section(s) in .claude/specs/auth-service.md
```

---

## Validation Rules

### Required Sections

All specs must include:

1. **Overview** - Service purpose and description
2. **Service Details** - Name, port, base URL, type
3. **API Contract** - Endpoint definitions with TypeScript examples
4. **Data Model** - Prisma or TypeScript data models
5. **Dependencies** - External and internal dependencies

### Recommended Sections

1. **Implementation Plan** - Phased implementation steps
2. **Testing** - Unit, integration, and e2e test strategies
3. **Monitoring** - Metrics, alerts, and observability
4. **Performance Targets** - SLAs and performance requirements
5. **Security** - Security considerations and requirements

### Metadata Requirements

All specs must include at the top:
- **Version:** Semantic version (e.g., 1.0.0)
- **Status:** Draft | In Progress | Complete | Deprecated
- **Owner:** Team or person responsible
- **Dependencies:** List of dependent services

### API Endpoint Format

```typescript
<METHOD> <PATH>
Request: {
  // Request type definition
}
Response: {
  // Response type definition
}
```

**Valid Methods:** GET, POST, PUT, PATCH, DELETE

**Example:**
```typescript
POST /auth/login
Request: {
  email: string;
  password: string;
}
Response: {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
```

### Data Model Format

**Prisma:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
}
```

**TypeScript:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

---

## Implementation Verification

### Service Detection

The validator checks for service implementations in `packages/` directory:

1. **Package exists** - Directory exists in packages/
2. **Has package.json** - Valid Node.js package
3. **Is NestJS service** - Has `@nestjs/core` dependency
4. **Not utility package** - Excludes: shared, dev-tools, mcp-server

### Code Parsing

Extracts information from:

1. **Controllers** - Endpoint definitions
   - `@Controller()` decorator for base path
   - `@Get()`, `@Post()`, etc. for routes

2. **Prisma Schema** - Data models
   - `model` definitions
   - Field types and relations

3. **Package.json** - Dependencies
   - Runtime dependencies
   - Peer dependencies

---

## Scoring System

### Completeness Score

Calculated as:
```
Score = (Completed Sections / Total Required Sections) × 100
```

**Required Sections (5):**
- Overview
- Service Details
- API Contract
- Data Model
- Dependencies

**Additional Checks (3):**
- Has version metadata
- Has status metadata
- Has owner metadata

**Total Score:** Based on 8 total checks

### Coverage Percentage

Calculated as:
```
Coverage = (Valid Specs / (Total Specs + Missing Specs)) × 100
```

**Valid Spec:** Has all required sections and 100% completeness score

---

## Integration

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "spec:validate": "spec-validator validate",
    "spec:coverage": "spec-validator coverage",
    "spec:generate": "spec-validator generate",
    "spec:sync": "spec-validator sync",
    "spec:fix": "spec-validator fix",
    "spec:report": "spec-validator coverage --format html --output spec-coverage.html"
  }
}
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate specs before commit
pnpm spec:validate || {
  echo "❌ Spec validation failed. Please fix the issues before committing."
  exit 1
}
```

### CI/CD Pipeline

**GitHub Actions:**

```yaml
name: Spec Validation

on:
  pull_request:
    paths:
      - '.claude/specs/**'
      - 'packages/**'

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
        run: pnpm install

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
          if [ "$COVERAGE" -lt 80 ]; then
            echo "❌ Spec coverage is below 80%: $COVERAGE%"
            exit 1
          fi
```

---

## Configuration

### .specvalidatorrc.json

Optional configuration file:

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
  "autoFix": false
}
```

---

## Error Codes

| Code | Message | Severity | Description |
|------|---------|----------|-------------|
| SPEC001 | Missing required section | Error | Required section not found |
| SPEC002 | Invalid API endpoint format | Warning | Endpoint format doesn't match pattern |
| SPEC003 | Invalid data model format | Warning | Model format doesn't match pattern |
| SPEC004 | Missing metadata | Warning | Version, status, or owner missing |
| SPEC005 | No implementation found | Warning | Service package doesn't exist |
| SPEC006 | Spec file not found | Error | Spec file doesn't exist |
| SPEC007 | Invalid spec format | Error | Spec file is not valid Markdown |

---

## Performance

### Benchmarks

- **Single file validation:** < 100ms
- **All files validation (10 specs):** < 500ms
- **Coverage report generation:** < 1s
- **Auto-fix operation:** < 200ms per file

### Resource Usage

- **Memory:** < 50MB
- **CPU:** Single-threaded, minimal usage
- **Disk I/O:** Read-only except for fix/generate commands

---

## Testing

### Unit Tests

```typescript
describe('SpecValidator', () => {
  it('should validate complete spec file', () => {
    const result = validator.validateFile('auth-service.md');
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
  });

  it('should detect missing sections', () => {
    const result = validator.validateFile('incomplete-spec.md');
    expect(result.errors).toContainEqual({
      section: 'Data Model',
      message: 'Missing required section: Data Model',
      severity: 'error'
    });
  });

  it('should calculate coverage correctly', () => {
    const report = validator.coverage();
    expect(report.coveragePercentage).toBeGreaterThanOrEqual(0);
    expect(report.coveragePercentage).toBeLessThanOrEqual(100);
  });
});
```

### Integration Tests

```bash
# Test validation
pnpm spec:validate .claude/specs/auth-service.md

# Test coverage
pnpm spec:coverage

# Test generation
pnpm spec:generate test-service
rm -f .claude/specs/test-service.md

# Test auto-fix
pnpm spec:fix .claude/specs/incomplete-service.md --dry-run
```

---

## Future Enhancements

### Planned Features

1. **OpenAPI Integration**
   - Auto-generate OpenAPI specs from markdown
   - Validate API contract against OpenAPI schema
   - Sync OpenAPI changes back to spec

2. **Interactive Mode**
   - Guided spec creation with prompts
   - Real-time validation as you type
   - Suggestions for missing content

3. **Dependency Graph**
   - Visualize service dependencies
   - Detect circular dependencies
   - Identify missing dependency specs

4. **Version Control Integration**
   - Track spec changes over time
   - Compare specs between versions
   - Generate changelog from spec diffs

5. **AI-Powered Suggestions**
   - Auto-complete missing sections
   - Suggest improvements based on patterns
   - Identify inconsistencies across specs

---

## Troubleshooting

### Common Issues

**Issue:** Validation fails with "Spec file not found"

**Solution:**
- Ensure you're running from workspace root
- Check file path is correct
- Verify .claude/specs directory exists

---

**Issue:** Coverage shows 0% but specs exist

**Solution:**
- Check specs are in correct directory (.claude/specs)
- Verify spec files end with .md extension
- Run with --verbose flag for details

---

**Issue:** Implementation not detected

**Solution:**
- Ensure package exists in packages/ directory
- Verify package.json has @nestjs/core dependency
- Check package name matches spec file name

---

**Issue:** Auto-fix doesn't work

**Solution:**
- Check file permissions (must be writable)
- Remove --dry-run flag if present
- Verify you have write access to spec directory

---

## References

- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Markdown Specification](https://spec.commonmark.org/)
- [Semantic Versioning](https://semver.org/)

---

## Changelog

- **2025-01-18:** Initial specification created
- **2025-01-18:** Added comprehensive validation rules
- **2025-01-18:** Added coverage reporting
- **2025-01-18:** Added auto-fix capabilities
- **2025-01-18:** Added sync functionality
