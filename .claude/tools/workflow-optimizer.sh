#!/bin/bash
# Workflow Optimizer - Streamlines development workflow

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TOOLS_DIR="$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${2:-$BLUE}[Workflow]${NC} $1"
}

# Quick status check
quick_status() {
    echo -e "${CYAN}═══ Orion Project Status ═══${NC}"
    echo ""

    # Git status
    echo -e "${YELLOW}Git Status:${NC}"
    local branch=$(git rev-parse --abbrev-ref HEAD)
    local modified=$(git status --porcelain | wc -l)
    local ahead=$(git rev-list --count origin/$branch..$branch 2>/dev/null || echo "0")

    echo "  Branch: $branch"
    echo "  Modified files: $modified"
    echo "  Commits ahead: $ahead"

    # MCP status
    echo ""
    echo -e "${YELLOW}MCP Status:${NC}"
    if [ -f "$PROJECT_ROOT/.claude/mcp-config.json" ]; then
        echo "  ✓ Configuration exists"
    else
        echo "  ✗ Configuration missing"
    fi

    # Spec status
    echo ""
    echo -e "${YELLOW}Specs Status:${NC}"
    local spec_count=$(find "$PROJECT_ROOT/.specs" -name "*.md" -type f 2>/dev/null | wc -l || echo "0")
    local recent_specs=$(find "$PROJECT_ROOT/.specs" -name "*.md" -mtime -1 -type f 2>/dev/null | wc -l || echo "0")
    echo "  Total specs: $spec_count"
    echo "  Recent specs (24h): $recent_specs"

    # Test status
    echo ""
    echo -e "${YELLOW}Test Status:${NC}"
    local total_specs=$(find "$PROJECT_ROOT" -name "*.spec.ts" -not -path "*/node_modules/*" | wc -l || echo "0")
    echo "  Test files: $total_specs"

    # Backup status
    echo ""
    echo -e "${YELLOW}Backup Status:${NC}"
    local last_backup=$(ls -t "$PROJECT_ROOT/.claude/backups" 2>/dev/null | head -1 || echo "None")
    echo "  Last backup: $last_backup"
}

# Smart commit with auto-message generation
smart_commit() {
    log "Analyzing changes for smart commit..." "$YELLOW"

    # Get changed files
    local changed_files=$(git status --porcelain)

    if [ -z "$changed_files" ]; then
        log "No changes to commit" "$BLUE"
        return
    fi

    # Analyze changes to generate commit message
    local packages_changed=$(git status --porcelain | grep -oE "packages/[^/]+" | sort -u | cut -d'/' -f2 | tr '\n' ',' | sed 's/,$//')
    local file_types=$(git status --porcelain | grep -oE "\.[a-z]+$" | sort -u | tr '\n' ',' | sed 's/,$//')

    # Determine commit type
    local commit_type="chore"
    if echo "$changed_files" | grep -q "\.spec\.ts"; then
        commit_type="test"
    elif echo "$changed_files" | grep -q "packages/.*/src"; then
        commit_type="feat"
    elif echo "$changed_files" | grep -q "\.md$"; then
        commit_type="docs"
    fi

    # Generate commit message
    local commit_msg="$commit_type"

    if [ ! -z "$packages_changed" ]; then
        commit_msg="$commit_msg($packages_changed)"
    fi

    commit_msg="$commit_msg: update"

    if [ ! -z "$file_types" ]; then
        commit_msg="$commit_msg $file_types files"
    fi

    echo ""
    echo "Generated commit message: $commit_msg"
    echo ""
    read -p "Use this message? (y/n/edit): " choice

    case $choice in
        y|Y)
            git add -A
            git commit -m "$commit_msg"
            log "Committed with generated message" "$GREEN"
            ;;
        e|edit)
            read -p "Enter commit message: " custom_msg
            git add -A
            git commit -m "$custom_msg"
            log "Committed with custom message" "$GREEN"
            ;;
        *)
            log "Commit cancelled" "$YELLOW"
            ;;
    esac
}

# Workflow automation
run_workflow() {
    local workflow_type="${1:-standard}"

    log "Running $workflow_type workflow..." "$PURPLE"

    case $workflow_type in
        standard)
            # Standard development workflow
            log "1. Checking git status..." "$CYAN"
            git status --short

            log "2. Running tests..." "$CYAN"
            pnpm test 2>/dev/null || log "Some tests failed" "$YELLOW"

            log "3. Running linter..." "$CYAN"
            pnpm lint 2>/dev/null || log "Linting issues found" "$YELLOW"

            log "4. Creating backup..." "$CYAN"
            "$TOOLS_DIR/auto-backup.sh" incremental

            log "5. Updating documentation..." "$CYAN"
            "$TOOLS_DIR/doc-generator.sh" update-silent

            log "Workflow complete!" "$GREEN"
            ;;

        feature)
            # Feature development workflow
            log "Starting feature development workflow..." "$CYAN"

            # Create spec
            read -p "Feature name: " feature_name
            node "$TOOLS_DIR/spec-validator.js" new "$feature_name"

            # Create issue template
            local issue_file="$PROJECT_ROOT/.github/ISSUE_TEMPLATE/feature-${feature_name}.md"
            mkdir -p "$(dirname "$issue_file")"

            cat > "$issue_file" << EOF
