#!/bin/bash

# Profile Service Performance
# Usage: ./profile-service.sh <service-name> [duration] [format]

set -e

SERVICE_NAME=${1:-""}
DURATION=${2:-60}
FORMAT=${3:-"markdown"}

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: ./profile-service.sh <service-name> [duration] [format]"
  echo ""
  echo "Example: ./profile-service.sh auth 60 markdown"
  exit 1
fi

echo "🔍 Profiling service: $SERVICE_NAME"
echo "Duration: ${DURATION}s"
echo "Format: $FORMAT"
echo ""

# Ensure tmp directory exists
mkdir -p tmp/performance

# Run the performance analyzer
node -r ts-node/register tools/performance-analyzer/cli.ts \
  --service="packages/$SERVICE_NAME" \
  --duration="$DURATION" \
  --profile \
  --detect \
  --suggest \
  --format="$FORMAT"

# Save results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="tmp/performance/${SERVICE_NAME}_profile_${TIMESTAMP}.${FORMAT}"

echo ""
echo "✅ Profiling complete!"
echo "Report saved to: $REPORT_FILE"
echo ""
echo "To view the report:"
if [ "$FORMAT" = "markdown" ]; then
  echo "  cat $REPORT_FILE"
elif [ "$FORMAT" = "html" ]; then
  echo "  open $REPORT_FILE"
else
  echo "  jq . $REPORT_FILE"
fi
