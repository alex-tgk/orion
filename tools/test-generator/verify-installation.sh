#!/bin/bash

echo "=== AI Test Generator Installation Verification ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not installed"
        return 1
    fi
}

echo "Checking core files..."
check_file "tools/test-generator/generator.ts"
check_file "tools/test-generator/cli.ts"
check_file "tools/test-generator/config.json"
check_file "tools/test-generator/index.ts"

echo ""
echo "Checking analyzers..."
check_file "tools/test-generator/analyzers/code-analyzer.ts"
check_file "tools/test-generator/analyzers/coverage-analyzer.ts"

echo ""
echo "Checking templates..."
check_file "tools/test-generator/templates/controller.template.ts"
check_file "tools/test-generator/templates/service.template.ts"
check_file "tools/test-generator/templates/integration.template.ts"
check_file "tools/test-generator/templates/index.ts"

echo ""
echo "Checking types..."
check_file "tools/test-generator/types/index.ts"

echo ""
echo "Checking documentation..."
check_file "tools/test-generator/README.md"
check_file "tools/test-generator/EXAMPLES.md"
check_file "tools/test-generator/QUICK_REFERENCE.md"
check_file "docs/testing/ai-test-generation.md"

echo ""
echo "Checking integration..."
check_file ".claude/commands/generate-tests.md"
check_file ".github/workflows/test-coverage-improvement.yml"

echo ""
echo "Checking dependencies..."
if [ -f "package.json" ]; then
    if grep -q "@anthropic-ai/sdk" package.json; then
        echo -e "${GREEN}✓${NC} @anthropic-ai/sdk dependency"
    else
        echo -e "${RED}✗${NC} @anthropic-ai/sdk dependency"
    fi
    
    if grep -q "commander" package.json; then
        echo -e "${GREEN}✓${NC} commander dependency"
    else
        echo -e "${RED}✗${NC} commander dependency"
    fi
    
    if grep -q "generate:tests" package.json; then
        echo -e "${GREEN}✓${NC} npm scripts configured"
    else
        echo -e "${RED}✗${NC} npm scripts not configured"
    fi
fi

echo ""
echo "Checking environment..."
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo -e "${GREEN}✓${NC} ANTHROPIC_API_KEY is set"
else
    echo -e "${RED}⚠${NC} ANTHROPIC_API_KEY is not set (required for generation)"
fi

echo ""
echo "Checking Node.js tools..."
check_command "node"
check_command "npm"
check_command "pnpm"
check_command "ts-node"

echo ""
echo "=== Verification Complete ==="
echo ""
echo "To use the test generator:"
echo "  1. Set ANTHROPIC_API_KEY environment variable"
echo "  2. Run: npm run generate:tests:file <path>"
echo "  3. Or use Claude Code: /generate-tests"
echo ""
echo "Documentation: docs/testing/ai-test-generation.md"
