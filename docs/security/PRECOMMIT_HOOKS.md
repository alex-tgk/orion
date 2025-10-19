# Pre-commit Hooks Quick Reference

## TL;DR

Enhanced pre-commit hooks are now active. They will:
- ✅ Run tests for files you changed
- ✅ Validate MCP configurations
- ⚠️ Warn if specs are missing (but allow commit)
- ℹ️ Suggest doc updates (but allow commit)

**Total overhead**: ~5-8 seconds per commit

## What Runs When You Commit

```bash
git commit -m "your message"
```

Automatically runs:
1. **ESLint** - Fixes code style issues
2. **Prettier** - Formats code
3. **Related Tests** - Runs tests for changed files only
4. **Spec Check** - Warns if GitHub Spec Kit specs missing
5. **MCP Validation** - Validates `.claude/**/*.json` files
6. **Doc Check** - Suggests doc updates if needed

## Hook Details

### 🔴 Blocking Hooks (Will Fail Commit)
- ESLint errors
- Prettier failures
- **Test failures** ← NEW
- **MCP config errors** ← NEW

### 🟡 Warning Hooks (Won't Fail Commit)
- Missing specs
- Missing documentation

## Common Scenarios

### Scenario 1: You Changed a Service File
```bash
# Modified: packages/auth/src/app/auth.service.ts

git add .
git commit -m "fix: update auth logic"

# Runs:
# ✓ ESLint + Prettier
# ✓ Tests for auth.service.spec.ts only
# ✓ Checks for .claude/specs/auth-service.md
# ✓ Checks JSDoc comments
```

### Scenario 2: You Changed MCP Config
```bash
# Modified: .claude/mcp/config.json

git add .
git commit -m "feat: add new MCP server"

# Runs:
# ✓ Prettier (formats JSON)
# ✓ Validates JSON syntax
# ✓ Validates MCP server structure
# ✓ Checks for required fields
```

### Scenario 3: You Changed Multiple Files
```bash
# Modified:
#   packages/auth/src/app/auth.service.ts
#   packages/user/src/app/user.controller.ts

git add .
git commit -m "feat: update authentication"

# Runs in parallel:
# ✓ ESLint + Prettier (both files)
# ✓ Tests for both services
# ✓ Spec checks for both
# ✓ Doc checks for both
```

## Skipping Hooks (Emergency Only)

```bash
# Skip all hooks (use sparingly!)
git commit --no-verify -m "message"

# Better: Fix the issue
pnpm test                    # Run tests
pnpm lint:fix                # Fix lint issues
pnpm spec:validate           # Check specs
```

## Manual Testing

Test individual hooks:
```bash
# Test all hooks
pnpm run test:related packages/auth/src/app/auth.service.ts

# Validate specs
pnpm run spec:validate-file packages/auth/src/app/auth.service.ts

# Validate MCP configs
pnpm run validate:mcp-schema .claude/mcp/config.json

# Check docs
pnpm run docs:generate-partial packages/auth/src/app/auth.controller.ts
```

## Test the Entire Setup

```bash
./scripts/hooks/test-hooks.sh
```

Should output:
```
All tests passed!
Pre-commit hooks are properly configured.
```

## Performance Tips

### Fast Commits
- Hooks only run on changed files
- Tests use `--findRelatedTests` (fast)
- Validations use pattern matching (fast)

### Slow Commits?
- Check which hook is slow: look at output
- Tests taking too long? Check jest config
- Too many files? Consider partial commits

## Troubleshooting

### "Hook not running"
```bash
pnpm prepare
```

### "Permission denied"
```bash
chmod +x scripts/hooks/*.sh
```

### "Tests timing out"
```bash
# Check jest config
cat jest.config.ts

# Run tests manually
pnpm test packages/your-service
```

### "MCP validation failing"
```bash
# Validate JSON
python3 -m json.tool .claude/mcp/config.json

# Check structure
cat .claude/mcp/config.json
```

## What Changed

### Before
```json
{
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

### After
```json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "bash -c 'pnpm run test:related'"        ← NEW
  ],
  "packages/**/*.ts": [
    "bash -c 'pnpm run spec:validate-file'"  ← NEW
  ],
  ".claude/**/*.json": [
    "bash -c 'pnpm run validate:mcp-schema'" ← NEW
  ],
  "packages/*/src/**/*.{service,controller}.ts": [
    "bash -c 'pnpm run docs:generate-partial'" ← NEW
  ]
}
```

## Full Documentation

For complete details, see:
- `/scripts/hooks/README.md` - Comprehensive hook documentation
- `.claude/reports/pre-commit-enhancements-summary.md` - Implementation summary
- `.claude/reports/tooling-and-mcp-analysis.md` - Original recommendations (Section 8.2)

## Questions?

Check the documentation or run:
```bash
./scripts/hooks/test-hooks.sh
```

---

**Implementation Date**: 2025-10-18
**Reference**: tooling-and-mcp-analysis.md Section 8.2
**Status**: ✅ Active
