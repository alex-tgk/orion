#!/bin/bash

# GitHub Spec Kit Validation Script
# Validates specification files and checks implementation coverage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_detail() {
    echo -e "${BLUE}  →${NC} $1"
}

log_info "Validating GitHub Spec Kit specifications..."

# Check if .claude/specs directory exists
SPECS_DIR=".claude/specs"
if [ ! -d "$SPECS_DIR" ]; then
    log_error "Specs directory not found at $SPECS_DIR"
    exit 1
fi

# Count spec files
SPEC_COUNT=$(find "$SPECS_DIR" -name "*-service.md" | wc -l | tr -d ' ')
log_info "Found $SPEC_COUNT service specification(s)"

if [ "$SPEC_COUNT" -eq 0 ]; then
    log_warning "No service specifications found"
    exit 0
fi

# Validate each spec file
find "$SPECS_DIR" -name "*-service.md" | while read -r spec_file; do
    spec_name=$(basename "$spec_file" -service.md)
    log_info "Validating spec: $spec_name"

    # Check for required sections
    required_sections=(
        "# ${spec_name^} Service Specification"
        "## Overview"
        "## API Endpoints"
        "## Data Models"
        "## Dependencies"
    )

    for section in "${required_sections[@]}"; do
        section_header="${section%%:*}"
        if ! grep -qF "$section_header" "$spec_file"; then
            log_error "Spec '$spec_name' missing section: $section_header"
        else
            log_detail "✓ Found: $section_header"
        fi
    done

    # Check for optional but recommended sections
    recommended_sections=(
        "## Authentication"
        "## Error Handling"
        "## Testing"
        "## Environment Variables"
    )

    for section in "${recommended_sections[@]}"; do
        if ! grep -qF "$section" "$spec_file"; then
            log_warning "Spec '$spec_name' missing recommended section: $section"
        fi
    done

    # Check if implementation exists
    if [ -d "packages/$spec_name" ]; then
        log_detail "✓ Implementation directory found: packages/$spec_name"

        # Check for main application file
        if [ -f "packages/$spec_name/src/main.ts" ]; then
            log_detail "✓ Main application file found"
        else
            log_warning "Main application file not found for $spec_name"
        fi

        # Check for tests
        TEST_COUNT=$(find "packages/$spec_name" -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$TEST_COUNT" -gt 0 ]; then
            log_detail "✓ Found $TEST_COUNT test file(s)"
        else
            log_warning "No test files found for $spec_name"
        fi
    else
        log_warning "Implementation not found for $spec_name (expected: packages/$spec_name)"
    fi

    echo ""
done

# Check for orphaned implementations (services without specs)
log_info "Checking for services without specifications..."
if [ -d "packages" ]; then
    for service_dir in packages/*/; do
        service_name=$(basename "$service_dir")

        # Skip non-service directories
        if [[ "$service_name" == "shared" ]] || [[ "$service_name" == "logger" ]] || [[ "$service_name" == "audit" ]]; then
            continue
        fi

        # Check if spec exists
        spec_file="$SPECS_DIR/${service_name}-service.md"
        if [ ! -f "$spec_file" ] && [ -f "$service_dir/src/main.ts" ]; then
            log_warning "Service '$service_name' has no specification file"
        fi
    done
fi

# Calculate coverage
IMPLEMENTED=0
SPECIFIED=0

find "$SPECS_DIR" -name "*-service.md" | while read -r spec_file; do
    spec_name=$(basename "$spec_file" -service.md)
    ((SPECIFIED++))

    if [ -d "packages/$spec_name" ] && [ -f "packages/$spec_name/src/main.ts" ]; then
        ((IMPLEMENTED++))
    fi
done

# Summary
echo ""
echo "================================"
echo "Spec Validation Summary"
echo "================================"
echo "Specifications: $SPEC_COUNT"
echo -e "Errors:         ${RED}$ERRORS${NC}"
echo -e "Warnings:       ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}Spec validation failed with $ERRORS error(s)${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}Spec validation passed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "\n${GREEN}Spec validation passed successfully!${NC}"
    exit 0
fi
