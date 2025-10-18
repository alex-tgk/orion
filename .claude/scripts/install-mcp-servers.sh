#!/bin/bash

##
## ORION MCP Server Installation Script
##
## This script installs all required MCP servers for the ORION platform.
##

set -e  # Exit on error

echo "=================================================="
echo "  ORION MCP Server Installation"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Ensure we have a writable prefix for global installs
NPM_PREFIX="$(npm config get prefix 2>/dev/null || echo "")"
if [ -n "$NPM_PREFIX" ] && [ ! -w "$NPM_PREFIX" ]; then
    LOCAL_NPM_PREFIX="${HOME}/.local/share/npm"
    mkdir -p "${LOCAL_NPM_PREFIX}"
    export npm_config_prefix="${LOCAL_NPM_PREFIX}"
    export PATH="${LOCAL_NPM_PREFIX}/bin:${PATH}"
    echo -e "${YELLOW}Using user-local npm prefix: ${LOCAL_NPM_PREFIX}${NC}"
fi

echo "Installing MCP servers globally..."
echo ""

# Install GitHub MCP server
echo -e "${YELLOW}Installing GitHub MCP server...${NC}"
npm install -g @modelcontextprotocol/server-github
echo -e "${GREEN}✓ GitHub MCP server installed${NC}"
echo ""

# Install PostgreSQL MCP server
echo -e "${YELLOW}Installing PostgreSQL MCP server...${NC}"
npm install -g @modelcontextprotocol/server-postgres
echo -e "${GREEN}✓ PostgreSQL MCP server installed${NC}"
echo ""

# Install Docker MCP server
echo -e "${YELLOW}Installing Docker MCP server...${NC}"
npm install -g docker-mcp
echo -e "${GREEN}✓ Docker MCP server installed${NC}"
echo ""

# Install Kubernetes MCP server
echo -e "${YELLOW}Installing Kubernetes MCP server...${NC}"
npm install -g mcp-server-kubernetes
echo -e "${GREEN}✓ Kubernetes MCP server installed${NC}"
echo ""

# Install Prometheus MCP server
echo -e "${YELLOW}Installing Prometheus MCP server...${NC}"
npm install -g prometheus-mcp
echo -e "${GREEN}✓ Prometheus MCP server installed${NC}"
echo ""

# Install Memory MCP server
echo -e "${YELLOW}Installing Memory MCP server...${NC}"
npm install -g @modelcontextprotocol/server-memory
echo -e "${GREEN}✓ Memory MCP server installed${NC}"
echo ""

# Install Sequential Thinking MCP server
echo -e "${YELLOW}Installing Sequential Thinking MCP server...${NC}"
npm install -g @modelcontextprotocol/server-sequential-thinking
echo -e "${GREEN}✓ Sequential Thinking MCP server installed${NC}"
echo ""

# Install Filesystem MCP server
echo -e "${YELLOW}Installing Filesystem MCP server...${NC}"
npm install -g @modelcontextprotocol/server-filesystem
echo -e "${GREEN}✓ Filesystem MCP server installed${NC}"
echo ""

# Install Context7 MCP server
echo -e "${YELLOW}Installing Context7 MCP server...${NC}"
npm install -g @upstash/context7-mcp
echo -e "${GREEN}✓ Context7 MCP server installed${NC}"
echo ""

# Preflight Serena MCP requirements
if command -v uv &> /dev/null; then
    echo -e "${GREEN}✓ 'uv' detected (required for Serena MCP)${NC}"
    echo -e "${YELLOW}Caching Serena MCP tool environment (first run may take a moment)...${NC}"
    if uv tool install --from git+https://github.com/oraios/serena serena-agent >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Serena MCP tool installed to uv toolchain${NC}"
    else
        echo -e "${YELLOW}⚠ Unable to pre-install Serena MCP (it will download on first use)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 'uv' command not found. Install uv from https://docs.astral.sh/uv/ to enable the Serena MCP server.${NC}"
fi
echo ""

# Build ORION local MCP server
echo -e "${YELLOW}Building ORION local MCP server...${NC}"
cd "$(dirname "$0")/../.."
pnpm nx build mcp-server
echo -e "${GREEN}✓ ORION local MCP server built${NC}"
echo ""

# Verify installations
echo "=================================================="
echo "  Verifying Installations"
echo "=================================================="
echo ""

npm list -g @modelcontextprotocol/server-github 2>/dev/null && echo -e "${GREEN}✓ GitHub MCP${NC}" || echo -e "${RED}✗ GitHub MCP${NC}"
npm list -g @modelcontextprotocol/server-postgres 2>/dev/null && echo -e "${GREEN}✓ PostgreSQL MCP${NC}" || echo -e "${RED}✗ PostgreSQL MCP${NC}"
npm list -g docker-mcp 2>/dev/null && echo -e "${GREEN}✓ Docker MCP${NC}" || echo -e "${RED}✗ Docker MCP${NC}"
npm list -g mcp-server-kubernetes 2>/dev/null && echo -e "${GREEN}✓ Kubernetes MCP${NC}" || echo -e "${RED}✗ Kubernetes MCP${NC}"
npm list -g prometheus-mcp 2>/dev/null && echo -e "${GREEN}✓ Prometheus MCP${NC}" || echo -e "${RED}✗ Prometheus MCP${NC}"
npm list -g @modelcontextprotocol/server-memory 2>/dev/null && echo -e "${GREEN}✓ Memory MCP${NC}" || echo -e "${RED}✗ Memory MCP${NC}"
npm list -g @modelcontextprotocol/server-filesystem 2>/dev/null && echo -e "${GREEN}✓ Filesystem MCP${NC}" || echo -e "${RED}✗ Filesystem MCP${NC}"
npm list -g @modelcontextprotocol/server-sequential-thinking 2>/dev/null && echo -e "${GREEN}✓ Sequential Thinking MCP${NC}" || echo -e "${RED}✗ Sequential Thinking MCP${NC}"
npm list -g @upstash/context7-mcp 2>/dev/null && echo -e "${GREEN}✓ Context7 MCP${NC}" || echo -e "${RED}✗ Context7 MCP${NC}"

if [ -f "dist/packages/mcp-server/src/mcp-main.js" ]; then
    echo -e "${GREEN}✓ ORION local MCP${NC}"
else
    echo -e "${RED}✗ ORION local MCP (build failed)${NC}"
fi

echo ""
echo "=================================================="
echo "  Installation Complete"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Ensure environment variables are set (see .claude/mcp/IMPLEMENTATION_GUIDE.md)"
echo "2. Restart Claude Code to load the MCP servers"
echo "3. Run .claude/scripts/test-mcp-connections.sh to verify"
echo ""
