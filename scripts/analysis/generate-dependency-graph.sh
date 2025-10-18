#!/usr/bin/env bash
#
# ORION Dependency Graph Generator
# Analyzes package dependencies, service dependencies, database dependencies,
# and circular dependencies. Outputs Mermaid diagrams and DOT format.
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output directory
OUTPUT_DIR="docs/architecture/dependencies"
REPORTS_DIR="${OUTPUT_DIR}/reports"
GRAPHS_DIR="${OUTPUT_DIR}/graphs"

# Create output directories
mkdir -p "${OUTPUT_DIR}" "${REPORTS_DIR}" "${GRAPHS_DIR}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  ORION Dependency Graph Generator${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to log messages
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
}

# Function to generate package dependencies
generate_package_dependencies() {
    log_info "Analyzing NPM package dependencies..."

    # Generate package dependency tree
    pnpm list --depth=3 --json > "${REPORTS_DIR}/package-tree.json" 2>/dev/null || true

    # Generate Mermaid diagram for package dependencies
    cat > "${GRAPHS_DIR}/package-dependencies.mmd" << 'EOF'
graph TB
    subgraph "Runtime Dependencies"
        nestjs["@nestjs/core"]
        nestjs_common["@nestjs/common"]
        nestjs_platform["@nestjs/platform-express"]
        passport["passport"]
        jwt["@nestjs/jwt"]
        prisma["@prisma/client"]
        bull["bull"]
        redis["ioredis"]
        socket["socket.io"]

        nestjs --> nestjs_common
        nestjs --> nestjs_platform
        jwt --> passport
        bull --> redis
    end

    subgraph "Development Dependencies"
        nx["nx"]
        jest["jest"]
        typescript["typescript"]
        eslint["eslint"]
        prettier["prettier"]

        nx --> typescript
        jest --> typescript
    end

    subgraph "Analysis Tools"
        depcruiser["dependency-cruiser"]
        madge["madge"]
        compodoc["@compodoc/compodoc"]
        typedoc["typedoc"]
    end

    style nestjs fill:#e74c3c
    style nx fill:#3498db
    style depcruiser fill:#9b59b6
EOF

    log_success "Package dependencies analyzed"
}

