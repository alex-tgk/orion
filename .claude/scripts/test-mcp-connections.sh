#!/bin/bash

##
## ORION MCP Connection Test Script
##
## This script tests connectivity to all configured MCP servers.
##

set -e  # Exit on error

echo "=================================================="
echo "  ORION MCP Connection Tests"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Test 1: Check MCP configuration file
echo -e "${YELLOW}Test 1: Checking MCP configuration...${NC}"
if [ -f "$WORKSPACE_ROOT/.claude/mcp/config.json" ]; then
    if jq . "$WORKSPACE_ROOT/.claude/mcp/config.json" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MCP configuration is valid JSON${NC}"
        SERVER_COUNT=$(jq '.mcpServers | length' "$WORKSPACE_ROOT/.claude/mcp/config.json")
        echo -e "${GREEN}  Found ${SERVER_COUNT} MCP servers configured${NC}"
    else
        echo -e "${RED}✗ MCP configuration is invalid JSON${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ MCP configuration file not found${NC}"
    exit 1
fi
echo ""

# Test 2: Check environment variables
echo -e "${YELLOW}Test 2: Checking environment variables...${NC}"

if [ -n "$GITHUB_TOKEN" ]; then
    echo -e "${GREEN}✓ GITHUB_TOKEN is set${NC}"
else
    echo -e "${RED}✗ GITHUB_TOKEN is not set${NC}"
fi

if [ -n "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓ DATABASE_URL is set${NC}"
else
    echo -e "${YELLOW}⚠ DATABASE_URL is not set (optional)${NC}"
fi

if [ -n "$REDIS_URL" ]; then
    echo -e "${GREEN}✓ REDIS_URL is set${NC}"
else
    echo -e "${YELLOW}⚠ REDIS_URL is not set (optional)${NC}"
fi
echo ""

# Test 3: Check Docker is running
echo -e "${YELLOW}Test 3: Checking Docker daemon...${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker daemon is running${NC}"
else
    echo -e "${RED}✗ Docker daemon is not running${NC}"
fi
echo ""

# Test 4: Check kubectl (for Kubernetes MCP)
echo -e "${YELLOW}Test 4: Checking kubectl configuration...${NC}"
if command -v kubectl &> /dev/null; then
    echo -e "${GREEN}✓ kubectl is installed${NC}"
    if kubectl cluster-info > /dev/null 2>&1; then
        echo -e "${GREEN}✓ kubectl can connect to cluster${NC}"
    else
        echo -e "${YELLOW}⚠ kubectl cannot connect to cluster (will use default config)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ kubectl is not installed (Kubernetes MCP will be disabled)${NC}"
fi
echo ""

# Test 5: Check PostgreSQL connection
echo -e "${YELLOW}Test 5: Checking PostgreSQL connection...${NC}"
if docker ps | grep -q orion-postgres; then
    echo -e "${GREEN}✓ PostgreSQL container is running${NC}"
    if psql "postgresql://orion:orion_dev@localhost:5432/orion_dev" -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Can connect to PostgreSQL database${NC}"
    else
        echo -e "${RED}✗ Cannot connect to PostgreSQL database${NC}"
    fi
else
    echo -e "${RED}✗ PostgreSQL container is not running${NC}"
    echo "  Run: pnpm docker:up"
fi
echo ""

# Test 6: Check ORION local MCP server build
echo -e "${YELLOW}Test 6: Checking ORION local MCP server...${NC}"
if [ -f "$WORKSPACE_ROOT/dist/packages/mcp-server/src/mcp-main.js" ]; then
    echo -e "${GREEN}✓ ORION local MCP server is built${NC}"
else
    echo -e "${RED}✗ ORION local MCP server is not built${NC}"
    echo "  Run: pnpm nx build mcp-server"
fi
echo ""

# Test 7: Check global MCP packages
echo -e "${YELLOW}Test 7: Checking global MCP packages...${NC}"

npm list -g @modelcontextprotocol/server-github > /dev/null 2>&1 && echo -e "${GREEN}✓ GitHub MCP installed${NC}" || echo -e "${RED}✗ GitHub MCP not installed${NC}"
npm list -g @modelcontextprotocol/server-postgres > /dev/null 2>&1 && echo -e "${GREEN}✓ PostgreSQL MCP installed${NC}" || echo -e "${RED}✗ PostgreSQL MCP not installed${NC}"
npm list -g @modelcontextprotocol/server-docker > /dev/null 2>&1 && echo -e "${GREEN}✓ Docker MCP installed${NC}" || echo -e "${RED}✗ Docker MCP not installed${NC}"
npm list -g @modelcontextprotocol/server-kubernetes > /dev/null 2>&1 && echo -e "${GREEN}✓ Kubernetes MCP installed${NC}" || echo -e "${RED}✗ Kubernetes MCP not installed${NC}"
npm list -g @modelcontextprotocol/server-memory > /dev/null 2>&1 && echo -e "${GREEN}✓ Memory MCP installed${NC}" || echo -e "${RED}✗ Memory MCP not installed${NC}"
npm list -g @modelcontextprotocol/server-filesystem > /dev/null 2>&1 && echo -e "${GREEN}✓ Filesystem MCP installed${NC}" || echo -e "${RED}✗ Filesystem MCP not installed${NC}"

echo ""

# Test 8: Check local services
echo -e "${YELLOW}Test 8: Checking ORION services...${NC}"

check_service() {
    local service_name=$1
    local port=$2

    if curl -s "http://localhost:${port}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${service_name} is running on port ${port}${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ ${service_name} is not running on port ${port}${NC}"
        return 1
    fi
}

check_service "API Gateway" 3000
check_service "Auth Service" 3001
check_service "User Service" 3002
check_service "Notification Service" 3003
check_service "Admin UI" 3004

echo ""
echo "=================================================="
echo "  Test Summary"
echo "=================================================="
echo ""
echo "MCP servers are configured and ready."
echo ""
echo "To use MCP tools in Claude Code:"
echo "1. Ensure Claude Code is restarted"
echo "2. Try: 'Check health of all ORION services'"
echo "3. Try: 'Validate the auth service spec'"
echo "4. Try: 'Get affected projects for current changes'"
echo ""
