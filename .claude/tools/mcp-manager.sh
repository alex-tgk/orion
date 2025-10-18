#!/bin/bash
# MCP Manager - Manages Model Context Protocol servers for the Orion project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MCP_CONFIG="$PROJECT_ROOT/.claude/mcp-config.json"
MCP_LOG_DIR="$PROJECT_ROOT/.claude/logs/mcp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p "$MCP_LOG_DIR"

# Function to log messages
log() {
    echo -e "${2:-$BLUE}[MCP Manager]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$MCP_LOG_DIR/manager.log"
}

# Function to check if an MCP server is installed
check_mcp_installed() {
    local server_name=$1
    if npm list -g "@modelcontextprotocol/server-$server_name" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to install MCP servers
install_mcp_servers() {
    log "Installing MCP servers..." "$YELLOW"

    local servers=("filesystem" "github" "memory" "puppeteer" "sequential-thinking" "fetch")

    for server in "${servers[@]}"; do
        if check_mcp_installed "$server"; then
            log "✓ $server server already installed" "$GREEN"
        else
            log "Installing $server server..." "$YELLOW"
            npm install -g "@modelcontextprotocol/server-$server" || {
                log "Failed to install $server server" "$RED"
                return 1
            }
            log "✓ $server server installed" "$GREEN"
        fi
    done

    log "All MCP servers installed successfully!" "$GREEN"
}

# Function to configure environment
configure_environment() {
    log "Configuring MCP environment..." "$YELLOW"

    # Check for GitHub token
    if [ -z "$GITHUB_TOKEN" ]; then
        log "⚠️  GITHUB_TOKEN not set. GitHub MCP features will be limited." "$YELLOW"
        read -p "Enter your GitHub token (or press Enter to skip): " token
        if [ ! -z "$token" ]; then
            echo "export GITHUB_TOKEN='$token'" >> ~/.bashrc
            echo "export GITHUB_TOKEN='$token'" >> ~/.zshrc 2>/dev/null || true
            export GITHUB_TOKEN="$token"
            log "✓ GitHub token configured" "$GREEN"
        fi
    else
        log "✓ GitHub token already configured" "$GREEN"
    fi

    # Set up memory store
    local memory_store="$PROJECT_ROOT/.claude/memory/store.json"
    if [ ! -f "$memory_store" ]; then
        mkdir -p "$(dirname "$memory_store")"
        echo '{"entities": [], "relations": []}' > "$memory_store"
        log "✓ Memory store initialized" "$GREEN"
    else
        log "✓ Memory store already exists" "$GREEN"
    fi
}

# Function to validate MCP configuration
validate_config() {
    log "Validating MCP configuration..." "$YELLOW"

    if [ ! -f "$MCP_CONFIG" ]; then
        log "MCP configuration file not found!" "$RED"
        return 1
    fi

    # Validate JSON syntax
    if ! python3 -m json.tool "$MCP_CONFIG" > /dev/null 2>&1; then
        log "Invalid JSON in MCP configuration!" "$RED"
        return 1
    fi

    log "✓ Configuration valid" "$GREEN"
    return 0
}

# Function to start MCP servers
start_servers() {
    log "Starting MCP servers..." "$YELLOW"

    # This is a placeholder - actual server startup would depend on the MCP implementation
    log "MCP servers configured for on-demand activation" "$GREEN"
    log "Servers will start automatically when needed by Claude" "$BLUE"
}

# Function to check server status
check_status() {
    log "Checking MCP server status..." "$YELLOW"

    echo ""
    echo "Installed MCP Servers:"
    echo "----------------------"

    local servers=("filesystem" "github" "memory" "puppeteer" "sequential-thinking" "fetch")

    for server in "${servers[@]}"; do
        if check_mcp_installed "$server"; then
            echo -e "${GREEN}✓${NC} $server"
        else
            echo -e "${RED}✗${NC} $server"
        fi
    done

    echo ""
    echo "Configuration Status:"
    echo "--------------------"

    if [ -f "$MCP_CONFIG" ]; then
        echo -e "${GREEN}✓${NC} Configuration file exists"
    else
        echo -e "${RED}✗${NC} Configuration file missing"
    fi

    if [ ! -z "$GITHUB_TOKEN" ]; then
        echo -e "${GREEN}✓${NC} GitHub token configured"
    else
        echo -e "${YELLOW}⚠${NC} GitHub token not configured"
    fi

    local memory_store="$PROJECT_ROOT/.claude/memory/store.json"
    if [ -f "$memory_store" ]; then
        echo -e "${GREEN}✓${NC} Memory store initialized"
    else
        echo -e "${RED}✗${NC} Memory store not initialized"
    fi
}

# Function to display recommendations
show_recommendations() {
    log "MCP Recommendations for current context:" "$BLUE"
    echo ""
    echo "Based on your project structure, consider using:"
    echo ""
    echo "1. ${GREEN}Serena MCP${NC} - For advanced code analysis and refactoring"
    echo "   Status: Configure in Claude settings"
    echo ""
    echo "2. ${GREEN}GitHub MCP${NC} - For repository management and PR workflows"
    echo "   Status: Ready (token required)"
    echo ""
    echo "3. ${GREEN}Memory MCP${NC} - For persistent context across sessions"
    echo "   Status: Ready"
    echo ""
    echo "4. ${GREEN}Sequential Thinking MCP${NC} - For complex problem solving"
    echo "   Status: Ready"
    echo ""
    echo "5. ${GREEN}Filesystem MCP${NC} - For file operations"
    echo "   Status: Ready"
    echo ""
    echo "To activate these in Claude, ensure they're configured in your Claude desktop app settings."
}

# Main menu
show_menu() {
    echo ""
    echo "MCP Manager for Orion Project"
    echo "=============================="
    echo "1. Install MCP servers"
    echo "2. Configure environment"
    echo "3. Validate configuration"
    echo "4. Check status"
    echo "5. Show recommendations"
    echo "6. Full setup (all of the above)"
    echo "7. Exit"
    echo ""
    read -p "Select option: " choice

    case $choice in
        1) install_mcp_servers ;;
        2) configure_environment ;;
        3) validate_config ;;
        4) check_status ;;
        5) show_recommendations ;;
        6)
            install_mcp_servers
            configure_environment
            validate_config
            check_status
            show_recommendations
            ;;
        7) exit 0 ;;
        *) log "Invalid option" "$RED" ;;
    esac
}

# Parse command line arguments
case "${1:-}" in
    install) install_mcp_servers ;;
    configure) configure_environment ;;
    validate) validate_config ;;
    status) check_status ;;
    recommend) show_recommendations ;;
    setup)
        install_mcp_servers
        configure_environment
        validate_config
        check_status
        show_recommendations
        ;;
    *)
        if [ -z "${1:-}" ]; then
            show_menu
        else
            echo "Usage: $0 {install|configure|validate|status|recommend|setup}"
            exit 1
        fi
        ;;
esac