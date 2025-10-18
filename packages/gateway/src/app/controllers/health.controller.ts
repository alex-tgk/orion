import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { ServiceDiscoveryService } from '../services/service-discovery.service';
import { RedisService } from '../services/redis.service';

/**
 * Health Check Controller
 *
 * Provides health check endpoints for monitoring gateway and backend services.
 *
 * Endpoints:
 * - GET /health - Overall health status
 * - GET /health/live - Liveness probe (is the service running?)
 * - GET /health/ready - Readiness probe (is the service ready to accept traffic?)
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly configService: ConfigService,
    private readonly serviceDiscovery: ServiceDiscoveryService,
    private readonly redis: RedisService
  ) {}

  /**
   * Overall health check
   * Checks all critical dependencies
   */
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Check Redis connection
      async () => {
        try {
          await this.redis.ping();
          return {
            redis: {
              status: 'up' as const,
            },
          };
        } catch (error) {
          return {
            redis: {
              status: 'down' as const,
              message: error.message,
            },
          };
        }
      },

      // Check Auth Service
      async () => {
        const instances = this.serviceDiscovery.getHealthyInstances('auth');
        return {
          auth: {
            status: instances.length > 0 ? ('up' as const) : ('down' as const),
            instances: instances.length,
          },
        };
      },

      // Check User Service
      async () => {
        const instances = this.serviceDiscovery.getHealthyInstances('user');
        return {
          user: {
            status: instances.length > 0 ? ('up' as const) : ('down' as const),
            instances: instances.length,
          },
        };
      },

      // Check Notification Service
      async () => {
        const instances = this.serviceDiscovery.getHealthyInstances(
          'notification'
        );
        return {
          notification: {
            status: instances.length > 0 ? ('up' as const) : ('down' as const),
            instances: instances.length,
          },
        };
      },
    ]);
  }

  /**
   * Liveness probe
   * Simple check to verify the service is running
   */
  @Get('live')
  @HealthCheck()
  live(): HealthCheckResult {
    return {
      status: 'ok',
      info: {
        gateway: {
          status: 'up',
        },
      },
      error: {},
      details: {
        gateway: {
          status: 'up',
        },
      },
    };
  }

  /**
   * Readiness probe
   * Checks if the service is ready to accept traffic
   */
  @Get('ready')
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      // Check if Redis is ready
      async () => {
        try {
          await this.redis.ping();
          return {
            redis: {
              status: 'up' as const,
            },
          };
        } catch (error) {
          throw new Error(`Redis not ready: ${error.message}`);
        }
      },

      // Check if at least one backend service is available
      async () => {
        const authReady = this.serviceDiscovery.isServiceAvailable('auth');
        const userReady = this.serviceDiscovery.isServiceAvailable('user');
        const notificationReady =
          this.serviceDiscovery.isServiceAvailable('notification');

        const anyReady = authReady || userReady || notificationReady;

        return {
          backendServices: {
            status: anyReady ? ('up' as const) : ('down' as const),
            auth: authReady,
            user: userReady,
            notification: notificationReady,
          },
        };
      },
    ]);
  }
}
