#!/bin/bash

# Memory Profiling Script
# Usage: ./memory-profiling.sh <service-name> [duration]

set -e

SERVICE_NAME=${1:-""}
DURATION=${2:-60}

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: ./memory-profiling.sh <service-name> [duration]"
  echo ""
  echo "Example: ./memory-profiling.sh auth 60"
  exit 1
fi

echo "🧠 Memory profiling for service: $SERVICE_NAME"
echo "Duration: ${DURATION}s"
echo ""

# Create output directory
mkdir -p tmp/memory-profiles
mkdir -p tmp/heap-snapshots

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="tmp/memory-profiles/${SERVICE_NAME}_${TIMESTAMP}"
mkdir -p "$OUTPUT_DIR"

echo "Starting service with memory profiling enabled..."
echo ""

# Start service with garbage collection exposed and heap profiling
NODE_ENV=development \
NODE_OPTIONS="--expose-gc --max-old-space-size=4096" \
nx serve "$SERVICE_NAME" &

SERVICE_PID=$!

echo "Service PID: $SERVICE_PID"
echo "Waiting 10s for service to start..."
sleep 10

# Take initial heap snapshot
echo "Taking initial heap snapshot..."
node --expose-gc -e "
  const v8 = require('v8');
  const fs = require('fs');
  const snapshot = v8.writeHeapSnapshot('$OUTPUT_DIR/heap-initial.heapsnapshot');
  console.log('Initial snapshot saved:', snapshot);
"

# Monitor memory usage
echo ""
echo "Monitoring memory usage for ${DURATION}s..."
echo "Time,HeapUsed,HeapTotal,RSS,External" > "$OUTPUT_DIR/memory-usage.csv"

for i in $(seq 1 $DURATION); do
  # Get memory stats from process
  MEMORY_STATS=$(ps -p $SERVICE_PID -o rss=,vsz= 2>/dev/null || echo "0 0")
  RSS=$(echo $MEMORY_STATS | awk '{print $1}')

  # Log to CSV
  echo "$i,0,0,$RSS,0" >> "$OUTPUT_DIR/memory-usage.csv"

  # Show progress
  if [ $((i % 10)) -eq 0 ]; then
    echo "[$i/${DURATION}s] RSS: ${RSS}KB"
  fi

  sleep 1
done

# Take final heap snapshot
echo ""
echo "Taking final heap snapshot..."
node --expose-gc -e "
  const v8 = require('v8');
  const snapshot = v8.writeHeapSnapshot('$OUTPUT_DIR/heap-final.heapsnapshot');
  console.log('Final snapshot saved:', snapshot);
"

# Stop the service
echo ""
echo "Stopping service..."
kill $SERVICE_PID 2>/dev/null || true
wait $SERVICE_PID 2>/dev/null || true

# Analyze memory growth
echo ""
echo "Analyzing memory growth..."

node -r ts-node/register <<EOF
const fs = require('fs');
const csv = fs.readFileSync('$OUTPUT_DIR/memory-usage.csv', 'utf-8');
const lines = csv.split('\n').slice(1).filter(l => l.trim());
const data = lines.map(line => {
  const [time, heapUsed, heapTotal, rss] = line.split(',').map(Number);
  return { time, rss };
});

const firstHalf = data.slice(0, Math.floor(data.length / 2));
const secondHalf = data.slice(Math.floor(data.length / 2));

const avgFirst = firstHalf.reduce((sum, d) => sum + d.rss, 0) / firstHalf.length;
const avgSecond = secondHalf.reduce((sum, d) => sum + d.rss, 0) / secondHalf.length;

const growth = ((avgSecond - avgFirst) / avgFirst) * 100;

console.log('Memory Analysis Report');
console.log('=====================');
console.log('Average RSS (first half):', (avgFirst / 1024).toFixed(2), 'MB');
console.log('Average RSS (second half):', (avgSecond / 1024).toFixed(2), 'MB');
console.log('Growth:', growth.toFixed(2), '%');
console.log('');

if (growth > 10) {
  console.log('⚠️  WARNING: Significant memory growth detected!');
  console.log('   This may indicate a memory leak.');
} else if (growth < -10) {
  console.log('ℹ️  INFO: Memory usage is fluctuating.');
} else {
  console.log('✅ Memory usage appears stable.');
}
EOF

echo ""
echo "✅ Memory profiling complete!"
echo ""
echo "Results saved to: $OUTPUT_DIR"
echo ""
echo "To analyze heap snapshots:"
echo "  1. Open Chrome DevTools"
echo "  2. Go to Memory tab"
echo "  3. Click 'Load' and select snapshot files"
echo "  4. Compare initial vs final snapshots"
echo ""
echo "Memory usage chart: $OUTPUT_DIR/memory-usage.csv"
