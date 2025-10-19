# Spec Validator CLI Tool - Complete Documentation

## Overview

A comprehensive CLI tool for validating, managing, and maintaining specification documents following GitHub Spec Kit standards. Built for the ORION microservices platform.

## Installation & Setup

### 1. Build the CLI

```bash
# Install dependencies
pnpm install

# Build the CLI tool
pnpm nx build:cli dev-tools
```

### 2. Verify Installation

```bash
# Test the CLI
pnpm spec:validate --help
pnpm spec:coverage
```

### 3. Setup Pre-commit Hook

The pre-commit hook is already configured in `.husky/pre-commit` and will automatically:
- Detect spec file changes
- Run validation before commit
- Provide helpful error messages
- Suggest auto-fix options

### 4. Configure CI/CD

GitHub Actions workflow is configured in `.github/workflows/spec-validation.yml` and will:
- Validate specs on pull requests
- Generate coverage reports
- Comment on PRs with validation results
- Upload artifacts for review

## Quick Start

### Validate All Specs

```bash
pnpm spec:validate
```

**Example Output:**
```
Spec Validation Results

✓ .claude/specs/auth-service.md (Score: 100%)

✗ .claude/specs/user-service.md (Score: 60%)
  Errors:
    - Data Model: Missing required section: Data Model
    - Dependencies: Missing required section: Dependencies

Summary:
  Valid: 1/2
  Average Score: 80%
```

### Generate Coverage Report

```bash
# Table format (default)
pnpm spec:coverage

# HTML report
pnpm spec:coverage:html
open spec-coverage.html

# Markdown report
pnpm spec:coverage:md

# JSON report
pnpm spec:coverage:json
```

### Generate New Spec

```bash
pnpm spec:generate analytics
```

Creates: `.claude/specs/analytics-service.md` with complete template

### Auto-fix Incomplete Specs

```bash
# Preview fixes
pnpm spec:fix .claude/specs/user-service.md --dry-run

# Apply fixes
pnpm spec:fix .claude/specs/user-service.md
```

### Sync Spec with Implementation

```bash
pnpm spec:sync auth
```

Extracts endpoints and models from code and updates spec.

## Features

### ✅ Validation

- **Required Sections**: Overview, Service Details, API Contract, Data Model, Dependencies
- **Recommended Sections**: Implementation Plan, Testing, Monitoring, Performance Targets, Security
- **Metadata Validation**: Version, Status, Owner
- **Format Validation**: API endpoints, Data models
- **Implementation Verification**: Checks if service exists

### 📊 Coverage Reporting

- **Total Coverage**: Percentage of valid specs
- **Missing Specs**: Services without specs
- **Orphaned Specs**: Specs without implementation
- **Completeness Score**: Per-spec scoring (0-100%)
- **Multiple Formats**: Table, JSON, HTML, Markdown

### 🔧 Auto-fix

- **Add Missing Sections**: Automatically adds required sections
- **Template Generation**: Pre-filled with service-specific content
- **Dry Run Mode**: Preview changes before applying
- **Preserves Content**: Only adds missing sections

### 🔄 Sync

- **Extract Endpoints**: From NestJS controllers
- **Extract Models**: From Prisma schemas
- **Update Changelog**: Automatic changelog entries
- **Detect Discrepancies**: Compare spec vs implementation

### 🎨 Multiple Output Formats

- **Table**: Human-readable console output
- **JSON**: Machine-readable for CI/CD
- **HTML**: Beautiful web-based reports
- **Markdown**: Documentation-friendly format

## Commands Reference

### validate [file]

Validate specification files.

**Options:**
- `-f, --format <type>` - Output format (table, json)
- `--fix` - Auto-fix issues
- `--dry-run` - Preview fixes without applying

**Examples:**
```bash
# Validate all specs
pnpm spec:validate

# Validate single file
pnpm spec:validate .claude/specs/auth-service.md

# Validate with JSON output
pnpm spec:validate --format json

# Validate and fix
pnpm spec:validate:fix
```

### coverage

Generate coverage reports.

**Options:**
- `-f, --format <type>` - Output format (table, json, html, markdown)
- `-o, --output <file>` - Output file path

**Examples:**
```bash
# Table format
pnpm spec:coverage

# HTML report
pnpm spec:coverage:html

# Markdown report
pnpm spec:coverage:md

# JSON report
pnpm spec:coverage:json
```

### generate <service>

Generate new spec from template.

**Examples:**
```bash
pnpm spec:generate analytics
pnpm spec:generate scheduler
```

### sync <service>

Sync spec with implementation.

