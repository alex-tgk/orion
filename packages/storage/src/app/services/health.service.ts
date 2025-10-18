import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { S3Service } from './s3.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: boolean;
    s3: boolean;
  };
}

/**
 * Health Service for checking service health
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly database: DatabaseService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Perform comprehensive health check
   */
  async check(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      s3: await this.checkS3(),
    };

    const status = checks.database && checks.s3 ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      return await this.database.healthCheck();
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * Check S3 connectivity
   */
  private async checkS3(): Promise<boolean> {
    try {
      // Try to list objects or check bucket access
      const testKey = '.health-check';
      await this.s3Service.exists(testKey);
      return true;
    } catch (error: any) {
      // If it's a NotFound error, S3 is accessible
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return true;
      }
      this.logger.error('S3 health check failed', error);
      return false;
    }
  }
}
