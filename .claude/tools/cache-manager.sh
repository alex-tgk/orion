#!/bin/bash
# Cache Manager - Manages persistent caching for the Orion project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CACHE_DIR="$PROJECT_ROOT/.claude/cache"
MEMORY_DIR="$PROJECT_ROOT/.claude/memory"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create directories if they don't exist
mkdir -p "$CACHE_DIR" "$MEMORY_DIR" "$CACHE_DIR/conversations" "$CACHE_DIR/decisions"

log() {
    echo -e "${2:-$BLUE}[Cache Manager]${NC} $1"
}

# Function to cache conversation
cache_conversation() {
    local title="$1"
    local content="$2"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local filename="$CACHE_DIR/conversations/conv_${timestamp}.md"

    cat > "$filename" << EOF
# Conversation: $title
**Date**: $(date)
**Session ID**: $(uuidgen 2>/dev/null || echo "$(date +%s)")

## Content
$content

## Metadata
- Cached at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- File: $filename
EOF

    log "Conversation cached: $filename" "$GREEN"
    echo "$filename"
}

# Function to cache decision
cache_decision() {
    local category="$1"
    local decision="$2"
    local reasoning="$3"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local filename="$CACHE_DIR/decisions/${category}_${timestamp}.md"

    cat > "$filename" << EOF
# Decision Record

## Category
$category

## Decision
$decision

## Reasoning
$reasoning

## Metadata
- Date: $(date)
- Author: $(git config user.name 2>/dev/null || echo "Unknown")
- Impact: TBD

## Follow-up Actions
- [ ] Document in ADR
- [ ] Update relevant specs
- [ ] Notify team

---
*This decision has been automatically cached for persistence.*
EOF

    log "Decision cached: $filename" "$GREEN"
}

# Function to cache work state
cache_work_state() {
    local state_file="$CACHE_DIR/work-state.json"
    local backup_file="$CACHE_DIR/work-state-$(date +%Y%m%d_%H%M%S).json"

    # Backup existing state
    if [ -f "$state_file" ]; then
        cp "$state_file" "$backup_file"
    fi

    # Get current git status
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    local commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local modified_files=$(git status --porcelain 2>/dev/null | wc -l)
    local staged_files=$(git diff --cached --name-only 2>/dev/null | wc -l)

    cat > "$state_file" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "$branch",
  "commit": "$commit",
  "statistics": {
    "modifiedFiles": $modified_files,
    "stagedFiles": $staged_files,
    "cacheSize": $(du -sh "$CACHE_DIR" 2>/dev/null | cut -f1 || echo "0"),
    "memorySize": $(du -sh "$MEMORY_DIR" 2>/dev/null | cut -f1 || echo "0")
  },
  "environment": {
    "node": "$(node -v 2>/dev/null || echo "not installed")",
    "pnpm": "$(pnpm -v 2>/dev/null || echo "not installed")",
    "platform": "$(uname -s)"
  }
}
EOF

    log "Work state cached" "$GREEN"
}

