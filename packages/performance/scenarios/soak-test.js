/**
 * Soak Test Scenario
 * Tests system reliability over extended period
 *
 * Runs at moderate load for extended duration to detect:
 * - Memory leaks
 * - Gradual performance degradation
 * - Resource exhaustion
 * - Database connection issues
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '5m', target: 100 },    // Ramp up to moderate load
    { duration: '60m', target: 100 },   // Maintain for 1 hour
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
    response_time: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const start = Date.now();

  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  responseTime.add(Date.now() - start);

  sleep(2); // Moderate pacing
}

export function handleSummary(data) {
  return {
    'reports/soak-test-summary.json': JSON.stringify(data, null, 2),
  };
}
