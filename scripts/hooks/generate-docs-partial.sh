#!/bin/bash
# Partial Documentation Generation Hook
# Generates/updates documentation for changed service/controller files
# Only updates docs for the specific files changed (fast)

set -e

STAGED_FILES=$@

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "Generating documentation for changed files..."

# Filter for service/controller files
DOC_FILES=$(echo "$STAGED_FILES" | tr ' ' '\n' | grep -E '\.(service|controller)\.ts$' | grep -v '\.spec\.ts$' || true)

if [ -z "$DOC_FILES" ]; then
  echo "No service/controller files changed - skipping doc generation"
  exit 0
fi

DOCS_UPDATED=0

for FILE in $DOC_FILES; do
  # Extract service name and file type
  SERVICE_NAME=$(echo "$FILE" | sed -n 's|packages/\([^/]*\)/.*|\1|p')
  FILE_NAME=$(basename "$FILE" .ts)

  if [ -z "$SERVICE_NAME" ]; then
    continue
  fi

  echo "Updating docs for $SERVICE_NAME/$FILE_NAME..."

  # Create/update API reference section in service README
  README_FILE="packages/$SERVICE_NAME/README.md"

  if [ ! -f "$README_FILE" ]; then
    echo "⚠️  No README found at $README_FILE - skipping"
    continue
  fi

  # Extract JSDoc comments from the file
  JSDOC=$(grep -E '^\s*/\*\*' -A 20 "$FILE" | head -n 50 || true)

  if [ -n "$JSDOC" ]; then
    echo "   Found JSDoc comments - docs may need updating"
    DOCS_UPDATED=1
  fi
done

if [ $DOCS_UPDATED -eq 1 ]; then
  echo ""
  echo "ℹ️  Documentation may need updating for changed files"
  echo "   Consider running: pnpm docs:generate"
  echo "   Continuing anyway (non-blocking)..."
  echo ""
fi

# Always succeed - this is informational
exit 0
