import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  uptime: number;
  timestamp: string;
  checks: {
    redis: {
      status: 'up' | 'down';
      responseTime?: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Perform comprehensive health check
   */
  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const redisHealthy = await this.cacheService.healthCheck();
      const responseTime = Date.now() - startTime;

      const status: HealthStatus = {
        status: redisHealthy ? 'ok' : 'degraded',
        service: 'cache',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          redis: {
            status: redisHealthy ? 'up' : 'down',
            responseTime,
          },
        },
      };

      if (!redisHealthy) {
        this.logger.warn('Health check: Redis is down');
      }

      return status;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'down',
        service: 'cache',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          redis: {
            status: 'down',
          },
        },
      };
    }
  }

  /**
   * Simple readiness check
   */
  async isReady(): Promise<boolean> {
    try {
      return await this.cacheService.healthCheck();
    } catch (error) {
      return false;
    }
  }

  /**
   * Simple liveness check (always returns true if service is running)
   */
  isAlive(): boolean {
    return true;
  }
}