---
name: Feature - $feature_name
about: Implementation of $feature_name
title: "[FEAT] $feature_name"
labels: feature
assignees: ''
---

## Feature Description
Implementation of $feature_name as specified in SPEC-$(date +%Y-%m-%d)-XXX

## Acceptance Criteria
- [ ] Spec approved
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated

## Technical Notes
See spec for implementation details.
EOF

            log "Feature workflow initialized" "$GREEN"
            echo "Next steps:"
            echo "1. Complete the spec in .specs/features/"
            echo "2. Create GitHub issue from template"
            echo "3. Begin implementation"
            ;;

        release)
            # Release workflow
            log "Starting release workflow..." "$CYAN"

            # Check uncommitted changes
            if [ -n "$(git status --porcelain)" ]; then
                log "Uncommitted changes detected!" "$RED"
                read -p "Commit changes first? (y/n): " commit_first
                if [ "$commit_first" = "y" ]; then
                    smart_commit
                fi
            fi

            # Run full test suite
            log "Running full test suite..." "$CYAN"
            pnpm test

            # Create full backup
            log "Creating release backup..." "$CYAN"
            "$TOOLS_DIR/auto-backup.sh" full

            # Generate release documentation
            log "Generating release docs..." "$CYAN"
            "$TOOLS_DIR/doc-generator.sh" update

            log "Release workflow complete!" "$GREEN"
            ;;

        *)
            log "Unknown workflow type: $workflow_type" "$RED"
            ;;
    esac
}

# Quick commands
quick_command() {
    local cmd="$1"
    shift

    case $cmd in
        spec)
            # Quick spec creation
            node "$TOOLS_DIR/spec-validator.js" new "$@"
            ;;
        backup)
            # Quick backup
            "$TOOLS_DIR/auto-backup.sh" incremental
            ;;
        cache)
            # Quick cache
            "$TOOLS_DIR/cache-manager.sh" state
            ;;
        doc)
            # Quick documentation
            "$TOOLS_DIR/doc-generator.sh" daily
            ;;
        test)
            # Quick test
            pnpm test
            ;;
        validate)
            # Validate everything
            log "Running validation suite..." "$YELLOW"
            node "$TOOLS_DIR/spec-validator.js" validate
            git status
            ;;
        *)
            log "Unknown command: $cmd" "$RED"
            ;;
    esac
}

# Initialize project for new session
init_session() {
    log "Initializing new development session..." "$PURPLE"

    # 1. Set up git hooks
    log "Configuring git hooks..." "$CYAN"
    git config core.hooksPath .githooks

    # 2. Check MCP configuration
    log "Checking MCP configuration..." "$CYAN"
    if [ -x "$TOOLS_DIR/mcp-manager.sh" ]; then
        "$TOOLS_DIR/mcp-manager.sh" status
    fi

    # 3. Create session backup
    log "Creating session backup..." "$CYAN"
    "$TOOLS_DIR/auto-backup.sh" incremental

    # 4. Generate fresh documentation
    log "Updating documentation..." "$CYAN"
    "$TOOLS_DIR/doc-generator.sh" overview

    # 5. Cache initial state
    log "Caching initial state..." "$CYAN"
    "$TOOLS_DIR/cache-manager.sh" state

    # 6. Show status
    echo ""
    quick_status

    log "Session initialized successfully!" "$GREEN"
    echo ""
    echo "Quick commands available:"
    echo "  orion spec <name>   - Create new spec"
    echo "  orion backup        - Create backup"
    echo "  orion test          - Run tests"
    echo "  orion commit        - Smart commit"
    echo "  orion workflow      - Run workflow"
}

# Main menu
show_menu() {
    echo ""
    echo -e "${CYAN}═══ Orion Workflow Optimizer ═══${NC}"
    echo ""
    echo "1. Quick Status"
    echo "2. Smart Commit"
    echo "3. Run Standard Workflow"
    echo "4. Run Feature Workflow"
    echo "5. Run Release Workflow"
    echo "6. Initialize Session"
    echo "7. Validate Everything"
    echo "8. Quick Commands"
    echo "9. Exit"
    echo ""
    read -p "Select option: " choice

    case $choice in
        1) quick_status ;;
        2) smart_commit ;;
        3) run_workflow standard ;;
        4) run_workflow feature ;;
        5) run_workflow release ;;
        6) init_session ;;
        7) quick_command validate ;;
        8)
            echo "Available: spec, backup, cache, doc, test, validate"
            read -p "Command: " cmd
            read -p "Arguments: " args
            quick_command "$cmd" $args
            ;;
        9) exit 0 ;;
        *) log "Invalid option" "$RED" ;;
    esac
}

# Parse command line arguments
case "${1:-}" in
    status) quick_status ;;
    commit) smart_commit ;;
    workflow) run_workflow "${2:-standard}" ;;
    init) init_session ;;
    spec) shift; quick_command spec "$@" ;;
    backup) quick_command backup ;;
    cache) quick_command cache ;;
    doc) quick_command doc ;;
    test) quick_command test ;;
    validate) quick_command validate ;;
    *)
        if [ -z "${1:-}" ]; then
            show_menu
        else
            echo "Usage: $0 {status|commit|workflow|init|spec|backup|cache|doc|test|validate}"
            exit 1
        fi
        ;;
esac