#!/bin/bash

# Find Slow Database Queries
# Usage: ./find-slow-queries.sh [threshold] [service]

set -e

THRESHOLD=${1:-100}
SERVICE=${2:-"all"}

echo "🔍 Searching for slow database queries..."
echo "Threshold: ${THRESHOLD}ms"
echo "Service: $SERVICE"
echo ""

# Create output directory
mkdir -p tmp/performance

REPORT_FILE="tmp/performance/slow-queries-$(date +%Y%m%d_%H%M%S).txt"

# Search for database query patterns
echo "## Slow Query Analysis" > "$REPORT_FILE"
echo "Timestamp: $(date)" >> "$REPORT_FILE"
echo "Threshold: ${THRESHOLD}ms" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Find N+1 queries
echo "### N+1 Query Patterns" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$SERVICE" = "all" ]; then
  SEARCH_PATH="packages/*/src"
else
  SEARCH_PATH="packages/$SERVICE/src"
fi

# Pattern 1: Database queries in loops
echo "1. Database queries in loops:" >> "$REPORT_FILE"
grep -rn "for.*{" $SEARCH_PATH | grep -E "(find|findOne|query|select)" || echo "  None found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Pattern 2: forEach with async queries
echo "2. forEach with async database calls:" >> "$REPORT_FILE"
grep -rn "\.forEach.*async" $SEARCH_PATH | grep -E "(find|findOne|query)" || echo "  None found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Pattern 3: Missing eager loading
echo "3. Missing eager loading (TypeORM/Prisma):" >> "$REPORT_FILE"
grep -rn "\.find\(" $SEARCH_PATH | grep -v "relations\|include" || echo "  None found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Find sequential queries
echo "### Sequential Queries (should be parallel)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

grep -rn "await.*find" $SEARCH_PATH | head -20 >> "$REPORT_FILE" || echo "  None found" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Find missing indexes (from code patterns)
echo "### Potential Missing Indexes" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Look for WHERE clauses on these columns:" >> "$REPORT_FILE"
grep -rn "where:.*{" $SEARCH_PATH | head -20 >> "$REPORT_FILE" || echo "  None found" >> "$REPORT_FILE"

echo ""
echo "✅ Analysis complete!"
echo "Report saved to: $REPORT_FILE"
echo ""
echo "To view: cat $REPORT_FILE"
