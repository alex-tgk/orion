# AI Test Generator - Quick Reference

## Setup

```bash
# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Or add to .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

## Common Commands

### Generate for Single File
```bash
npm run generate:tests:file packages/auth/src/app/auth.controller.ts
```

### Generate for Service
```bash
npm run generate:tests:service auth
```

### Generate Missing Tests
```bash
npm run generate:missing-tests -- --service auth
```

### Coverage-Based Generation
```bash
npm run generate:tests:coverage -- --service auth --threshold 70
```

### Generate All
```bash
npm run generate:tests
```

## CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `-i, --integration` | Include integration tests | `--integration` |
| `-e, --edge-cases` | Include edge cases | `--edge-cases` |
| `--error-scenarios` | Include error scenarios | `--error-scenarios` |
| `-f, --fixtures` | Generate fixtures | `--fixtures` |
| `-s, --service <name>` | Target service | `--service auth` |
| `-t, --threshold <n>` | Coverage threshold | `--threshold 70` |

## Slash Command

```
/generate-tests
```

Follow interactive prompts to:
1. Choose what to test (file/service/coverage)
2. Select options (integration/edge-cases/etc.)
3. Review generated tests
4. Save or modify

## File Locations

| Type | Location |
|------|----------|
| Unit Tests | `*.spec.ts` |
| Integration Tests | `*.integration.spec.ts` |
| E2E Tests | `*.e2e-spec.ts` |

## What Gets Generated

### Controllers
- HTTP endpoint tests
- Request/response validation
- Auth/guard testing
- Error handling
- Integration tests

### Services
- Business logic tests
- Dependency mocking
- Error scenarios
- Edge cases
- Validation tests

### Utilities
- Pure function tests
- Input validation
- Type checking
- Edge cases

## Quality Checks

Generated tests are validated for:
- ✅ TypeScript compilation
- ✅ Test execution (must pass)
- ✅ Proper mocking
- ✅ Arrange-Act-Assert pattern
- ✅ Descriptive names

## Workflow

1. **Analyze**: Code structure analysis
2. **Generate**: AI-powered test creation
3. **Validate**: Quality and compilation checks
4. **Save**: Write to disk with backups
5. **Report**: Coverage improvement metrics

## Configuration

Edit `tools/test-generator/config.json`:

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 8000,
  "temperature": 0.3,
  "coverageThreshold": {
    "global": {
      "lines": 80,
      "functions": 80,
      "branches": 80,
      "statements": 80
    }
  }
}
```

## GitHub Workflow

### Schedule
- Runs every Monday at 9 AM UTC
- Analyzes coverage
- Generates tests
- Creates PR

### Manual Trigger
```bash
gh workflow run test-coverage-improvement.yml \
  -f service=auth \
  -f threshold=70
```

## Troubleshooting

### Tests Don't Compile
```bash
npx tsc --noEmit path/to/test.spec.ts
```

### Tests Fail
```bash
npx jest path/to/test.spec.ts --verbose
```

### Low Quality
```bash
# Regenerate with more options
npm run generate:tests:file path/to/file.ts \
  --integration \
  --edge-cases \
  --error-scenarios \
  --fixtures
```

## Best Practices

1. ✅ Start with one file/service
2. ✅ Review generated tests
3. ✅ Run tests immediately
4. ✅ Enhance as needed
5. ✅ Commit incrementally
6. ✅ Check coverage

## Examples

### Basic Usage
```bash
npm run generate:tests:file packages/auth/src/app/auth.service.ts
```

### With Options
```bash
npm run generate:tests:service notifications \
  -- --integration --edge-cases --fixtures
```

### Coverage Focus
```bash
npm run generate:tests:coverage \
  -- --service user --threshold 75
```

## Output Example

```
Analyzing packages/auth/src/app/auth.service.ts...
✓ Analyzed file structure
✓ Identified 5 public methods
✓ Found 3 dependencies

Generating tests using Claude API...
✓ Generated comprehensive unit tests
✓ Generated 12 test scenarios
✓ Included edge cases and error handling

Validating generated tests...
✓ TypeScript compilation successful
✓ All tests pass (12/12)
✓ Coverage: 45% → 87%

Saved: packages/auth/src/app/auth.service.spec.ts
```

## Getting Help

```bash
# CLI help
npx ts-node tools/test-generator/cli.ts --help

# Command-specific help
npx ts-node tools/test-generator/cli.ts file --help
```

## Documentation

- Full Guide: `/docs/testing/ai-test-generation.md`
- README: `/tools/test-generator/README.md`
- Examples: `/tools/test-generator/EXAMPLES.md`
- Implementation: `/IMPLEMENTATION_SUMMARY_AI_TEST_GENERATION.md`

## Support

- GitHub Issues
- Team Slack: #orion-testing
- Documentation: `/docs/testing/`

---

**Quick Start**: `npm run generate:tests:file <path>`

**Full Docs**: `/docs/testing/ai-test-generation.md`
