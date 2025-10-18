#!/bin/bash
# Orion Project Setup Script - Initializes all optimizations

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}╔════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Orion Project Setup & Optimizer  ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════╝${NC}"
echo ""

log() {
    echo -e "${2:-$BLUE}[Setup]${NC} $1"
}

# 1. Configure git hooks
log "Configuring git hooks..." "$YELLOW"
git config core.hooksPath .githooks
log "✓ Git hooks configured" "$GREEN"

# 2. Make all scripts executable
log "Setting up executable permissions..." "$YELLOW"
chmod +x .githooks/*
chmod +x .claude/tools/*.sh
chmod +x .claude/tools/*.js
chmod +x orion
log "✓ Scripts made executable" "$GREEN"

# 3. Install Node dependencies for spec validator
log "Checking Node dependencies..." "$YELLOW"
if ! npm list chalk >/dev/null 2>&1; then
    npm install -g chalk
fi
log "✓ Dependencies ready" "$GREEN"

# 4. Create necessary directories
log "Creating directory structure..." "$YELLOW"
mkdir -p .claude/{cache,memory,logs,backups,reports,docs}
mkdir -p .claude/cache/{conversations,decisions}
mkdir -p .claude/logs/{mcp,commits}
mkdir -p .specs/{features,templates}
mkdir -p .github/ISSUE_TEMPLATE
log "✓ Directory structure created" "$GREEN"

# 5. Initialize caches and stores
log "Initializing caches..." "$YELLOW"
touch .claude/cache/commit-count.txt
echo "0" > .claude/cache/commit-count.txt
echo '{"entities": [], "relations": []}' > .claude/memory/store.json
log "✓ Caches initialized" "$GREEN"

# 6. Add orion CLI to PATH (optional)
log "Setting up Orion CLI..." "$YELLOW"
ORION_PATH="$PROJECT_ROOT"

if [[ ":$PATH:" != *":$ORION_PATH:"* ]]; then
    echo ""
    echo -e "${YELLOW}To use the 'orion' command globally, add this to your ~/.bashrc or ~/.zshrc:${NC}"
    echo -e "${CYAN}export PATH=\"\$PATH:$ORION_PATH\"${NC}"
    echo ""
fi
log "✓ Orion CLI ready (use ./orion or add to PATH)" "$GREEN"

# 7. Run initial backup
log "Creating initial backup..." "$YELLOW"
.claude/tools/auto-backup.sh incremental
log "✓ Initial backup created" "$GREEN"

# 8. Generate initial documentation
log "Generating documentation..." "$YELLOW"
.claude/tools/doc-generator.sh overview
log "✓ Documentation generated" "$GREEN"

# 9. Show MCP recommendations
echo ""
echo -e "${PURPLE}════ MCP Configuration ════${NC}"
echo ""
echo "To fully enable MCP features:"
echo ""
echo "1. ${CYAN}Serena MCP${NC} - Advanced code analysis"
echo "   Configure in Claude Desktop settings"
echo ""
echo "2. ${CYAN}GitHub MCP${NC} - Repository management"
echo "   Set GITHUB_TOKEN environment variable"
echo ""
echo "3. ${CYAN}Memory MCP${NC} - Persistent context"
echo "   Already configured at .claude/memory/"
echo ""

# 10. Display quick reference
echo -e "${PURPLE}════ Quick Reference ════${NC}"
echo ""
echo "Essential Commands:"
echo "  ${GREEN}./orion status${NC}     - Check project status"
echo "  ${GREEN}./orion commit${NC}     - Smart commit with auto-message"
echo "  ${GREEN}./orion workflow${NC}   - Run standard workflow"
echo "  ${GREEN}./orion spec <name>${NC} - Create new feature spec"
echo "  ${GREEN}./orion backup${NC}     - Create incremental backup"
echo "  ${GREEN}./orion init${NC}       - Initialize new session"
echo ""
echo "Tools:"
echo "  ${CYAN}.claude/tools/mcp-manager.sh${NC}      - Manage MCP servers"
echo "  ${CYAN}.claude/tools/spec-validator.js${NC}   - Validate specs"
echo "  ${CYAN}.claude/tools/cache-manager.sh${NC}    - Manage caches"
echo "  ${CYAN}.claude/tools/auto-backup.sh${NC}      - Backup system"
echo "  ${CYAN}.claude/tools/doc-generator.sh${NC}    - Documentation"
echo ""

# 11. Final status check
echo -e "${PURPLE}════ Setup Complete ════${NC}"
echo ""
./orion status

echo ""
echo -e "${GREEN}✅ Orion project is now fully optimized!${NC}"
echo ""
echo "Key features enabled:"
echo "  • Branch protection (main only)"
echo "  • GitHub Spec Kit methodology"
echo "  • Automated backups"
echo "  • Smart commits"
echo "  • MCP integration"
echo "  • Work loss prevention"
echo "  • Documentation generation"
echo ""
echo -e "${YELLOW}Remember:${NC}"
echo "  • All development on main branch"
echo "  • Create specs before features"
echo "  • Commit frequently (every 30 min)"
echo "  • Use './orion' commands for workflow"
echo ""
echo -e "${CYAN}Happy coding! 🚀${NC}"