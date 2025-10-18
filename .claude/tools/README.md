# ORION Validation Tools

This directory contains validation and testing scripts used by the CI/CD pipeline.

## Scripts

### 1. `validate-mcp.sh`

**Purpose**: Validate MCP server configurations and agent definitions

**Usage**:
```bash
./.claude/tools/validate-mcp.sh
```

**What it checks**:
- MCP config file exists and is valid JSON
- Required fields are present (mcpServers, command, args)
- Agent definition files are present
- Agent files have proper structure
- Custom commands exist

**Exit codes**:
- `0` - Validation passed
- `1` - Validation failed with errors

**Dependencies**: `jq` (for JSON parsing)

---

### 2. `validate-specs.sh`

**Purpose**: Validate GitHub Spec Kit specifications and implementation coverage

**Usage**:
```bash
./.claude/tools/validate-specs.sh
```

**What it checks**:
- Spec files exist in `.claude/specs/`
- Required sections are present:
  - Overview
  - API Endpoints
  - Data Models
  - Dependencies
- Recommended sections (warns if missing):
  - Authentication
  - Error Handling
  - Testing
  - Environment Variables
- Implementation exists for each spec
- Test files exist for implementations
- No orphaned services (services without specs)

**Exit codes**:
- `0` - Validation passed (may have warnings)
- `1` - Validation failed with errors

**Dependencies**: None

---

### 3. `run-performance-tests.sh`

**Purpose**: Run performance benchmarks and load tests

**Usage**:
```bash
# With defaults
./.claude/tools/run-performance-tests.sh

# With custom settings
export PERFORMANCE_TEST_URL=http://localhost:3001
export PERFORMANCE_TEST_DURATION=60s
export PERFORMANCE_TEST_VUS=20
export PERFORMANCE_THRESHOLD_P95=300
export PERFORMANCE_THRESHOLD_P99=800
./.claude/tools/run-performance-tests.sh
```

**What it tests**:
- k6 load tests (health endpoint, API endpoints)
- Build performance benchmarking
- Test execution performance benchmarking

**Environment Variables**:
- `PERFORMANCE_TEST_URL` - Target URL (default: http://localhost:3001)
- `PERFORMANCE_TEST_DURATION` - Test duration (default: 30s)
- `PERFORMANCE_TEST_VUS` - Virtual users (default: 10)
- `PERFORMANCE_THRESHOLD_P95` - P95 latency threshold in ms (default: 500)
- `PERFORMANCE_THRESHOLD_P99` - P99 latency threshold in ms (default: 1000)

**Output**:
- `performance-results/results.json` - Raw k6 metrics
- `performance-results/summary.txt` - Summary report
- `performance-results/load-test.js` - k6 test script
- `performance-results/build-output.log` - Build benchmark
- `performance-results/test-output.log` - Test benchmark

**Exit codes**:
- `0` - All tests passed
- `1` - Tests failed or thresholds not met

**Dependencies**: `k6` (auto-installed if missing), `jq` (optional, for metrics)

---

## CI/CD Integration

These scripts are automatically run in the CI/CD pipeline:

### MCP Validation Job
- **Triggers**: All pushes and PRs
- **Runs**: In parallel with other quality checks
- **Artifacts**: `.claude/` directory (7 days retention)

### Spec Validation Job
- **Triggers**: All pushes and PRs
- **Runs**: In parallel with other quality checks
- **Artifacts**: `.claude/specs/` directory (7 days retention)

### Performance Testing Job
- **Triggers**: Push events only (not PRs)
- **Runs**: After successful build
- **Artifacts**: `performance-results/` (30 days retention)
- **PR Comments**: Automatically posts summary on PRs

---

## Local Development

### Running All Validations

```bash
# Run all validations locally before committing
./.claude/tools/validate-mcp.sh && \
./.claude/tools/validate-specs.sh && \
echo "✓ All validations passed!"
```

### Running Performance Tests Locally

```bash
# Start services first
docker compose up -d

# Wait for services to be ready
sleep 10

# Run performance tests
./.claude/tools/run-performance-tests.sh

# View results
cat performance-results/summary.txt
```

---

## Troubleshooting

### MCP Validation Errors

**Error**: `MCP config is not valid JSON`
- **Solution**: Check `.claude/mcp/config.json` for syntax errors
- **Tool**: Use `jq empty .claude/mcp/config.json` to validate

**Error**: `Server 'X' missing 'command' field`
- **Solution**: Add the `command` field to the server configuration

### Spec Validation Errors

**Error**: `Spec 'X' missing section: ## Overview`
- **Solution**: Add the required section to the spec file

**Warning**: `Service 'X' has no specification file`
- **Solution**: Create `.claude/specs/X-service.md`

### Performance Test Errors

**Error**: `k6 is not installed`
- **Solution**: Script auto-installs on Linux. On macOS, run: `brew install k6`

**Error**: `Performance tests failed - thresholds not met`
- **Solution**: Check `performance-results/results.json` for details
- **Action**: Either fix performance issues or adjust thresholds

---

## Adding New Validations

To add a new validation check:

1. Create a new script in this directory
2. Make it executable: `chmod +x your-script.sh`
3. Add to `.github/workflows/ci.yml`
4. Update this README

Example structure:
```bash
#!/bin/bash
set -e

# Your validation logic here

# Exit with appropriate code
exit 0  # Success
exit 1  # Failure
```

---

## Maintenance

### Updating Scripts

When updating these scripts:
1. Test locally first
2. Check exit codes work correctly
3. Ensure error messages are clear
4. Update this README if behavior changes
5. Commit with descriptive message

### Version History

- **v1.0.0** (2025-10-18) - Initial implementation
  - MCP validation
  - Spec validation
  - Performance testing

---

## Support

For issues or questions:
1. Check script output for error messages
2. Review `.claude/reports/ci-cd-enhancements-summary.md`
3. Check CI/CD job logs in GitHub Actions
4. Create an issue if problem persists