**Examples:**
```bash
pnpm spec:sync auth
pnpm spec:sync user
```

### fix <file>

Auto-fix spec file.

**Options:**
- `--dry-run` - Preview fixes

**Examples:**
```bash
# Preview fixes
pnpm spec:fix .claude/specs/auth-service.md --dry-run

# Apply fixes
pnpm spec:fix .claude/specs/auth-service.md
```

## Validation Rules

### Required Sections (5)

1. **Overview** - Service purpose and description
2. **Service Details** - Name, port, base URL, type
3. **API Contract** - Endpoint definitions
4. **Data Model** - Prisma/TypeScript models
5. **Dependencies** - Service dependencies

### Recommended Sections (5)

1. **Implementation Plan** - Phased implementation
2. **Testing** - Test strategies
3. **Monitoring** - Metrics and alerts
4. **Performance Targets** - SLAs
5. **Security** - Security considerations

### Metadata Requirements

All specs must include:
- **Version:** Semantic version (e.g., 1.0.0)
- **Status:** Draft | In Progress | Complete | Deprecated
- **Owner:** Team or person responsible
- **Dependencies:** Dependent services

### API Endpoint Format

```typescript
<METHOD> <PATH>
Request: { /* type */ }
Response: { /* type */ }
```

Valid methods: GET, POST, PUT, PATCH, DELETE

### Data Model Format

**Prisma:**
```prisma
model User {
  id String @id @default(uuid())
  email String @unique
}
```

**TypeScript:**
```typescript
interface User {
  id: string;
  email: string;
}
```

## Scoring System

### Completeness Score

```
Score = (Completed Sections / Total Checks) × 100
```

**Total Checks:** 8
- 5 required sections
- 3 metadata fields

### Coverage Percentage

```
Coverage = (Valid Specs / (Total Specs + Missing Specs)) × 100
```

**Valid Spec:** Has all required sections (100% score)

## Integration

### Pre-commit Hook

Located: `.husky/pre-commit`

Automatically runs when committing spec files:
1. Detects spec file changes
2. Validates specs
3. Blocks commit if validation fails
4. Provides fix suggestions

**Skip Hook:**
```bash
git commit --no-verify
```

### GitHub Actions

Located: `.github/workflows/spec-validation.yml`

Runs on:
- Pull requests (spec or package changes)
- Pushes to main branch

Workflow:
1. Build CLI
2. Validate all specs
3. Generate coverage reports
4. Upload artifacts
5. Comment on PR with results
6. Check coverage threshold (80%)

### NPM Scripts

All available scripts:

```json
{
  "spec:validate": "Validate all specs",
  "spec:validate:fix": "Validate and auto-fix",
  "spec:coverage": "Coverage table",
  "spec:coverage:html": "HTML report",
  "spec:coverage:json": "JSON report",
  "spec:coverage:md": "Markdown report",
  "spec:generate": "Generate new spec",
  "spec:sync": "Sync with implementation",
  "spec:fix": "Auto-fix spec"
}
```

## Configuration

### Default Configuration

The tool works out-of-the-box with sensible defaults:

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
  "coverageThreshold": 80
}
```

### Custom Configuration

Create `.specvalidatorrc.json` in project root:

```json
{
  "specsDir": "docs/specs",
  "packagesDir": "services",
  "coverageThreshold": 90,
  "autoFix": true,
  "verbose": true
}
```

See `.specvalidatorrc.example.json` for all options.

## File Structure

```
orion/
├── .claude/
│   └── specs/
│       ├── auth-service.md
│       ├── user-service.md
│       ├── notification-service.md
│       ├── gateway-service.md
│       └── spec-validator-tool.md
├── .github/
│   └── workflows/
│       └── spec-validation.yml
├── .husky/
│   └── pre-commit
├── packages/
│   └── dev-tools/
│       ├── src/
│       │   └── cli/
│       │       ├── spec-validator.ts
│       │       ├── spec-validator.spec.ts
│       │       └── README.md
│       ├── package.json
│       ├── project.json
│       └── tsconfig.cli.json
├── .specvalidatorrc.example.json
├── package.json
└── SPEC_VALIDATOR_CLI.md
```

## Example Outputs

### Validation (Table)

```
Spec Validation Results

✓ .claude/specs/auth-service.md (Score: 100%)

✗ .claude/specs/user-service.md (Score: 60%)
  Errors:
    - Data Model: Missing required section: Data Model
    - Dependencies: Missing required section: Dependencies
  Warnings:
    - Metadata: Missing version information

Summary:
  Valid: 1/2
  Average Score: 80%
