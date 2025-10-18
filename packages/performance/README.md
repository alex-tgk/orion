# ORION Performance Testing Suite

Performance testing suite using k6 for load, stress, spike, and soak testing.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Running Tests

### Load Testing
Tests normal expected load:
```bash
npm run test:load
```

### Stress Testing
Tests system under heavy load:
```bash
npm run test:stress
```

### Spike Testing
Tests sudden traffic spikes:
```bash
npm run test:spike
```

### Soak Testing
Tests system over extended period:
```bash
npm run test:soak
```

### Service-Specific Tests
```bash
npm run test:auth      # Authentication service
npm run test:gateway   # API Gateway
```

### Run All Tests
```bash
npm run test:all
```

## Performance Budgets

### Response Time Thresholds
- p95 < 500ms (95th percentile)
- p99 < 1000ms (99th percentile)
- max < 2000ms

### Success Rate
- http_req_failed < 1% (99% success rate)

### Throughput
- Minimum 100 requests/second
- Target 500 requests/second

## Test Scenarios

### Load Test
- Ramp up to target users over 5 minutes
- Maintain load for 10 minutes
- Ramp down over 2 minutes

### Stress Test
- Gradually increase load until failure
- Identify breaking point
- Measure recovery time

### Spike Test
- Sudden increase to peak load
- Maintain for short period
- Return to normal

### Soak Test
- Constant moderate load
- Run for 1+ hours
- Detect memory leaks and degradation

## Viewing Results

Reports are generated in `reports/` directory with:
- HTML summary
- JSON data
- Charts and graphs

Generate report:
```bash
npm run report
```

## CI/CD Integration

Performance tests run in CI on:
- Pull requests (smoke tests)
- Nightly builds (full suite)
- Release candidates (comprehensive)

## Custom Scenarios

Create custom test in `scenarios/`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:3000/api/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```
