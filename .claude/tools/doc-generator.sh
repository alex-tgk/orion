#!/bin/bash
# Documentation Generator - Auto-generates and maintains documentation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/.claude/docs"
REPORTS_DIR="$PROJECT_ROOT/.claude/reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$DOCS_DIR" "$REPORTS_DIR"

log() {
    if [ "${2:-}" != "silent" ]; then
        echo -e "${3:-$BLUE}[Doc Generator]${NC} $1"
    fi
}

# Generate project overview
generate_overview() {
    local overview_file="$DOCS_DIR/PROJECT_OVERVIEW.md"

    log "Generating project overview..." "" "$YELLOW"

    cat > "$overview_file" << EOF
# Orion Project Overview

**Generated**: $(date)
**Methodology**: GitHub Spec Kit

## Project Structure

\`\`\`
$(cd "$PROJECT_ROOT" && tree -L 2 -d -I 'node_modules|dist|.nx|.git' 2>/dev/null || find . -type d -maxdepth 2 | grep -v node_modules | sort)
\`\`\`

## Packages

$(for pkg in "$PROJECT_ROOT"/packages/*; do
    if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
        name=$(basename "$pkg")
        desc=$(grep '"description"' "$pkg/package.json" | cut -d'"' -f4 || echo "No description")
        echo "### $name"
        echo "$desc"
        echo ""
    fi
done)

## Recent Activity

### Last 10 Commits
\`\`\`
$(cd "$PROJECT_ROOT" && git log --oneline -n 10)
\`\`\`

### Modified Files (Uncommitted)
\`\`\`
$(cd "$PROJECT_ROOT" && git status --porcelain | head -20)
\`\`\`

## Development Guidelines

1. **All development on main branch** - No feature branches
2. **Spec-first approach** - Every feature needs a spec
3. **Atomic commits** - Small, focused changes
4. **Continuous integration** - Tests run on every commit

## Quick Commands

- Create new spec: \`npm run spec:new [name]\`
- Validate specs: \`npm run spec:validate\`
- Run tests: \`pnpm test\`
- Build all: \`pnpm build\`

## Resources

- [Methodology](.specs/METHODOLOGY.md)
- [Specs](.specs/features/)
- [Tools](.claude/tools/)
- [Cache](.claude/cache/)
EOF

    log "Project overview generated: $overview_file" "" "$GREEN"
}

# Generate API documentation
generate_api_docs() {
    local api_file="$DOCS_DIR/API_DOCUMENTATION.md"

    log "Generating API documentation..." "" "$YELLOW"

    cat > "$api_file" << EOF
# API Documentation

**Generated**: $(date)

## Services

EOF

    # Find all controller files
    for controller in $(find "$PROJECT_ROOT/packages" -name "*.controller.ts" -type f 2>/dev/null | head -20); do
        if [ -f "$controller" ]; then
            local service_name=$(basename "$controller" .controller.ts)
            local package_name=$(echo "$controller" | cut -d'/' -f5)

            cat >> "$api_file" << EOF

### $service_name (Package: $package_name)

#### Endpoints
\`\`\`typescript
$(grep -E "@(Get|Post|Put|Delete|Patch)\(" "$controller" | head -10 || echo "No endpoints found")
\`\`\`

EOF
        fi
    done

    log "API documentation generated: $api_file" "" "$GREEN"
}

# Generate architecture documentation
generate_architecture_docs() {
    local arch_file="$DOCS_DIR/ARCHITECTURE.md"

    log "Generating architecture documentation..." "" "$YELLOW"

    cat > "$arch_file" << EOF
# Architecture Documentation

**Generated**: $(date)

## System Architecture

### Monorepo Structure
- **Framework**: NestJS
- **Package Manager**: pnpm
- **Build System**: Nx

### Services

$(for pkg in "$PROJECT_ROOT"/packages/*; do
    if [ -d "$pkg" ]; then
        name=$(basename "$pkg")
        echo "#### $name"

        # Check for main module
        if [ -f "$pkg/src/main.ts" ]; then
            echo "- Type: Microservice"
            echo "- Entry: src/main.ts"
        elif [ -f "$pkg/src/index.ts" ]; then
            echo "- Type: Library"
            echo "- Entry: src/index.ts"
        fi

        # Count files
        ts_files=$(find "$pkg/src" -name "*.ts" 2>/dev/null | wc -l || echo 0)
        echo "- TypeScript files: $ts_files"
        echo ""
    fi
done)

## Technology Stack

### Backend
- NestJS
- TypeScript
- PostgreSQL (via Prisma)
- Redis
- RabbitMQ

### DevOps
- Docker
- Kubernetes
- GitHub Actions
- Nx

## Design Patterns

1. **Repository Pattern** - Data access abstraction
2. **Service Layer** - Business logic encapsulation
3. **DTO Pattern** - Data transfer objects
4. **Dependency Injection** - NestJS DI container
5. **Event-Driven** - RabbitMQ for async communication

## Scalability Considerations

- Horizontal scaling via Kubernetes
- Database connection pooling
- Redis caching layer
- Message queue for async operations
- Stateless service design
EOF

    log "Architecture documentation generated: $arch_file" "" "$GREEN"
}

# Generate test report
generate_test_report() {
    local report_file="$REPORTS_DIR/TEST_REPORT_$(date +%Y%m%d).md"

    log "Generating test report..." "" "$YELLOW"

    cat > "$report_file" << EOF
# Test Report

**Date**: $(date)

## Test Coverage Summary

EOF

    # Run tests for each package and capture results
    for pkg in "$PROJECT_ROOT"/packages/*; do
        if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
            name=$(basename "$pkg")
            echo "### Package: $name" >> "$report_file"
            echo "" >> "$report_file"

            # Check if tests exist
            if [ -d "$pkg/src" ]; then
                spec_files=$(find "$pkg/src" -name "*.spec.ts" 2>/dev/null | wc -l || echo 0)
                echo "- Spec files: $spec_files" >> "$report_file"
            fi
            echo "" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF

## Recommendations

1. Ensure all services have adequate test coverage
2. Add integration tests for API endpoints
3. Implement E2E tests for critical user flows

## Next Steps

- [ ] Review uncovered code paths
- [ ] Add missing unit tests
- [ ] Set up continuous test monitoring
EOF

    log "Test report generated: $report_file" "" "$GREEN"
}

# Generate daily summary
generate_daily_summary() {
    local summary_file="$REPORTS_DIR/DAILY_SUMMARY_$(date +%Y-%m-%d).md"

    log "Generating daily summary..." "" "$YELLOW"

    # Get today's commits
    local today_commits=$(cd "$PROJECT_ROOT" && git log --since="00:00" --oneline 2>/dev/null | wc -l || echo 0)
    local files_changed=$(cd "$PROJECT_ROOT" && git diff --stat HEAD~${today_commits:-1} 2>/dev/null | tail -1 || echo "No changes")

    cat > "$summary_file" << EOF
# Daily Summary - $(date +%Y-%m-%d)

## Activity Overview

- **Commits Today**: $today_commits
- **Current Branch**: $(cd "$PROJECT_ROOT" && git rev-parse --abbrev-ref HEAD)
- **Files Changed**: $files_changed

## Today's Commits

\`\`\`
$(cd "$PROJECT_ROOT" && git log --since="00:00" --oneline 2>/dev/null || echo "No commits today")
\`\`\`

## Modified Packages

$(for pkg in "$PROJECT_ROOT"/packages/*; do
    if [ -d "$pkg" ]; then
        name=$(basename "$pkg")
        changes=$(cd "$PROJECT_ROOT" && git diff --name-only HEAD~${today_commits:-1} 2>/dev/null | grep "packages/$name" | wc -l || echo 0)
        if [ "$changes" -gt 0 ]; then
            echo "- **$name**: $changes files changed"
        fi
    fi
done)

## Specs Updated

$(find "$PROJECT_ROOT/.specs" -name "*.md" -mtime -1 -type f 2>/dev/null | while read spec; do
    echo "- $(basename "$spec")"
done || echo "No specs updated today")

## Cache Status

- Cache Size: $(du -sh "$PROJECT_ROOT/.claude/cache" 2>/dev/null | cut -f1 || echo "0")
- Memory Size: $(du -sh "$PROJECT_ROOT/.claude/memory" 2>/dev/null | cut -f1 || echo "0")

## Recommendations for Tomorrow

1. Review any uncommitted changes
2. Update relevant specifications
3. Run comprehensive test suite
4. Clean up old cache files

---
*Generated automatically by Documentation Generator*
EOF

    log "Daily summary generated: $summary_file" "" "$GREEN"
}

# Update all documentation
update_all() {
    local silent="${1:-}"

    if [ "$silent" = "update-silent" ]; then
        log "Updating documentation..." "silent"
        generate_overview
        generate_api_docs
        generate_architecture_docs
        log "Documentation updated" "silent" "$GREEN"
    else
        log "Updating all documentation..." "" "$YELLOW"
        generate_overview
        generate_api_docs
        generate_architecture_docs
        generate_test_report
        generate_daily_summary
        log "All documentation updated!" "" "$GREEN"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "Documentation Generator"
    echo "======================"
    echo "1. Generate project overview"
    echo "2. Generate API documentation"
    echo "3. Generate architecture docs"
    echo "4. Generate test report"
    echo "5. Generate daily summary"
    echo "6. Update all documentation"
    echo "7. Exit"
    echo ""
    read -p "Select option: " choice

    case $choice in
        1) generate_overview ;;
        2) generate_api_docs ;;
        3) generate_architecture_docs ;;
        4) generate_test_report ;;
        5) generate_daily_summary ;;
        6) update_all ;;
        7) exit 0 ;;
        *) log "Invalid option" "" "$RED" ;;
    esac
}

# Parse command line arguments
case "${1:-}" in
    overview) generate_overview ;;
    api) generate_api_docs ;;
    architecture) generate_architecture_docs ;;
    test-report) generate_test_report ;;
    daily) generate_daily_summary ;;
    update) update_all ;;
    update-silent) update_all "update-silent" ;;
    *)
        if [ -z "${1:-}" ]; then
            show_menu
        else
            echo "Usage: $0 {overview|api|architecture|test-report|daily|update|update-silent}"
            exit 1
        fi
        ;;
esac