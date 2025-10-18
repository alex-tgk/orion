#!/bin/bash
# Auto-Backup System - Prevents work loss with automatic backups

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.claude/backups"
REMOTE_BACKUP_DIR="$HOME/.orion-backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create directories
mkdir -p "$BACKUP_DIR" "$REMOTE_BACKUP_DIR"

log() {
    echo -e "${2:-$BLUE}[Auto-Backup]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$BACKUP_DIR/backup.log"
}

# Function to create incremental backup
incremental_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/incremental_${timestamp}.tar.gz"

    log "Creating incremental backup..." "$YELLOW"

    # Find files modified in the last hour
    local temp_list=$(mktemp)
    find "$PROJECT_ROOT" \
        -type f \
        -mmin -60 \
        -not -path "*/node_modules/*" \
        -not -path "*/.nx/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -not -path "*/.claude/backups/*" \
        > "$temp_list"

    if [ -s "$temp_list" ]; then
        tar -czf "$backup_file" -T "$temp_list" --transform "s|$PROJECT_ROOT/||" 2>/dev/null || true
        local size=$(du -h "$backup_file" | cut -f1)
        log "Incremental backup created: $backup_file ($size)" "$GREEN"
    else
        log "No files changed in the last hour" "$BLUE"
    fi

    rm "$temp_list"
}

# Function to create full backup
full_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/full_${timestamp}.tar.gz"

    log "Creating full backup..." "$YELLOW"

    # Create backup excluding unnecessary files
    tar -czf "$backup_file" \
        --exclude="node_modules" \
        --exclude=".nx" \
        --exclude="dist" \
        --exclude=".git/objects" \
        --exclude=".claude/backups" \
        -C "$PROJECT_ROOT" . 2>/dev/null

    local size=$(du -h "$backup_file" | cut -f1)
    log "Full backup created: $backup_file ($size)" "$GREEN"

    # Copy to remote backup location
    cp "$backup_file" "$REMOTE_BACKUP_DIR/" 2>/dev/null || true
    log "Backup copied to remote location: $REMOTE_BACKUP_DIR" "$GREEN"
}

# Function to create git bundle backup
git_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local bundle_file="$BACKUP_DIR/git_bundle_${timestamp}.bundle"

    log "Creating git bundle backup..." "$YELLOW"

    cd "$PROJECT_ROOT"

    # Create git bundle
    git bundle create "$bundle_file" --all 2>/dev/null || {
        log "Failed to create git bundle" "$RED"
        return 1
    }

    log "Git bundle created: $bundle_file" "$GREEN"

    # Also save current state as patch
    local patch_file="$BACKUP_DIR/uncommitted_${timestamp}.patch"
    git diff > "$patch_file" 2>/dev/null
    git diff --cached >> "$patch_file" 2>/dev/null

    if [ -s "$patch_file" ]; then
        log "Uncommitted changes saved: $patch_file" "$GREEN"
    else
        rm "$patch_file"
    fi
}

# Function to backup critical files
critical_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local critical_dir="$BACKUP_DIR/critical_${timestamp}"

    log "Backing up critical files..." "$YELLOW"

    mkdir -p "$critical_dir"

    # Backup specs
    if [ -d "$PROJECT_ROOT/.specs" ]; then
        cp -r "$PROJECT_ROOT/.specs" "$critical_dir/" 2>/dev/null || true
    fi

    # Backup package.json files
    find "$PROJECT_ROOT" -name "package.json" -not -path "*/node_modules/*" \
        -exec cp --parents {} "$critical_dir/" \; 2>/dev/null || true

    # Backup environment files
    find "$PROJECT_ROOT" -name ".env*" -not -path "*/node_modules/*" \
        -exec cp --parents {} "$critical_dir/" \; 2>/dev/null || true

    # Backup claude configurations
    if [ -d "$PROJECT_ROOT/.claude" ]; then
        cp -r "$PROJECT_ROOT/.claude/mcp-config.json" "$critical_dir/" 2>/dev/null || true
        cp -r "$PROJECT_ROOT/.claude/memory" "$critical_dir/" 2>/dev/null || true
    fi

    # Create archive
    tar -czf "${critical_dir}.tar.gz" -C "$BACKUP_DIR" "$(basename "$critical_dir")" 2>/dev/null
    rm -rf "$critical_dir"

    log "Critical files backed up: ${critical_dir}.tar.gz" "$GREEN"
}

# Function to clean old backups
clean_old_backups() {
    local days="${1:-7}"

    log "Cleaning backups older than $days days..." "$YELLOW"

    # Clean local backups
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$days -delete 2>/dev/null
    find "$BACKUP_DIR" -name "*.bundle" -mtime +$days -delete 2>/dev/null
    find "$BACKUP_DIR" -name "*.patch" -mtime +$days -delete 2>/dev/null

    # Clean remote backups (keep longer)
    find "$REMOTE_BACKUP_DIR" -name "*.tar.gz" -mtime +$((days * 2)) -delete 2>/dev/null

    log "Old backups cleaned" "$GREEN"
}

# Function to list backups
list_backups() {
    echo -e "${BLUE}=== Local Backups ===${NC}"
    echo ""

    echo -e "${YELLOW}Incremental Backups:${NC}"
    ls -lah "$BACKUP_DIR"/incremental_*.tar.gz 2>/dev/null | tail -5 || echo "  None"

    echo ""
    echo -e "${YELLOW}Full Backups:${NC}"
    ls -lah "$BACKUP_DIR"/full_*.tar.gz 2>/dev/null | tail -5 || echo "  None"

    echo ""
    echo -e "${YELLOW}Git Bundles:${NC}"
    ls -lah "$BACKUP_DIR"/*.bundle 2>/dev/null | tail -5 || echo "  None"

    echo ""
    echo -e "${YELLOW}Critical Backups:${NC}"
    ls -lah "$BACKUP_DIR"/critical_*.tar.gz 2>/dev/null | tail -5 || echo "  None"

    echo ""
    echo -e "${BLUE}=== Remote Backups ===${NC}"
    ls -lah "$REMOTE_BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5 || echo "  None"

    echo ""
    echo -e "${BLUE}=== Statistics ===${NC}"
    echo "  Total backup size: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")"
    echo "  Remote backup size: $(du -sh "$REMOTE_BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")"
    echo "  Number of backups: $(find "$BACKUP_DIR" -name "*.tar.gz" -o -name "*.bundle" | wc -l)"
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log "Backup file not found: $backup_file" "$RED"
        return 1
    fi

    log "Restoring from backup: $backup_file" "$YELLOW"

    # Create restore directory
    local restore_dir="$PROJECT_ROOT/.restore_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$restore_dir"

    # Extract backup
    if [[ "$backup_file" == *.bundle ]]; then
        # Restore git bundle
        cd "$restore_dir"
        git clone "$backup_file" restored_repo 2>/dev/null
        log "Git bundle restored to: $restore_dir/restored_repo" "$GREEN"
    else
        # Restore tar archive
        tar -xzf "$backup_file" -C "$restore_dir" 2>/dev/null
        log "Backup restored to: $restore_dir" "$GREEN"
    fi

    echo ""
    echo "To complete restoration:"
    echo "1. Review restored files in: $restore_dir"
    echo "2. Copy needed files back to project"
    echo "3. Remove restore directory when done"
}

# Function to setup auto-backup cron
setup_cron() {
    log "Setting up automatic backup schedule..." "$YELLOW"

    local cron_entry="0 * * * * $SCRIPT_DIR/auto-backup.sh incremental > /dev/null 2>&1"

    # Check if cron entry exists
    if crontab -l 2>/dev/null | grep -q "auto-backup.sh"; then
        log "Cron job already exists" "$BLUE"
    else
        # Add cron entry
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        log "Cron job added: Incremental backup every hour" "$GREEN"
    fi

    # Add daily full backup
    local daily_cron="0 2 * * * $SCRIPT_DIR/auto-backup.sh full > /dev/null 2>&1"
    if ! crontab -l 2>/dev/null | grep -q "auto-backup.sh full"; then
        (crontab -l 2>/dev/null; echo "$daily_cron") | crontab -
        log "Cron job added: Full backup daily at 2 AM" "$GREEN"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="${1:-}"

    if [ -z "$backup_file" ]; then
        # Verify latest backup
        backup_file=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
    fi

    if [ ! -f "$backup_file" ]; then
        log "No backup file found" "$RED"
        return 1
    fi

    log "Verifying backup: $backup_file" "$YELLOW"

    # Test archive integrity
    if tar -tzf "$backup_file" > /dev/null 2>&1; then
        log "✓ Backup integrity verified" "$GREEN"

        # Show backup contents summary
        echo "Backup contents:"
        tar -tzf "$backup_file" | head -20
        echo "..."
        echo "Total files: $(tar -tzf "$backup_file" | wc -l)"
    else
        log "✗ Backup is corrupted!" "$RED"
        return 1
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "Auto-Backup System"
    echo "=================="
    echo "1. Create incremental backup"
    echo "2. Create full backup"
    echo "3. Create git bundle backup"
    echo "4. Backup critical files"
    echo "5. List backups"
    echo "6. Verify backup integrity"
    echo "7. Restore from backup"
    echo "8. Setup automatic backups"
    echo "9. Clean old backups"
    echo "10. Exit"
    echo ""
    read -p "Select option: " choice

    case $choice in
        1) incremental_backup ;;
        2) full_backup ;;
        3) git_backup ;;
        4) critical_backup ;;
        5) list_backups ;;
        6)
            read -p "Backup file (leave empty for latest): " file
            verify_backup "$file"
            ;;
        7)
            read -p "Backup file path: " file
            restore_backup "$file"
            ;;
        8) setup_cron ;;
        9)
            read -p "Days to keep (default: 7): " days
            clean_old_backups "${days:-7}"
            ;;
        10) exit 0 ;;
        *) log "Invalid option" "$RED" ;;
    esac
}

# Parse command line arguments
case "${1:-}" in
    incremental) incremental_backup ;;
    full) full_backup ;;
    git) git_backup ;;
    critical) critical_backup ;;
    list) list_backups ;;
    verify) verify_backup "$2" ;;
    restore) restore_backup "$2" ;;
    setup) setup_cron ;;
    clean) clean_old_backups "${2:-7}" ;;
    *)
        if [ -z "${1:-}" ]; then
            show_menu
        else
            echo "Usage: $0 {incremental|full|git|critical|list|verify|restore|setup|clean}"
            exit 1
        fi
        ;;
esac