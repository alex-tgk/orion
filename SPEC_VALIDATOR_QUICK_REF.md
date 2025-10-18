# Spec Validator - Quick Reference

## Installation

```bash
# Build CLI
pnpm nx build:cli dev-tools

# Verify
pnpm spec:validate --help
```

## Common Commands

```bash
# Validate all specs
pnpm spec:validate

# Validate and auto-fix
pnpm spec:validate:fix

# Generate coverage report (HTML)
pnpm spec:coverage:html
open spec-coverage.html

# Generate new spec
pnpm spec:generate <service-name>

# Auto-fix spec
pnpm spec:fix .claude/specs/<service>.md

# Sync with implementation
pnpm spec:sync <service-name>
```

## Required Sections

1. Overview
2. Service Details (name, port, URL, type)
3. API Contract (endpoints)
4. Data Model (Prisma/TypeScript)
5. Dependencies

## Required Metadata

```markdown
**Version:** 1.0.0
**Status:** Draft | In Progress | Complete
**Owner:** Team/Person
**Dependencies:** List
```

## Scoring

- **100%** = All required sections + metadata
- **80%+** = Missing 1-2 optional sections
- **60%+** = Missing required sections
- **< 60%** = Incomplete spec

## Exit Codes

- `0` = Success
- `1` = Validation failed
- `2` = CLI error

## Quick Fixes

```bash
# Preview fixes
pnpm spec:fix .claude/specs/service.md --dry-run

# Apply fixes
pnpm spec:fix .claude/specs/service.md

# Review
git diff .claude/specs/service.md
```

## Pre-commit Hook

Automatically validates specs on commit.

Skip with: `git commit --no-verify`

## CI/CD

- Runs on PR/push
- Comments on PRs
- Checks 80% threshold
- Uploads HTML reports

## Files

| File | Purpose |
|------|---------|
| `.claude/specs/*.md` | Spec files |
| `spec-coverage.html` | Coverage report |
| `.specvalidatorrc.json` | Configuration |
| `.husky/pre-commit` | Git hook |

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `spec:validate` | Validate all |
| `spec:validate:fix` | Validate + fix |
| `spec:coverage` | Table report |
| `spec:coverage:html` | HTML report |
| `spec:coverage:json` | JSON report |
| `spec:coverage:md` | Markdown report |
| `spec:generate` | New spec |
| `spec:sync` | Sync with code |
| `spec:fix` | Auto-fix |

## Example Output

```
Spec Validation Results

✓ auth-service.md (100%)
✗ user-service.md (60%)
  Errors:
    - Missing: Data Model
    - Missing: Dependencies

Summary:
  Valid: 1/2
  Average: 80%
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Spec not found | Check path: `ls .claude/specs/` |
| No implementation | Verify: `ls packages/` |
| Permission denied | Fix: `chmod +w .claude/specs/*.md` |
| Coverage 0% | Check: `tree .claude/specs/` |

## Documentation

- Main: `SPEC_VALIDATOR_CLI.md`
- CLI: `packages/dev-tools/src/cli/README.md`
- Spec: `.claude/specs/spec-validator-tool.md`

## Support

Create issue with:
- Command output
- Spec file (if applicable)
- Tag: `spec-validator`
