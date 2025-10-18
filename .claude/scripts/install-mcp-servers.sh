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
npm install -g @modelcontextprotocol/server-docker
echo -e "${GREEN}✓ Docker MCP server installed${NC}"
echo ""

# Install Kubernetes MCP server
echo -e "${YELLOW}Installing Kubernetes MCP server...${NC}"
npm install -g @modelcontextprotocol/server-kubernetes
echo -e "${GREEN}✓ Kubernetes MCP server installed${NC}"
echo ""

# Install Prometheus MCP server
echo -e "${YELLOW}Installing Prometheus MCP server...${NC}"
npm install -g @modelcontextprotocol/server-prometheus || echo -e "${YELLOW}⚠ Prometheus MCP server not available (optional)${NC}"
echo ""

# Install Memory MCP server
echo -e "${YELLOW}Installing Memory MCP server...${NC}"
npm install -g @modelcontextprotocol/server-memory
echo -e "${GREEN}✓ Memory MCP server installed${NC}"
echo ""

# Install Filesystem MCP server
echo -e "${YELLOW}Installing Filesystem MCP server...${NC}"
npm install -g @modelcontextprotocol/server-filesystem
echo -e "${GREEN}✓ Filesystem MCP server installed${NC}"
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
npm list -g @modelcontextprotocol/server-docker 2>/dev/null && echo -e "${GREEN}✓ Docker MCP${NC}" || echo -e "${RED}✗ Docker MCP${NC}"
npm list -g @modelcontextprotocol/server-kubernetes 2>/dev/null && echo -e "${GREEN}✓ Kubernetes MCP${NC}" || echo -e "${RED}✗ Kubernetes MCP${NC}"
npm list -g @modelcontextprotocol/server-memory 2>/dev/null && echo -e "${GREEN}✓ Memory MCP${NC}" || echo -e "${RED}✗ Memory MCP${NC}"
npm list -g @modelcontextprotocol/server-filesystem 2>/dev/null && echo -e "${GREEN}✓ Filesystem MCP${NC}" || echo -e "${RED}✗ Filesystem MCP${NC}"

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
