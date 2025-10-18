import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Health Service
 * Provides health check and readiness endpoints
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Health check
   */
  async getHealth() {
    const startTime = Date.now();

    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - startTime;

      return {
        status: 'healthy',
        service: 'analytics',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'healthy',
            latency: dbLatency,
          },
          memory: {
            status: 'healthy',
            usage: process.memoryUsage(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        service: 'analytics',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          memory: {
            status: 'healthy',
            usage: process.memoryUsage(),
          },
        },
      };
    }
  }

  /**
   * Readiness check
   */
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        service: 'analytics',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not_ready',
        service: 'analytics',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
