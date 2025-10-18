#!/bin/bash

# Performance Testing Script
# Runs performance benchmarks and load tests for ORION services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_detail() {
    echo -e "${BLUE}  →${NC} $1"
}

# Configuration
TARGET_URL="${PERFORMANCE_TEST_URL:-http://localhost:3001}"
DURATION="${PERFORMANCE_TEST_DURATION:-30s}"
VUS="${PERFORMANCE_TEST_VUS:-10}"
THRESHOLD_P95="${PERFORMANCE_THRESHOLD_P95:-500}"
THRESHOLD_P99="${PERFORMANCE_THRESHOLD_P99:-1000}"
OUTPUT_DIR="performance-results"

log_info "Starting performance tests..."
log_detail "Target URL: $TARGET_URL"
log_detail "Duration: $DURATION"
log_detail "Virtual Users: $VUS"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    log_warning "k6 is not installed. Installing k6..."

    # Install k6 based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6 || log_error "Failed to install k6. Please install manually: https://k6.io/docs/getting-started/installation/"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # For CI environments, use the installation script
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    else
        log_error "Unsupported OS. Please install k6 manually: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
fi

# Create k6 test script
cat > "$OUTPUT_DIR/load-test.js" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '10s', target: __ENV.VUS || 10 },
    { duration: __ENV.DURATION || '30s', target: __ENV.VUS || 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: [
      `p(95)<${__ENV.THRESHOLD_P95 || 500}`,
      `p(99)<${__ENV.THRESHOLD_P99 || 1000}`,
    ],
    errors: ['rate<0.1'],
  },
};

export default function () {
  const baseUrl = __ENV.TARGET_URL || 'http://localhost:3001';

  // Health check endpoint
  const healthRes = http.get(`${baseUrl}/api/auth/health`);
  const healthCheck = check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  errorRate.add(!healthCheck);

  sleep(0.5);

  // Login endpoint (simulated)
  const loginPayload = JSON.stringify({
    username: `user_${Math.floor(Math.random() * 1000)}`,
    password: 'test_password_123',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(`${baseUrl}/api/auth/login`, loginPayload, loginParams);
  const loginCheck = check(loginRes, {
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!loginCheck);

  sleep(1);
}
EOF

# Run k6 load test
log_info "Running k6 load test..."
k6 run \
  --out json="$OUTPUT_DIR/results.json" \
  -e TARGET_URL="$TARGET_URL" \
  -e DURATION="$DURATION" \
  -e VUS="$VUS" \
  -e THRESHOLD_P95="$THRESHOLD_P95" \
  -e THRESHOLD_P99="$THRESHOLD_P99" \
  "$OUTPUT_DIR/load-test.js" || TEST_EXIT_CODE=$?

# Parse results
if [ -f "$OUTPUT_DIR/results.json" ]; then
    log_info "Analyzing performance results..."

    # Extract key metrics using jq
    if command -v jq &> /dev/null; then
        # Calculate average response time
        AVG_RESPONSE=$(jq -s '[.[] | select(.type=="Point" and .metric=="http_req_duration") | .data.value] | add / length' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "N/A")

        # Calculate error rate
        ERROR_RATE=$(jq -s '[.[] | select(.type=="Point" and .metric=="errors") | .data.value] | add / length' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "0")

        # Count total requests
        TOTAL_REQUESTS=$(jq -s '[.[] | select(.type=="Point" and .metric=="http_reqs")] | length' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "0")

        log_info "Performance Metrics:"
        log_detail "Average Response Time: ${AVG_RESPONSE}ms"
        log_detail "Error Rate: ${ERROR_RATE}"
        log_detail "Total Requests: ${TOTAL_REQUESTS}"
    else
        log_warning "jq not installed. Skipping detailed metrics analysis."
    fi
fi

# Build performance benchmark
log_info "Running build performance benchmark..."
BUILD_START=$(date +%s)
npm run build:affected > "$OUTPUT_DIR/build-output.log" 2>&1 || log_warning "Build benchmark failed"
BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))
log_detail "Build time: ${BUILD_TIME}s"

# Test performance benchmark
log_info "Running test performance benchmark..."
TEST_START=$(date +%s)
npm run test -- --maxWorkers=2 > "$OUTPUT_DIR/test-output.log" 2>&1 || log_warning "Test benchmark failed"
TEST_END=$(date +%s)
TEST_TIME=$((TEST_END - TEST_START))
log_detail "Test time: ${TEST_TIME}s"

# Generate summary report
cat > "$OUTPUT_DIR/summary.txt" << EOF
ORION Performance Test Summary
==============================
Date: $(date)
Target: $TARGET_URL
Duration: $DURATION
Virtual Users: $VUS

Load Test Results:
------------------
Average Response Time: ${AVG_RESPONSE:-N/A}ms
Error Rate: ${ERROR_RATE:-N/A}
Total Requests: ${TOTAL_REQUESTS:-N/A}
P95 Threshold: ${THRESHOLD_P95}ms
P99 Threshold: ${THRESHOLD_P99}ms

Build Performance:
------------------
Build Time: ${BUILD_TIME}s

Test Performance:
-----------------
Test Execution Time: ${TEST_TIME}s

Status: ${TEST_EXIT_CODE:-0}
EOF

cat "$OUTPUT_DIR/summary.txt"

# Check thresholds
if [ "${TEST_EXIT_CODE:-0}" -ne 0 ]; then
    log_error "Performance tests failed - thresholds not met"
    exit 1
else
    log_info "Performance tests passed successfully!"
    exit 0
fi
