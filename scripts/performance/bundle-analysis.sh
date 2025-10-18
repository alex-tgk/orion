#!/bin/bash

# Bundle Size Analysis
# Usage: ./bundle-analysis.sh [service]

set -e

SERVICE=${1:-"all"}

echo "📦 Analyzing bundle sizes..."
echo "Service: $SERVICE"
echo ""

# Create output directory
mkdir -p tmp/bundle-analysis

REPORT_FILE="tmp/bundle-analysis/report-$(date +%Y%m%d_%H%M%S).txt"

# Function to analyze a single service
analyze_service() {
  local service=$1
  echo "Analyzing $service..." | tee -a "$REPORT_FILE"

  # Build the service
  echo "Building..." | tee -a "$REPORT_FILE"
  nx build "$service" --configuration=production > /dev/null 2>&1 || {
    echo "  ⚠️  Build failed, skipping" | tee -a "$REPORT_FILE"
    return
  }

  # Find dist directory
  DIST_DIR="dist/packages/$service"

  if [ ! -d "$DIST_DIR" ]; then
    echo "  ⚠️  No dist directory found" | tee -a "$REPORT_FILE"
    return
  fi

  # Analyze bundle sizes
  echo "" | tee -a "$REPORT_FILE"
  echo "  Bundle sizes:" | tee -a "$REPORT_FILE"

  # Find all JS files
  find "$DIST_DIR" -name "*.js" -type f | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    SIZE_KB=$(du -k "$file" | cut -f1)
    FILENAME=$(basename "$file")

    # Highlight large files
    if [ "$SIZE_KB" -gt 500 ]; then
      echo "    ⚠️  $FILENAME: $SIZE (>500KB)" | tee -a "$REPORT_FILE"
    else
      echo "    ✓ $FILENAME: $SIZE" | tee -a "$REPORT_FILE"
    fi
  done

  # Total bundle size
  TOTAL_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
  TOTAL_KB=$(du -sk "$DIST_DIR" | cut -f1)

  echo "" | tee -a "$REPORT_FILE"
  echo "  Total: $TOTAL_SIZE" | tee -a "$REPORT_FILE"

  # Check against budget
  if [ "$TOTAL_KB" -gt 1024 ]; then
    echo "  ⚠️  Exceeds 1MB budget!" | tee -a "$REPORT_FILE"
  else
    echo "  ✅ Within budget" | tee -a "$REPORT_FILE"
  fi

  # Analyze dependencies
  echo "" | tee -a "$REPORT_FILE"
  echo "  Large dependencies:" | tee -a "$REPORT_FILE"

  if [ -f "packages/$service/package.json" ]; then
    # Use npm ls to show dependency sizes (requires depcheck)
    cd "packages/$service"

    # List dependencies
    if [ -f "node_modules" ]; then
      du -sh node_modules/* 2>/dev/null | sort -rh | head -10 | while read size dep; do
        echo "    $(basename $dep): $size" | tee -a "$REPORT_FILE"
      done
    fi

    cd ../..
  fi

  echo "" | tee -a "$REPORT_FILE"
  echo "---" | tee -a "$REPORT_FILE"
  echo "" | tee -a "$REPORT_FILE"
}

# Main analysis
echo "## Bundle Size Analysis Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$SERVICE" = "all" ]; then
  # Analyze all buildable services
  SERVICES=$(find packages -maxdepth 1 -type d | tail -n +2 | xargs -n1 basename)

  for svc in $SERVICES; do
    # Skip if no project.json
    if [ ! -f "packages/$svc/project.json" ]; then
      continue
    fi

    # Check if it has a build target
    if grep -q '"build"' "packages/$svc/project.json" 2>/dev/null; then
      analyze_service "$svc"
    fi
  done
else
  analyze_service "$SERVICE"
fi

# Summary
echo "" | tee -a "$REPORT_FILE"
echo "## Summary" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# Count warnings
WARNINGS=$(grep -c "⚠️" "$REPORT_FILE" || true)
echo "Total warnings: $WARNINGS" | tee -a "$REPORT_FILE"

# Recommendations
echo "" | tee -a "$REPORT_FILE"
echo "## Recommendations" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "1. Use code splitting for large bundles" | tee -a "$REPORT_FILE"
echo "2. Enable tree shaking in webpack config" | tee -a "$REPORT_FILE"
echo "3. Consider lazy loading for routes" | tee -a "$REPORT_FILE"
echo "4. Remove unused dependencies" | tee -a "$REPORT_FILE"
echo "5. Use webpack-bundle-analyzer for detailed analysis" | tee -a "$REPORT_FILE"

echo ""
echo "✅ Analysis complete!"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""
echo "For detailed analysis, run:"
echo "  npm install -g webpack-bundle-analyzer"
echo "  webpack-bundle-analyzer dist/packages/$SERVICE/stats.json"
