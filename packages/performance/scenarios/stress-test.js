/**
 * Stress Test Scenario
 * Tests system under extreme load to find breaking points
 *
 * Gradually increases load until the system fails,
 * helping identify maximum capacity and failure modes.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 300 },   // Ramp up to 300 users
    { duration: '5m', target: 400 },   // Ramp up to 400 users
    { duration: '5m', target: 500 },   // Ramp up to 500 users
    { duration: '10m', target: 500 },  // Stay at 500 users
    { duration: '5m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'], // 99% of requests must complete below 5s
    http_req_failed: ['rate<0.10'],    // Allow up to 10% errors under stress
    errors: ['rate<0.15'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // High load API requests
  const endpoints = [
    '/api/users',
    '/api/auth/profile',
    '/api/notifications',
    '/api/settings',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 5s': (r) => r.timings.duration < 5000,
  });

  errorRate.add(!success);

  // Minimal sleep to maximize load
  sleep(0.1);
}

export function handleSummary(data) {
  return {
    'reports/stress-test-summary.json': JSON.stringify(data, null, 2),
  };
}
