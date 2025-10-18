#!/bin/bash
# Test Related Files Hook
# Runs tests for files affected by the commit
# Only fails on critical test failures, warns on others

set -e

STAGED_FILES=$@

if [ -z "$STAGED_FILES" ]; then
  echo "No files to test"
  exit 0
fi

echo "Running tests for related files..."

# Filter for test files
TEST_FILES=$(echo "$STAGED_FILES" | tr ' ' '\n' | grep -E '\.(ts|tsx)$' || true)

if [ -z "$TEST_FILES" ]; then
  echo "No TypeScript files changed - skipping tests"
  exit 0
fi

# Run jest with findRelatedTests for only the changed files
# --passWithNoTests ensures we don't fail if no tests exist
# --bail stops on first failure to provide fast feedback
# --onlyChanged only runs tests related to changed files
npx jest --findRelatedTests --passWithNoTests --bail $TEST_FILES 2>&1 | tee /tmp/test-output.log

EXIT_CODE=${PIPESTATUS[0]}

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Tests failed for changed files!"
  echo "Run 'pnpm test' to see full output"
  echo ""
  exit 1
fi

echo ""
echo "✅ All related tests passed!"
echo ""
exit 0
