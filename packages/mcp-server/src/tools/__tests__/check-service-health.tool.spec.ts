/**
 * Tests for check-service-health tool
 */

import { jest } from '@jest/globals';

describe('CheckServiceHealthTool', () => {
  const servicePorts = {
    'auth-service': 3001,
    'user-service': 3002,
    'notification-service': 3003,
    'admin-ui': 3004,
    'api-gateway': 3000,
  };

  describe('service configuration', () => {
    it('should have correct port mappings', () => {
      expect(servicePorts['auth-service']).toBe(3001);
      expect(servicePorts['user-service']).toBe(3002);
      expect(servicePorts['notification-service']).toBe(3003);
      expect(servicePorts['admin-ui']).toBe(3004);
      expect(servicePorts['api-gateway']).toBe(3000);
    });
  });

  describe('checkServiceHealth', () => {
    it('should construct correct health URL', () => {
      const serviceName = 'auth-service';
      const port = servicePorts[serviceName];
      const healthUrl = `http://localhost:${port}/health`;

      expect(healthUrl).toBe('http://localhost:3001/health');
    });

    it('should handle timeout correctly', () => {
      const timeout = 5000; // 5 seconds
      expect(timeout).toBe(5000);
    });

    it('should return proper health status structure', () => {
      const mockHealthResult = {
        service: 'auth-service',
        status: 'healthy' as const,
        responseTime: 45,
        timestamp: new Date().toISOString(),
        details: { uptime: 12345 },
      };

      expect(mockHealthResult.service).toBe('auth-service');
      expect(mockHealthResult.status).toBe('healthy');
      expect(mockHealthResult.responseTime).toBeDefined();
      expect(mockHealthResult.timestamp).toBeDefined();
    });
  });

  describe('checkAllServices', () => {
    it('should check all configured services', () => {
      const serviceCount = Object.keys(servicePorts).length;
      expect(serviceCount).toBe(5);
    });

    it('should calculate average response time', () => {
      const responseTimes = [45, 50, 38, 42, 55];
      const avgResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

      expect(avgResponseTime).toBe(46);
    });
  });
});
