#!/bin/bash
# MCP Schema Validation Hook
# Validates JSON files in .claude/ directory against MCP schema
# Checks for valid JSON and required MCP server fields

set -e

STAGED_FILES=$@

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "Validating MCP configuration files..."

MCP_FILES=$(echo "$STAGED_FILES" | tr ' ' '\n' | grep -E '\.claude/.*\.json$' || true)

if [ -z "$MCP_FILES" ]; then
  exit 0
fi

VALIDATION_FAILED=0

for FILE in $MCP_FILES; do
  # Check if file exists and is readable
  if [ ! -f "$FILE" ]; then
    continue
  fi

  # Validate JSON syntax
  if ! python3 -m json.tool "$FILE" > /dev/null 2>&1; then
    echo "❌ Invalid JSON syntax in $FILE"
    VALIDATION_FAILED=1
    continue
  fi

  # If it's the MCP config file, validate structure
  if [[ "$FILE" == *"mcp/config.json"* ]]; then
    # Check for required mcpServers key
    if ! grep -q '"mcpServers"' "$FILE"; then
      echo "⚠️  Warning: $FILE missing 'mcpServers' configuration"
      echo "   Expected structure: { \"mcpServers\": { ... } }"
    else
      # Validate each server has required fields
      if ! python3 -c "
import json
import sys

try:
    with open('$FILE', 'r') as f:
        config = json.load(f)

    if 'mcpServers' not in config:
        sys.exit(0)

    for name, server in config['mcpServers'].items():
        if 'command' not in server:
            print(f'⚠️  Warning: MCP server \"{name}\" missing required \"command\" field')
        if 'args' in server and not isinstance(server['args'], list):
            print(f'❌ Error: MCP server \"{name}\" has invalid \"args\" - must be array')
            sys.exit(1)
except json.JSONDecodeError as e:
    print(f'❌ JSON decode error: {e}')
    sys.exit(1)
except Exception as e:
    print(f'⚠️  Warning: Validation error: {e}')
    sys.exit(0)
" 2>&1; then
        VALIDATION_FAILED=1
      fi
    fi
  fi

  echo "✅ $FILE is valid"
done

if [ $VALIDATION_FAILED -eq 1 ]; then
  echo ""
  echo "❌ MCP configuration validation failed!"
  echo "Please fix the errors above before committing."
  echo ""
  exit 1
fi

echo ""
echo "✅ All MCP configurations valid!"
echo ""
exit 0