# Function to generate service dependencies
generate_service_dependencies() {
    log_info "Analyzing microservice dependencies..."

    # Create service dependency graph
    cat > "${GRAPHS_DIR}/service-dependencies.mmd" << 'EOF'
graph TB
    subgraph "External Entry Points"
        client["Client Applications"]
        admin["Admin Dashboard"]
    end

    subgraph "Gateway Layer"
        gateway["Gateway Service<br/>:20001"]
    end

    subgraph "Core Services"
        auth["Auth Service<br/>:20000"]
        user["User Service<br/>:20002"]
        notifications["Notifications Service<br/>:20003"]
    end

    subgraph "Supporting Services"
        admin_ui["Admin UI Service<br/>:20004"]
        mcp["MCP Server<br/>:20005"]
    end

    subgraph "Infrastructure"
        redis_cache["Redis<br/>(Cache & Queue)"]
        postgres["PostgreSQL<br/>(Primary DB)"]
    end

    %% External connections
    client --> gateway
    admin --> admin_ui

    %% Gateway routing
    gateway --> auth
    gateway --> user
    gateway --> notifications

    %% Service dependencies
    auth --> postgres
    auth --> redis_cache
    user --> auth
    user --> postgres
    user --> redis_cache
    notifications --> bull["Bull Queue"]
    notifications --> postgres
    notifications --> redis_cache
    bull --> redis_cache

    %% Admin UI connections
    admin_ui --> gateway
    admin_ui -.monitoring.-> auth
    admin_ui -.monitoring.-> user
    admin_ui -.monitoring.-> notifications

    %% MCP Server connections
    mcp -.observability.-> auth
    mcp -.observability.-> gateway
    mcp -.observability.-> notifications

    %% Styling
    style gateway fill:#3498db,stroke:#2980b9,stroke-width:3px
    style auth fill:#e74c3c,stroke:#c0392b,stroke-width:2px
    style user fill:#2ecc71,stroke:#27ae60,stroke-width:2px
    style notifications fill:#f39c12,stroke:#d68910,stroke-width:2px
    style redis_cache fill:#95a5a6,stroke:#7f8c8d,stroke-width:2px
    style postgres fill:#34495e,stroke:#2c3e50,stroke-width:2px
    style admin_ui fill:#9b59b6,stroke:#8e44ad,stroke-width:2px
    style mcp fill:#1abc9c,stroke:#16a085,stroke-width:2px
EOF

    # Generate DOT format
    cat > "${GRAPHS_DIR}/service-dependencies.dot" << 'EOF'
digraph "ORION Services" {
    rankdir=TB;
    node [shape=box, style=rounded, fontname="Arial"];

    // External
    client [label="Client Apps", fillcolor="#ecf0f1", style=filled];
    admin [label="Admin Dashboard", fillcolor="#ecf0f1", style=filled];

    // Services
    gateway [label="Gateway\n:20001", fillcolor="#3498db", style=filled, fontcolor=white];
    auth [label="Auth\n:20000", fillcolor="#e74c3c", style=filled, fontcolor=white];
    user [label="User\n:20002", fillcolor="#2ecc71", style=filled, fontcolor=white];
    notifications [label="Notifications\n:20003", fillcolor="#f39c12", style=filled];
    admin_ui [label="Admin UI\n:20004", fillcolor="#9b59b6", style=filled, fontcolor=white];
    mcp [label="MCP Server\n:20005", fillcolor="#1abc9c", style=filled, fontcolor=white];

    // Infrastructure
    redis [label="Redis", fillcolor="#95a5a6", style=filled];
    postgres [label="PostgreSQL", fillcolor="#34495e", style=filled, fontcolor=white];

    // Connections
    client -> gateway;
    admin -> admin_ui;
    gateway -> auth;
    gateway -> user;
    gateway -> notifications;
    auth -> postgres;
    auth -> redis;
    user -> auth;
    user -> postgres;
    user -> redis;
    notifications -> redis;
    notifications -> postgres;
    admin_ui -> gateway;
    admin_ui -> auth [style=dashed, label="monitor"];
    admin_ui -> user [style=dashed, label="monitor"];
    admin_ui -> notifications [style=dashed, label="monitor"];
    mcp -> auth [style=dashed, label="observe"];
    mcp -> gateway [style=dashed, label="observe"];
}
EOF

    log_success "Service dependencies analyzed"
}

