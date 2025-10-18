# Pre-commit Hooks Documentation

This directory contains the enhanced pre-commit hook scripts for the ORION project, implementing recommendations from the tooling-and-mcp-analysis.md report (Section 8.2).

## Overview

The pre-commit hooks are designed to be:
- **Fast**: Only run on changed files
- **Non-blocking**: Minor issues warn but don't fail commits
- **Clear**: Provide actionable feedback when something fails

## Hook Scripts

### 1. test-related.sh
**Purpose**: Run tests for files affected by the commit

**Triggered by**: Any `.ts` or `.tsx` file changes

**What it does**:
- Uses `jest --findRelatedTests` to run only tests related to changed files
- Passes with no tests if no test files exist
- Fails fast on first test failure for quick feedback
- Only runs on staged files (fast)

**Exit codes**:
- `0`: All tests passed or no tests to run
- `1`: Tests failed

**Example output**:
```
Running tests for related files...
✅ All related tests passed!
```

### 2. validate-spec.sh
**Purpose**: Validate GitHub Spec Kit compliance for changed files

**Triggered by**: Changes to `*.service.ts`, `*.controller.ts`, or `*.gateway.ts` files

**What it does**:
- Checks if corresponding spec files exist in `.claude/specs/`
- Warns if specs are missing but doesn't block commit
- Non-blocking - provides informational feedback

**Exit codes**:
- `0`: Always succeeds (non-blocking)

**Example output**:
```
Validating GitHub Spec Kit compliance...
⚠️  Warning: Missing specs for services:
   - notifications (expected: .claude/specs/notifications-service.md)

Consider running: pnpm spec:generate
Continuing anyway (non-blocking)...
```

### 3. validate-mcp-schema.sh
**Purpose**: Validate MCP configuration JSON files

**Triggered by**: Changes to any `.json` file in `.claude/` directory

**What it does**:
- Validates JSON syntax
- Checks MCP config structure (requires `mcpServers` key)
- Validates each MCP server has required fields
- Ensures arrays are properly formatted
- Blocking - must pass to commit

**Exit codes**:
- `0`: All MCP configs valid
- `1`: Validation failed

**Example output**:
```
Validating MCP configuration files...
✅ .claude/mcp/config.json is valid
✅ All MCP configurations valid!
```

### 4. generate-docs-partial.sh
**Purpose**: Generate/update documentation for changed service/controller files

**Triggered by**: Changes to `*.service.ts` or `*.controller.ts` files

**What it does**:
- Extracts JSDoc comments from changed files
- Checks if README exists for the service
- Provides informational message about documentation
- Non-blocking - warns but doesn't fail

**Exit codes**:
- `0`: Always succeeds (non-blocking)

**Example output**:
```
Generating documentation for changed files...
Updating docs for auth/auth.service...
   Found JSDoc comments - docs may need updating

ℹ️  Documentation may need updating for changed files
   Consider running: pnpm docs:generate
   Continuing anyway (non-blocking)...
```

## Lint-Staged Configuration

The hooks are integrated via `lint-staged` in `.lintstagedrc.json`:

```json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "bash -c 'pnpm run test:related'"
  ],
  "packages/*/src/**/*.{service,controller}.ts": [
    "bash -c 'pnpm run docs:generate-partial'"
  ],
  "packages/**/*.ts": [
    "bash -c 'pnpm run spec:validate-file'"
  ],
  ".claude/**/*.json": [
    "bash -c 'pnpm run validate:mcp-schema'"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
```

## NPM Scripts

The following scripts are available in `package.json`:

```bash
# Run tests for related files only
pnpm run test:related

# Validate spec compliance for a file
pnpm run spec:validate-file

# Validate MCP schema
pnpm run validate:mcp-schema

# Generate partial documentation
pnpm run docs:generate-partial
```

## Hook Execution Flow

When you run `git commit`:

1. **Husky** triggers `.husky/pre-commit`
2. **lint-staged** processes staged files by pattern
3. **Hooks run in parallel** where possible:
   - ESLint + Prettier (all JS/TS files)
   - Test related files (all JS/TS files)
   - Spec validation (TypeScript files)
   - Doc generation (service/controller files)
   - MCP validation (.claude JSON files)
4. **Results aggregated** and displayed
5. **Commit proceeds** if blocking hooks pass

## Performance Characteristics

- **Test hook**: ~2-5 seconds (only changed files)
- **Spec validation**: ~0.5 seconds (pattern matching)
- **MCP validation**: ~0.5 seconds (JSON parsing)
- **Doc generation**: ~0.5 seconds (informational only)
- **Total overhead**: ~3-6 seconds typical

## Troubleshooting

### Hook not running
```bash
# Reinstall husky hooks
pnpm prepare

# Check husky is installed
ls -la .husky/pre-commit
```

### Tests timing out
```bash
# Run tests manually to debug
pnpm test:related path/to/file.ts

# Check jest config
cat jest.config.ts
```

### MCP validation failing
```bash
# Validate JSON manually
python3 -m json.tool .claude/mcp/config.json

# Check required structure
cat .claude/mcp/config.json | grep mcpServers
```

### Permission denied
```bash
# Make scripts executable
chmod +x scripts/hooks/*.sh
```

## Skipping Hooks

In rare cases, you can skip hooks:

```bash
# Skip all pre-commit hooks (use sparingly!)
git commit --no-verify -m "message"

# Better: Fix the issue and commit normally
```

## Customization

To add new hooks:

1. Create script in `scripts/hooks/`
2. Make executable: `chmod +x scripts/hooks/your-script.sh`
3. Add to `package.json` scripts
4. Add pattern to `.lintstagedrc.json`
5. Test with `pnpm lint-staged`

## References

- Implementation based on: `.claude/reports/tooling-and-mcp-analysis.md` (Section 8.2, lines 198-217)
- Husky: https://typicode.github.io/husky/
- lint-staged: https://github.com/okonet/lint-staged
- Jest: https://jestjs.io/docs/cli#--findrelatedtests-spaceseparatedlistofsourcefiles

## Maintenance

These hooks should be reviewed and updated when:
- New service types are added
- MCP configuration structure changes
- Testing strategy changes
- Documentation generation changes
