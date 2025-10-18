#!/bin/bash

# MCP Configuration Validation Script
# Validates MCP server configurations and agent definitions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNINGS++))
}

log_info "Validating MCP configurations..."

# Check if .claude directory exists
if [ ! -d ".claude" ]; then
    log_error ".claude directory not found"
    exit 1
fi

# Validate MCP config file
MCP_CONFIG=".claude/mcp/config.json"
if [ ! -f "$MCP_CONFIG" ]; then
    log_warning "MCP config file not found at $MCP_CONFIG"
else
    log_info "Validating MCP config file..."

    # Check if valid JSON
    if ! jq empty "$MCP_CONFIG" 2>/dev/null; then
        log_error "MCP config is not valid JSON"
    else
        log_info "MCP config is valid JSON"

        # Check for mcpServers key
        if ! jq -e '.mcpServers' "$MCP_CONFIG" > /dev/null 2>&1; then
            log_error "MCP config missing 'mcpServers' key"
        else
            # Count configured servers
            SERVER_COUNT=$(jq '.mcpServers | length' "$MCP_CONFIG")
            log_info "Found $SERVER_COUNT MCP server(s) configured"

            # Validate each server
            jq -r '.mcpServers | keys[]' "$MCP_CONFIG" | while read -r server; do
                log_info "Validating server: $server"

                # Check required fields
                if ! jq -e ".mcpServers.\"$server\".command" "$MCP_CONFIG" > /dev/null 2>&1; then
                    log_error "Server '$server' missing 'command' field"
                fi

                if ! jq -e ".mcpServers.\"$server\".args" "$MCP_CONFIG" > /dev/null 2>&1; then
                    log_warning "Server '$server' missing 'args' field"
                fi
            done
        fi
    fi
fi

# Validate agent definitions
AGENTS_DIR=".claude/agents"
if [ ! -d "$AGENTS_DIR" ]; then
    log_warning "Agents directory not found at $AGENTS_DIR"
else
    log_info "Validating agent definitions..."

    AGENT_COUNT=$(find "$AGENTS_DIR" -name "*.md" | wc -l | tr -d ' ')
    log_info "Found $AGENT_COUNT agent definition(s)"

    if [ "$AGENT_COUNT" -eq 0 ]; then
        log_warning "No agent definitions found"
    else
        # Validate each agent file
        find "$AGENTS_DIR" -name "*.md" | while read -r agent_file; do
            agent_name=$(basename "$agent_file" .md)
            log_info "Validating agent: $agent_name"

            # Check for required sections
            if ! grep -q "^# " "$agent_file"; then
                log_error "Agent '$agent_name' missing title heading"
            fi

            if ! grep -qi "description" "$agent_file"; then
                log_warning "Agent '$agent_name' missing description"
            fi
        done
    fi
fi

# Validate commands directory
COMMANDS_DIR=".claude/commands"
if [ ! -d "$COMMANDS_DIR" ]; then
    log_warning "Commands directory not found at $COMMANDS_DIR"
else
    COMMAND_COUNT=$(find "$COMMANDS_DIR" -name "*.md" | wc -l | tr -d ' ')
    log_info "Found $COMMAND_COUNT custom command(s)"
fi

# Summary
echo ""
echo "================================"
echo "MCP Validation Summary"
echo "================================"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}MCP validation failed with $ERRORS error(s)${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}MCP validation passed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "\n${GREEN}MCP validation passed successfully!${NC}"
    exit 0
fi
