import { Injectable, Logger } from '@nestjs/common';
import { WebhookRepository } from './webhook.repository';

/**
 * Health check service for webhooks
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly repository: WebhookRepository) {}

  /**
   * Check overall service health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    checks: {
      database: { status: 'up' | 'down'; responseTime?: number };
    };
  }> {
    const timestamp = new Date().toISOString();
    const checks = {
      database: await this.checkDatabase(),
    };

    const status =
      checks.database.status === 'up'
        ? 'healthy'
        : 'unhealthy';

    return {
      status,
      timestamp,
      checks,
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    responseTime?: number;
  }> {
    const start = Date.now();
    try {
      await this.repository.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      return { status: 'up', responseTime };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return { status: 'down' };
    }
  }
}
