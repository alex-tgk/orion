#!/bin/bash

# ORION Admin Dashboard - Backend Verification Script
# Verifies that all backend components are properly installed and configured

set -e

echo "🔍 ORION Admin Dashboard - Backend Verification"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check Node.js version
echo "Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    pass "Node.js installed: $NODE_VERSION"
else
    fail "Node.js not found"
fi
echo ""

# Check pnpm
echo "Checking pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    pass "pnpm installed: $PNPM_VERSION"
else
    fail "pnpm not found"
fi
echo ""

# Check directory structure
echo "Checking directory structure..."
dirs=("src/app/controllers" "src/app/services" "src/app/gateways" "src/app/dto" "src/app/config")
for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        pass "Directory exists: $dir"
    else
        fail "Directory missing: $dir"
    fi
done
echo ""

# Check critical files
echo "Checking critical files..."
files=(
    "src/main.ts"
    "src/app/app.module.ts"
    "package.json"
    "nest-cli.json"
    "tsconfig.server.json"
    ".env.example"
    "BACKEND_API_CONTRACTS.md"
    "BACKEND_README.md"
)
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "File missing: $file"
    fi
done
echo ""

# Check controllers
echo "Checking controllers..."
controllers=(
    "src/app/controllers/health.controller.ts"
    "src/app/controllers/services.controller.ts"
    "src/app/controllers/pm2.controller.ts"
    "src/app/controllers/logs.controller.ts"
    "src/app/controllers/queues.controller.ts"
    "src/app/controllers/feature-flags.controller.ts"
    "src/app/controllers/ai.controller.ts"
)
for controller in "${controllers[@]}"; do
    if [ -f "$controller" ]; then
        pass "Controller: $(basename $controller)"
    else
        fail "Controller missing: $(basename $controller)"
    fi
done
echo ""

# Check services
echo "Checking services..."
services=(
    "src/app/services/health.service.ts"
    "src/app/services/services.service.ts"
    "src/app/services/pm2.service.ts"
    "src/app/services/logs.service.ts"
    "src/app/services/rabbitmq.service.ts"
    "src/app/services/feature-flags.service.ts"
)
for service in "${services[@]}"; do
    if [ -f "$service" ]; then
        pass "Service: $(basename $service)"
    else
        fail "Service missing: $(basename $service)"
    fi
done
echo ""

# Check DTOs
echo "Checking DTOs..."
dtos=(
    "src/app/dto/health.dto.ts"
    "src/app/dto/service.dto.ts"
    "src/app/dto/pm2.dto.ts"
    "src/app/dto/log.dto.ts"
    "src/app/dto/queue.dto.ts"
    "src/app/dto/feature-flag.dto.ts"
    "src/app/dto/index.ts"
)
for dto in "${dtos[@]}"; do
    if [ -f "$dto" ]; then
        pass "DTO: $(basename $dto)"
    else
        fail "DTO missing: $(basename $dto)"
    fi
done
echo ""

# Check gateway
echo "Checking WebSocket gateway..."
if [ -f "src/app/gateways/admin-events.gateway.ts" ]; then
    pass "WebSocket gateway exists"
else
    fail "WebSocket gateway missing"
fi
echo ""

# Check dependencies in package.json
echo "Checking NestJS dependencies..."
required_deps=(
    "@nestjs/common"
    "@nestjs/core"
    "@nestjs/platform-express"
    "@nestjs/platform-socket.io"
    "@nestjs/websockets"
    "@nestjs/config"
    "@nestjs/swagger"
    "class-validator"
    "class-transformer"
    "pm2"
    "amqplib"
    "socket.io"
)
for dep in "${required_deps[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        pass "Dependency: $dep"
    else
        fail "Dependency missing: $dep"
    fi
done
echo ""

# Check scripts
echo "Checking npm scripts..."
required_scripts=("dev:server" "build:server" "start:server")
for script in "${required_scripts[@]}"; do
    if grep -q "\"$script\"" package.json; then
        pass "Script: $script"
    else
        fail "Script missing: $script"
    fi
done
echo ""

# Check environment file
echo "Checking environment configuration..."
if [ -f ".env.example" ]; then
    required_vars=("ADMIN_API_PORT" "AUTH_SERVICE_URL" "RABBITMQ_URL")
    for var in "${required_vars[@]}"; do
        if grep -q "$var" .env.example; then
            pass "Env var documented: $var"
        else
            fail "Env var missing: $var"
        fi
    done
else
    fail ".env.example not found"
fi
echo ""

# Count TypeScript files
echo "Code statistics..."
TS_FILES=$(find src/app -name "*.ts" 2>/dev/null | wc -l | xargs)
TS_LINES=$(find src/app -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
pass "TypeScript files: $TS_FILES"
pass "Total lines of code: $TS_LINES"
echo ""

# Summary
echo "================================================"
echo "Verification Summary"
echo "================================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Backend is ready for development."
    echo ""
    echo "Next steps:"
    echo "  1. Copy .env.example to .env and configure"
    echo "  2. Run 'pnpm install' to install dependencies"
    echo "  3. Run 'pnpm run dev:server' to start backend"
    echo "  4. Visit http://localhost:3004/api/docs for API documentation"
    exit 0
else
    echo -e "${RED}✗ Some checks failed!${NC}"
    echo ""
    echo "Please review the errors above and fix them before proceeding."
    exit 1
fi