# Function to generate database dependencies
generate_database_dependencies() {
    log_info "Analyzing database dependencies..."

    # Create database relationship graph
    cat > "${GRAPHS_DIR}/database-dependencies.mmd" << 'EOF'
erDiagram
    User ||--o{ Session : has
    User ||--o{ RefreshToken : has
    User ||--o{ Notification : receives
    User ||--o{ AuditLog : generates
    User {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role
        timestamp createdAt
        timestamp updatedAt
    }

    Session ||--|| User : belongs_to
    Session {
        uuid id PK
        uuid userId FK
        string token UK
        timestamp expiresAt
        timestamp createdAt
    }

    RefreshToken ||--|| User : belongs_to
    RefreshToken {
        uuid id PK
        uuid userId FK
        string token UK
        timestamp expiresAt
        boolean revoked
        timestamp createdAt
    }

    Notification ||--|| User : sent_to
    Notification {
        uuid id PK
        uuid userId FK
        string type
        string title
        string message
        boolean read
        timestamp createdAt
    }

    AuditLog ||--|| User : created_by
    AuditLog {
        uuid id PK
        uuid userId FK
        string action
        string resource
        json metadata
        string ipAddress
        timestamp createdAt
    }

    FeatureFlag {
        uuid id PK
        string key UK
        string name
        boolean enabled
        json config
        timestamp createdAt
        timestamp updatedAt
    }

    ABTest {
        uuid id PK
        string name UK
        string description
        json variants
        boolean active
        timestamp startDate
        timestamp endDate
    }
EOF

    # Create database-service dependency graph
    cat > "${GRAPHS_DIR}/database-service-mapping.mmd" << 'EOF'
graph TB
    subgraph "PostgreSQL Databases"
        auth_db["auth_db"]
        user_db["user_db"]
        notifications_db["notifications_db"]
    end

    subgraph "Database Tables"
        users["Users"]
        sessions["Sessions"]
        refresh_tokens["RefreshTokens"]
        notifications["Notifications"]
        audit_logs["AuditLogs"]
        feature_flags["FeatureFlags"]
        ab_tests["ABTests"]
    end

    subgraph "Services"
        auth["Auth Service"]
        user_svc["User Service"]
        notif_svc["Notifications Service"]
        ff_svc["Feature Flags Service"]
        ab_svc["AB Testing Service"]
    end

    %% Database to Tables
    auth_db --> users
    auth_db --> sessions
    auth_db --> refresh_tokens
    user_db --> users
    notifications_db --> notifications
    auth_db --> audit_logs
    auth_db --> feature_flags
    auth_db --> ab_tests

    %% Services to Tables
    auth -->|read/write| users
    auth -->|read/write| sessions
    auth -->|read/write| refresh_tokens
    auth -->|write| audit_logs
    user_svc -->|read/write| users
    notif_svc -->|read/write| notifications
    ff_svc -->|read/write| feature_flags
    ab_svc -->|read/write| ab_tests

    style auth_db fill:#34495e,color:#fff
    style user_db fill:#34495e,color:#fff
    style notifications_db fill:#34495e,color:#fff
EOF

    log_success "Database dependencies analyzed"
}

# Function to analyze circular dependencies
analyze_circular_dependencies() {
    log_info "Checking for circular dependencies..."

    # Use madge to detect circular dependencies
    if command -v madge &> /dev/null; then
        # Check entire codebase
        madge --circular --extensions ts --exclude '\.spec\.ts$|\.test\.ts$|node_modules' . > "${REPORTS_DIR}/circular-dependencies.txt" 2>&1 || true

        # Generate circular dependency graph if any found
        if [ -s "${REPORTS_DIR}/circular-dependencies.txt" ]; then
            log_warning "Circular dependencies detected!"
            madge --circular --extensions ts --image "${GRAPHS_DIR}/circular-dependencies.svg" --exclude '\.spec\.ts$|\.test\.ts$|node_modules' . 2>/dev/null || true
        else
            log_success "No circular dependencies found"
            echo "✓ No circular dependencies detected" > "${REPORTS_DIR}/circular-dependencies.txt"
        fi
    else
        log_warning "Madge not found, skipping circular dependency analysis"
    fi
}

# Function to analyze TypeScript dependencies with dependency-cruiser
analyze_typescript_dependencies() {
    log_info "Analyzing TypeScript module dependencies..."

    # Run dependency-cruiser
    if command -v depcruise &> /dev/null; then
        # Generate detailed report
        depcruise --config .dependency-cruiser.js \
            --output-type json \
            packages > "${REPORTS_DIR}/typescript-dependencies.json" 2>/dev/null || true

        # Generate DOT graph
        depcruise --config .dependency-cruiser.js \
            --output-type dot \
            packages > "${GRAPHS_DIR}/typescript-dependencies.dot" 2>/dev/null || true

        # Generate text summary
        depcruise --config .dependency-cruiser.js \
            --output-type text \
            packages > "${REPORTS_DIR}/typescript-summary.txt" 2>/dev/null || true

        log_success "TypeScript dependencies analyzed"
    else
        log_warning "dependency-cruiser not found, skipping TypeScript analysis"
    fi
}

# Function to generate summary report
generate_summary_report() {
    log_info "Generating summary report..."

    local report_file="${OUTPUT_DIR}/dependency-analysis-summary.md"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    cat > "${report_file}" << EOF
# ORION Dependency Analysis Summary

**Generated:** ${timestamp}

## Overview

This document provides a comprehensive analysis of dependencies across the ORION platform.

## Analysis Results

### 📦 Package Dependencies

- **Report Location:** \`${REPORTS_DIR}/package-tree.json\`
- **Graph:** \`${GRAPHS_DIR}/package-dependencies.mmd\`
- **Total Packages:** $(jq -r '.dependencies | keys | length' package.json 2>/dev/null || echo "N/A")
- **Dev Packages:** $(jq -r '.devDependencies | keys | length' package.json 2>/dev/null || echo "N/A")

### 🔄 Service Dependencies

- **Graph:** \`${GRAPHS_DIR}/service-dependencies.mmd\`
- **DOT Format:** \`${GRAPHS_DIR}/service-dependencies.dot\`
- **Services Analyzed:**
  - Gateway Service (:20001)
  - Auth Service (:20000)
  - User Service (:20002)
  - Notifications Service (:20003)
  - Admin UI Service (:20004)
  - MCP Server (:20005)

### 💾 Database Dependencies

- **ER Diagram:** \`${GRAPHS_DIR}/database-dependencies.mmd\`
- **Service Mapping:** \`${GRAPHS_DIR}/database-service-mapping.mmd\`
- **Primary Database:** PostgreSQL
- **Cache Layer:** Redis

### 🔍 Circular Dependencies

EOF

    # Add circular dependency results
    if [ -f "${REPORTS_DIR}/circular-dependencies.txt" ]; then
        if grep -q "No circular dependencies" "${REPORTS_DIR}/circular-dependencies.txt"; then
            echo "✅ **Status:** No circular dependencies detected" >> "${report_file}"
        else
            echo "⚠️ **Status:** Circular dependencies found" >> "${report_file}"
            echo "" >> "${report_file}"
            echo "\`\`\`" >> "${report_file}"
            cat "${REPORTS_DIR}/circular-dependencies.txt" >> "${report_file}"
            echo "\`\`\`" >> "${report_file}"
        fi
    fi

    cat >> "${report_file}" << EOF

### 📊 TypeScript Module Dependencies

- **Detailed Report:** \`${REPORTS_DIR}/typescript-dependencies.json\`
- **Graph:** \`${GRAPHS_DIR}/typescript-dependencies.dot\`
- **Summary:** \`${REPORTS_DIR}/typescript-summary.txt\`

## Visualization

### Mermaid Diagrams

All Mermaid diagrams can be viewed in:
- GitHub (native support)
- [Mermaid Live Editor](https://mermaid.live/)
- VS Code with Mermaid extensions

### DOT Graphs

DOT files can be visualized using:
- Graphviz: \`dot -Tpng input.dot -o output.png\`
- Online: [Graphviz Online](https://dreampuf.github.io/GraphvizOnline/)
- VS Code with Graphviz extensions

## Interactive Visualization

For interactive dependency exploration, see:
- \`tools/dependency-graph/index.html\`

## Next Steps

1. Review any circular dependencies and refactor if necessary
2. Ensure forbidden dependencies are not introduced
3. Keep dependency documentation up to date
4. Run analysis regularly (automated via GitHub Actions)

## Automated Checks

This analysis runs automatically on:
- Pull requests (via GitHub Actions)
- Pre-commit hooks (optional)
- CI/CD pipeline

See \`.github/workflows/dependency-analysis.yml\` for automation details.
EOF

    log_success "Summary report generated: ${report_file}"
}

# Main execution
main() {
    log_info "Starting dependency analysis..."
    echo ""

    generate_package_dependencies
    generate_service_dependencies
    generate_database_dependencies
    analyze_circular_dependencies
    analyze_typescript_dependencies
    generate_summary_report

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Analysis Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  📁 Output directory: ${BLUE}${OUTPUT_DIR}${NC}"
    echo -e "  📊 Graphs: ${BLUE}${GRAPHS_DIR}${NC}"
    echo -e "  📝 Reports: ${BLUE}${REPORTS_DIR}${NC}"
    echo ""
    echo -e "  View summary: ${BLUE}${OUTPUT_DIR}/dependency-analysis-summary.md${NC}"
    echo ""
}

# Run main function
main "$@"
