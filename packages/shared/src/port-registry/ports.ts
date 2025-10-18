/**
 * Port Registry
 *
 * Centralized port allocation for all ORION services.
 * This prevents port conflicts during development.
 */

export const SERVICE_PORTS = {
  // Main Gateway
  GATEWAY: 3000,

  // Core Services
  AUTH_SERVICE: 3001,
  USER_SERVICE: 3002,
  NOTIFICATION_SERVICE: 3003,

  // Future Services (Reserved)
  ANALYTICS_SERVICE: 3004,
  SCHEDULER_SERVICE: 3005,
  WEBHOOK_SERVICE: 3006,
  AB_TESTING_SERVICE: 3007,
  STORAGE_SERVICE: 3008,
  CACHE_SERVICE: 3009,

  // Infrastructure
  POSTGRES: 5432,
  REDIS: 6379,
  RABBITMQ: 5672,
  RABBITMQ_MANAGEMENT: 15672,

  // Management Tools
  ADMINER: 8080,
  REDIS_COMMANDER: 8081,
} as const;

export type ServicePort = (typeof SERVICE_PORTS)[keyof typeof SERVICE_PORTS];

/**
 * Get service URL for internal communication
 */
export function getServiceUrl(
  serviceName: keyof typeof SERVICE_PORTS,
  protocol = 'http',
): string {
  const port = SERVICE_PORTS[serviceName];
  const host =
    process.env['NODE_ENV'] === 'production'
      ? `${serviceName.toLowerCase().replace('_SERVICE', '')}-service`
      : 'localhost';

  return `${protocol}://${host}:${port}`;
}
