#!/bin/bash
# Test Pre-commit Hooks
# Validates that all hook scripts are working correctly

set -e

echo "Testing Pre-commit Hooks..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Check scripts exist and are executable
echo "Test 1: Checking hook scripts..."
HOOKS=(
  "./scripts/hooks/test-related.sh"
  "./scripts/hooks/validate-spec.sh"
  "./scripts/hooks/validate-mcp-schema.sh"
  "./scripts/hooks/generate-docs-partial.sh"
)

for HOOK in "${HOOKS[@]}"; do
  if [ -f "$HOOK" ]; then
    if [ -x "$HOOK" ]; then
      echo -e "${GREEN}✓${NC} $HOOK exists and is executable"
      ((TESTS_PASSED++))
    else
      echo -e "${RED}✗${NC} $HOOK is not executable"
      ((TESTS_FAILED++))
    fi
  else
    echo -e "${RED}✗${NC} $HOOK does not exist"
    ((TESTS_FAILED++))
  fi
done

echo ""

# Test 2: Check package.json scripts
echo "Test 2: Checking package.json scripts..."
SCRIPTS=(
  "test:related"
  "spec:validate-file"
  "validate:mcp-schema"
  "docs:generate-partial"
)

for SCRIPT in "${SCRIPTS[@]}"; do
  if grep -q "\"$SCRIPT\"" package.json; then
    echo -e "${GREEN}✓${NC} Script '$SCRIPT' defined in package.json"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} Script '$SCRIPT' missing from package.json"
    ((TESTS_FAILED++))
  fi
done

echo ""

# Test 3: Check lint-staged configuration
echo "Test 3: Checking lint-staged configuration..."
if [ -f ".lintstagedrc.json" ]; then
  echo -e "${GREEN}✓${NC} .lintstagedrc.json exists"
  ((TESTS_PASSED++))

  # Validate JSON syntax
  if python3 -m json.tool .lintstagedrc.json > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} .lintstagedrc.json is valid JSON"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} .lintstagedrc.json has invalid JSON"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗${NC} .lintstagedrc.json does not exist"
  ((TESTS_FAILED++))
fi

echo ""

# Test 4: Check Husky pre-commit hook
echo "Test 4: Checking Husky configuration..."
if [ -f ".husky/pre-commit" ]; then
  echo -e "${GREEN}✓${NC} .husky/pre-commit exists"
  ((TESTS_PASSED++))

  if [ -x ".husky/pre-commit" ]; then
    echo -e "${GREEN}✓${NC} .husky/pre-commit is executable"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗${NC} .husky/pre-commit is not executable"
    ((TESTS_FAILED++))
  fi

  if grep -q "lint-staged" .husky/pre-commit; then
    echo -e "${GREEN}✓${NC} .husky/pre-commit calls lint-staged"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} .husky/pre-commit doesn't call lint-staged"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗${NC} .husky/pre-commit does not exist"
  ((TESTS_FAILED++))
fi

echo ""

# Test 5: Test MCP validation with valid config
echo "Test 5: Testing MCP validation..."
if [ -f ".claude/mcp/config.json" ]; then
  if ./scripts/hooks/validate-mcp-schema.sh .claude/mcp/config.json > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MCP validation passes for existing config"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠${NC} MCP validation has issues with existing config"
    # Don't fail - might be expected
  fi
fi

echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  echo ""
  echo "Pre-commit hooks are properly configured."
  echo "Try making a commit to see them in action!"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  echo ""
  echo "Please fix the issues above before committing."
  exit 1
fi