# Function to create memory snapshot
create_memory_snapshot() {
    local snapshot_name="${1:-snapshot}"
    local snapshot_file="$MEMORY_DIR/${snapshot_name}_$(date +%Y%m%d_%H%M%S).tar.gz"

    log "Creating memory snapshot..." "$YELLOW"

    # Create temporary directory for snapshot
    local temp_dir=$(mktemp -d)

    # Copy important files
    cp -r "$CACHE_DIR" "$temp_dir/" 2>/dev/null || true
    cp -r "$MEMORY_DIR"/*.md "$temp_dir/" 2>/dev/null || true
    cp "$PROJECT_ROOT/.specs/METHODOLOGY.md" "$temp_dir/" 2>/dev/null || true

    # Add git information
    (cd "$PROJECT_ROOT" && git log --oneline -n 20) > "$temp_dir/recent-commits.txt" 2>/dev/null || true
    (cd "$PROJECT_ROOT" && git status) > "$temp_dir/git-status.txt" 2>/dev/null || true

    # Create tarball
    tar -czf "$snapshot_file" -C "$temp_dir" . 2>/dev/null

    # Cleanup
    rm -rf "$temp_dir"

    log "Memory snapshot created: $snapshot_file" "$GREEN"
    echo "$snapshot_file"
}

# Function to restore from snapshot
restore_snapshot() {
    local snapshot_file="$1"

    if [ ! -f "$snapshot_file" ]; then
        log "Snapshot file not found: $snapshot_file" "$RED"
        return 1
    fi

    log "Restoring from snapshot: $snapshot_file" "$YELLOW"

    # Create backup of current state
    create_memory_snapshot "pre-restore-backup"

    # Extract snapshot
    local temp_dir=$(mktemp -d)
    tar -xzf "$snapshot_file" -C "$temp_dir"

    # Restore files
    if [ -d "$temp_dir/cache" ]; then
        cp -r "$temp_dir/cache/"* "$CACHE_DIR/" 2>/dev/null || true
    fi

    if [ -d "$temp_dir/memory" ]; then
        cp "$temp_dir/"*.md "$MEMORY_DIR/" 2>/dev/null || true
    fi

    # Cleanup
    rm -rf "$temp_dir"

    log "Snapshot restored successfully" "$GREEN"
}

# Function to list cached items
list_cache() {
    local type="${1:-all}"

    echo -e "${BLUE}=== Cache Contents ===${NC}"
    echo ""

    if [ "$type" = "all" ] || [ "$type" = "conversations" ]; then
        echo -e "${YELLOW}Conversations:${NC}"
        if [ -d "$CACHE_DIR/conversations" ]; then
            ls -la "$CACHE_DIR/conversations/" 2>/dev/null | tail -n +2 | grep -v "^total" || echo "  No conversations cached"
        else
            echo "  No conversations cached"
        fi
        echo ""
    fi

    if [ "$type" = "all" ] || [ "$type" = "decisions" ]; then
        echo -e "${YELLOW}Decisions:${NC}"
        if [ -d "$CACHE_DIR/decisions" ]; then
            ls -la "$CACHE_DIR/decisions/" 2>/dev/null | tail -n +2 | grep -v "^total" || echo "  No decisions cached"
        else
            echo "  No decisions cached"
        fi
        echo ""
    fi

    if [ "$type" = "all" ] || [ "$type" = "snapshots" ]; then
        echo -e "${YELLOW}Memory Snapshots:${NC}"
        if [ -d "$MEMORY_DIR" ]; then
            ls -la "$MEMORY_DIR/"*.tar.gz 2>/dev/null || echo "  No snapshots available"
        else
            echo "  No snapshots available"
        fi
        echo ""
    fi

    # Show cache statistics
    echo -e "${BLUE}Statistics:${NC}"
    echo "  Cache size: $(du -sh "$CACHE_DIR" 2>/dev/null | cut -f1 || echo "0")"
    echo "  Memory size: $(du -sh "$MEMORY_DIR" 2>/dev/null | cut -f1 || echo "0")"
    echo "  Total items: $(find "$CACHE_DIR" -type f 2>/dev/null | wc -l || echo "0")"
}

# Function to clean old cache
clean_cache() {
    local days="${1:-30}"

    log "Cleaning cache older than $days days..." "$YELLOW"

    # Find and remove old files
    find "$CACHE_DIR" -type f -mtime +$days -delete 2>/dev/null
    find "$MEMORY_DIR" -name "*.tar.gz" -mtime +$days -delete 2>/dev/null

    log "Cache cleaned" "$GREEN"
}

# Function to export cache
export_cache() {
    local export_file="${1:-orion-cache-export-$(date +%Y%m%d).tar.gz}"

    log "Exporting cache to $export_file..." "$YELLOW"

    tar -czf "$export_file" -C "$PROJECT_ROOT/.claude" cache memory 2>/dev/null

    log "Cache exported: $export_file" "$GREEN"
    echo "Export size: $(du -h "$export_file" | cut -f1)"
}

# Main menu
show_menu() {
    echo ""
    echo "Cache Manager for Orion Project"
    echo "================================"
    echo "1. Cache current work state"
    echo "2. Create memory snapshot"
    echo "3. List cached items"
    echo "4. Clean old cache (30+ days)"
    echo "5. Export cache"
    echo "6. Show statistics"
    echo "7. Exit"
    echo ""
    read -p "Select option: " choice

    case $choice in
        1) cache_work_state ;;
        2)
            read -p "Snapshot name (default: snapshot): " name
            create_memory_snapshot "${name:-snapshot}"
            ;;
        3) list_cache ;;
        4)
            read -p "Days to keep (default: 30): " days
            clean_cache "${days:-30}"
            ;;
        5)
            read -p "Export filename (default: orion-cache-export-DATE.tar.gz): " filename
            export_cache "$filename"
            ;;
        6)
            echo ""
            echo -e "${BLUE}Cache Statistics:${NC}"
            echo "  Location: $CACHE_DIR"
            echo "  Size: $(du -sh "$CACHE_DIR" 2>/dev/null | cut -f1 || echo "0")"
            echo "  Files: $(find "$CACHE_DIR" -type f 2>/dev/null | wc -l || echo "0")"
            echo "  Oldest: $(find "$CACHE_DIR" -type f -printf '%T+ %p\n' 2>/dev/null | sort | head -1 | cut -d' ' -f1 || echo "N/A")"
            echo "  Newest: $(find "$CACHE_DIR" -type f -printf '%T+ %p\n' 2>/dev/null | sort | tail -1 | cut -d' ' -f1 || echo "N/A")"
            ;;
        7) exit 0 ;;
        *) log "Invalid option" "$RED" ;;
    esac
}

# Parse command line arguments
case "${1:-}" in
    conversation)
        shift
        title="${1:-Untitled}"
        shift
        content="${*:-No content provided}"
        cache_conversation "$title" "$content"
        ;;
    decision)
        shift
        cache_decision "$1" "$2" "$3"
        ;;
    state) cache_work_state ;;
    snapshot)
        shift
        create_memory_snapshot "$1"
        ;;
    restore)
        shift
        restore_snapshot "$1"
        ;;
    list) list_cache "${2:-all}" ;;
    clean) clean_cache "${2:-30}" ;;
    export) export_cache "$2" ;;
    *)
        if [ -z "${1:-}" ]; then
            show_menu
        else
            echo "Usage: $0 {conversation|decision|state|snapshot|restore|list|clean|export}"
            exit 1
        fi
        ;;
esac