/**
 * Load Test Scenario
 * Tests normal expected load conditions
 *
 * Simulates typical user traffic patterns to ensure the system
 * can handle expected production load.
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const apiDuration = new Trend('api_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // HTTP request failure rate
    http_req_failed: ['rate<0.01'], // Less than 1% errors
    // Custom thresholds
    errors: ['rate<0.05'],
    auth_duration: ['p(95)<400'],
    api_duration: ['p(95)<300'],
  },
  // HTML report output
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = __ENV.API_VERSION || 'v1';

// Test data
const testUsers = [
  { email: 'user1@test.com', password: 'Test123!' },
  { email: 'user2@test.com', password: 'Test123!' },
  { email: 'user3@test.com', password: 'Test123!' },
];

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Version: ${API_VERSION}`);

  // Health check
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'health check passed': (r) => r.status === 200,
  });

  return { baseUrl: BASE_URL, apiVersion: API_VERSION };
}

/**
 * Main test function - runs for each VU
 */
export default function (data) {
  const { baseUrl, apiVersion } = data;

  // Select random user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  group('Authentication Flow', () => {
    // Login
    const loginStart = Date.now();
    const loginRes = http.post(
      `${baseUrl}/api/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has token': (r) => r.json('tokens.accessToken') !== undefined,
    });

    errorRate.add(!loginSuccess);
    authDuration.add(Date.now() - loginStart);

    if (!loginSuccess) {
      return; // Skip rest of test if login fails
    }

    const token = loginRes.json('tokens.accessToken');
    sleep(1);

    // Get user profile
    const profileRes = http.get(`${baseUrl}/api/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
      'profile has user data': (r) => r.json('email') !== undefined,
    });

    sleep(1);
  });

  group('API Operations', () => {
    const apiStart = Date.now();

    // Simulate various API calls
    const endpoints = [
      '/api/users',
      '/api/notifications',
      '/api/settings',
    ];

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const apiRes = http.get(`${baseUrl}${endpoint}`);

    const apiSuccess = check(apiRes, {
      'api status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    errorRate.add(!apiSuccess);
    apiDuration.add(Date.now() - apiStart);

    sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
  });

  // Think time - simulate user reading/processing
  sleep(Math.random() * 3 + 2); // Random sleep between 2-5 seconds
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('Load test completed');
}

/**
 * Custom summary handler
 */
export function handleSummary(data) {
  console.log('Preparing summary...');

  return {
    'reports/load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  const colors = opts.enableColors !== false;

  let summary = '\n';
  summary += indent + '═══════════════════════════════════════════════\n';
  summary += indent + '     LOAD TEST SUMMARY\n';
  summary += indent + '═══════════════════════════════════════════════\n\n';

  // Metrics
  if (data.metrics) {
    summary += indent + 'Metrics:\n';
    summary += indent + '───────────────────────────────────────────────\n';

    Object.keys(data.metrics).forEach((metricName) => {
      const metric = data.metrics[metricName];
      if (metric.type === 'trend' && metric.values) {
        summary += indent + `  ${metricName}:\n`;
        summary += indent + `    avg: ${metric.values.avg.toFixed(2)}ms\n`;
        summary += indent + `    p95: ${metric.values['p(95)'].toFixed(2)}ms\n`;
        summary += indent + `    p99: ${metric.values['p(99)'].toFixed(2)}ms\n`;
      } else if (metric.type === 'rate' && metric.values) {
        summary += indent + `  ${metricName}: ${(metric.values.rate * 100).toFixed(2)}%\n`;
      }
    });
    summary += '\n';
  }

  // Thresholds
  if (data.root_group && data.root_group.checks) {
    const passed = data.root_group.checks.filter((c) => c.passes === c.fails + c.passes);
    const failed = data.root_group.checks.filter((c) => c.passes !== c.fails + c.passes);

    summary += indent + 'Checks:\n';
    summary += indent + '───────────────────────────────────────────────\n';
    summary += indent + `  Passed: ${passed.length}\n`;
    summary += indent + `  Failed: ${failed.length}\n\n`;

    if (failed.length > 0) {
      summary += indent + 'Failed Checks:\n';
      failed.forEach((check) => {
        summary += indent + `  ✗ ${check.name}\n`;
      });
      summary += '\n';
    }
  }

  summary += indent + '═══════════════════════════════════════════════\n\n';

  return summary;
}
