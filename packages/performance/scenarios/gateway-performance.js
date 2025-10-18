/**
 * Gateway Performance Test
 * Tests API Gateway performance and routing
 */

import http from 'k6/http';
import { check, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const routingDuration = new Trend('routing_duration');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    routing_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('Gateway Routing', () => {
    const routes = [
      '/api/users',
      '/api/notifications',
      '/api/auth/profile',
      '/api/settings',
    ];

    routes.forEach((route) => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}${route}`);

      check(res, {
        'status is 200': (r) => r.status === 200,
        'has correct content-type': (r) =>
          r.headers['Content-Type'].includes('application/json'),
      });

      routingDuration.add(Date.now() - start);

      // Check for cache headers
      if (res.headers['X-Cache-Hit']) {
        cacheHits.add(1);
      } else {
        cacheMisses.add(1);
      }
    });
  });
}

export function handleSummary(data) {
  return {
    'reports/gateway-performance-summary.json': JSON.stringify(data, null, 2),
  };
}
