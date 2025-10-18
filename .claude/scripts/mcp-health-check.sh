#!/bin/bash

##
## ORION MCP Health Check Script
##
## Quick health check for MCP servers and ORION services.
##

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  ORION MCP Health Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check MCP configuration
if [ -f ".claude/mcp/config.json" ]; then
    echo -e "${GREEN}✓${NC} MCP config exists"
else
    echo -e "${RED}✗${NC} MCP config missing"
fi

# Check environment
if [ -n "$GITHUB_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} GITHUB_TOKEN set"
else
    echo -e "${YELLOW}⚠${NC} GITHUB_TOKEN not set"
fi

# Check Docker
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker running"
else
    echo -e "${RED}✗${NC} Docker not running"
fi

# Check services
echo ""
echo -e "${BLUE}Service Status:${NC}"

services=(
    "API Gateway:3000"
    "Auth Service:3001"
    "User Service:3002"
    "Notification Service:3003"
    "Admin UI:3004"
)

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -s "http://localhost:${port}/health" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} ${name} (${port})"
    else
        echo -e "  ${YELLOW}⚠${NC} ${name} (${port}) - not running"
    fi
done

echo ""
echo -e "${BLUE}======================================${NC}"
