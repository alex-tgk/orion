#!/bin/bash
# Spec Validation Hook
# Validates that TypeScript files have corresponding specs in .claude/specs/
# Non-blocking - warns but doesn't fail the commit

set -e

STAGED_FILES=$@

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "Validating GitHub Spec Kit compliance..."

# Filter for service/controller/gateway files
SPEC_REQUIRED_FILES=$(echo "$STAGED_FILES" | tr ' ' '\n' | grep -E '(service|controller|gateway)\.ts$' | grep -v '\.spec\.ts$' || true)

if [ -z "$SPEC_REQUIRED_FILES" ]; then
  echo "No spec-requiring files changed"
  exit 0
fi

MISSING_SPECS=()
SPEC_DIR=".claude/specs"

for FILE in $SPEC_REQUIRED_FILES; do
  # Extract service name from path (e.g., packages/auth/... -> auth)
  SERVICE_NAME=$(echo "$FILE" | sed -n 's|packages/\([^/]*\)/.*|\1|p')

  if [ -z "$SERVICE_NAME" ]; then
    continue
  fi

  SPEC_FILE="$SPEC_DIR/${SERVICE_NAME}-service.md"

  if [ ! -f "$SPEC_FILE" ]; then
    MISSING_SPECS+=("$SERVICE_NAME")
  fi
done

if [ ${#MISSING_SPECS[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  Warning: Missing specs for services:"
  for SERVICE in "${MISSING_SPECS[@]}"; do
    echo "   - $SERVICE (expected: .claude/specs/${SERVICE}-service.md)"
  done
  echo ""
  echo "Consider running: pnpm spec:generate"
  echo "Continuing anyway (non-blocking)..."
  echo ""
fi

# Always succeed - this is informational only
exit 0