```

### Coverage (Table)

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

### Coverage (HTML)

Beautiful HTML report with:
- Summary cards (Total Specs, Valid Specs, Coverage %)
- Interactive table with color-coded status
- Missing specs section
- Orphaned implementations section
- Responsive design

### GitHub Actions Comment

```markdown
## 📊 Spec Validation Report

### Summary
- **Coverage:** 60%
- **Valid Specs:** 3/5
- **Average Score:** 80%

### Spec Files

| File | Status | Score | Issues |
|------|--------|-------|--------|
| auth-service.md | ✅ | 100% | 0 |
| user-service.md | ❌ | 60% | 3 |
| notification-service.md | ✅ | 100% | 0 |
| gateway-service.md | ⚠️ | 80% | 2 |
| cache-service.md | ❌ | 60% | 3 |

### ⚠️ Missing Specs

- `analytics`
- `scheduler`

### ❌ Validation Errors

**user-service.md**

- **Data Model:** Missing required section: Data Model
- **Dependencies:** Missing required section: Dependencies

Warnings:
- Metadata: Missing version information
```

## Troubleshooting

### Common Issues

**Issue:** "Spec file not found"
```bash
# Solution: Check file path
ls .claude/specs/
```

**Issue:** "No implementation found"
```bash
# Solution: Verify package exists
ls packages/
cat packages/auth/package.json | grep @nestjs/core
```

**Issue:** "Coverage shows 0%"
```bash
# Solution: Verify directory structure
tree .claude/specs/
```

**Issue:** "Auto-fix doesn't work"
```bash
# Solution: Check permissions
chmod +w .claude/specs/*.md
```

## Best Practices

### 1. Validate Before Committing

```bash
pnpm spec:validate && git commit -m "docs: update spec"
```

### 2. Maintain 100% Coverage

```bash
# Generate missing specs
pnpm spec:generate analytics

# Fix incomplete specs
pnpm spec:fix .claude/specs/gateway-service.md
```

### 3. Sync Regularly

```bash
# After code changes
pnpm spec:sync auth
git add .claude/specs/auth-service.md
git commit -m "docs: sync auth spec"
```

### 4. Use Templates

```bash
# Always generate from template
pnpm spec:generate new-service

# Don't create manually
# ❌ touch .claude/specs/new-service.md
```

### 5. Review Auto-fixes

```bash
# Preview first
pnpm spec:fix .claude/specs/service.md --dry-run

# Then apply
pnpm spec:fix .claude/specs/service.md

# Review changes
git diff .claude/specs/service.md
```

## Advanced Usage

### Batch Validation

```bash
# Validate and fix all specs
for spec in .claude/specs/*.md; do
  pnpm spec:validate "$spec" || pnpm spec:fix "$spec"
done
```

### Continuous Monitoring

```bash
# Weekly coverage report (cron)
0 9 * * 1 cd /path/to/orion && pnpm spec:coverage:html
```

### Custom Validation Rules

Edit `packages/dev-tools/src/cli/spec-validator.ts`:

```typescript
const REQUIRED_SECTIONS: SpecSection[] = [
  { name: 'Overview', required: true, pattern: /^##\s+Overview/m },
  { name: 'Your Custom Section', required: true, pattern: /^##\s+Custom/m },
  // ...
];
```

## Testing

### Run Tests

```bash
# Run unit tests
pnpm nx test dev-tools

# Run specific test file
pnpm nx test dev-tools --testFile=spec-validator.spec.ts

# Run with coverage
pnpm nx test dev-tools --coverage
```

### Test Coverage

Target: 80% code coverage

Covered:
- Section validation
- Coverage calculation
- Auto-fix functionality
- Sync operations
- Report generation

## Performance

### Benchmarks

- Single file validation: < 100ms
- All files (10 specs): < 500ms
- Coverage report: < 1s
- Auto-fix: < 200ms per file

### Resource Usage

- Memory: < 50MB
- CPU: Single-threaded
- Disk I/O: Read-only (except fix/generate)

## Contributing

### Adding Validation Rules

1. Edit `spec-validator.ts`
2. Add to `REQUIRED_SECTIONS` or create new validation
3. Update tests
4. Update documentation

### Adding Output Formats

1. Implement format function (e.g., `generatePDFReport()`)
2. Add to format options
3. Add tests
4. Update documentation

## Support

For issues or questions:
- Create issue in ORION repository
- Tag with `spec-validator` label
- Include command output and spec file

## License

MIT - See LICENSE file

---

**Built with ❤️ for the ORION platform**
