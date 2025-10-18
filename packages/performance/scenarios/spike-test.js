/**
 * Spike Test Scenario
 * Tests system response to sudden traffic spikes
 *
 * Simulates sudden increases in traffic (e.g., viral content, sales events)
 * to ensure the system can handle rapid load changes.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Normal load
    { duration: '30s', target: 500 },  // Spike to 500 users
    { duration: '3m', target: 500 },   // Maintain spike
    { duration: '1m', target: 50 },    // Return to normal
    { duration: '1m', target: 50 },    // Stay at normal
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s during spike
    http_req_failed: ['rate<0.05'],    // Less than 5% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 2000,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'reports/spike-test-summary.json': JSON.stringify(data, null, 2),
  };
}
