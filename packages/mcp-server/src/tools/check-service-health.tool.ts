/**
 * Check Service Health Tool
 *
 * Performs health checks on ORION microservices and returns detailed status.
 * Supports checking individual services or all services at once.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import type { HealthCheckResult } from './types';

const SERVICE_PORTS = {
  'auth-service': 3001,
  'user-service': 3002,
  'notification-service': 3003,
  'admin-ui': 3004,
  'api-gateway': 3000,
};

/**
 * Perform HTTP health check on a service
 */
async function checkServiceHealth(
  serviceName: string,
  port: number
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const healthUrl = `http://localhost:${port}/health`;

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();

      return {
        service: serviceName,
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        details: data,
      };
    } else {
      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      service: serviceName,
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check health of all ORION services
 */
async function checkAllServices(): Promise<HealthCheckResult[]> {
  const checks = Object.entries(SERVICE_PORTS).map(([name, port]) =>
    checkServiceHealth(name, port)
  );

  return Promise.all(checks);
}

/**
 * Register the check-service-health tool with MCP server
 */
export function registerCheckServiceHealthTool(server: McpServer): void {
  server.tool(
    'check_service_health',
    'Check health status of ORION microservices',
    {
      service: {
        type: 'string',
        description:
          'Service name to check (auth-service, user-service, notification-service, admin-ui, api-gateway) or "all" for all services',
      },
    },
    async ({ service }) => {
      const serviceName = (service as string).toLowerCase();

      if (serviceName === 'all') {
        const results = await checkAllServices();

        const summary = {
          totalServices: results.length,
          healthy: results.filter((r) => r.status === 'healthy').length,
          unhealthy: results.filter((r) => r.status === 'unhealthy').length,
          avgResponseTime:
            results.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
            results.length,
        };

        return {
          summary,
          services: results,
          timestamp: new Date().toISOString(),
        };
      } else {
        const port = SERVICE_PORTS[serviceName as keyof typeof SERVICE_PORTS];

        if (!port) {
          return {
            error: `Unknown service: ${service}`,
            availableServices: Object.keys(SERVICE_PORTS),
          };
        }

        const result = await checkServiceHealth(serviceName, port);
        return result;
      }
    }
  );
}
