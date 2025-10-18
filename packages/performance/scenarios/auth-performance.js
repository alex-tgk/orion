/**
 * Authentication Performance Test
 * Tests authentication endpoints under load
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const loginDuration = new Trend('login_duration');
const tokenRefreshDuration = new Trend('token_refresh_duration');
const logoutDuration = new Trend('logout_duration');

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    login_duration: ['p(95)<500'],
    token_refresh_duration: ['p(95)<300'],
    logout_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('Authentication Operations', () => {
    // Login
    const loginStart = Date.now();
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'has access token': (r) => r.json('tokens.accessToken') !== undefined,
    });

    loginDuration.add(Date.now() - loginStart);

    if (loginRes.status === 200) {
      const { accessToken, refreshToken } = loginRes.json('tokens');

      sleep(1);

      // Token refresh
      const refreshStart = Date.now();
      const refreshRes = http.post(
        `${BASE_URL}/api/auth/refresh`,
        JSON.stringify({ refreshToken }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      check(refreshRes, {
        'refresh successful': (r) => r.status === 200,
      });

      tokenRefreshDuration.add(Date.now() - refreshStart);

      sleep(1);

      // Logout
      const logoutStart = Date.now();
      const logoutRes = http.post(
        `${BASE_URL}/api/auth/logout`,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      check(logoutRes, {
        'logout successful': (r) => r.status === 200,
      });

      logoutDuration.add(Date.now() - logoutStart);
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'reports/auth-performance-summary.json': JSON.stringify(data, null, 2),
  };
}
