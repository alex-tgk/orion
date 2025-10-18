import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@orion/shared';
import { CacheService } from './cache.service';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  checks?: {
    database?: { status: 'ok' | 'error'; message?: string };
    cache?: { status: 'ok' | 'error'; message?: string };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly serviceName: string;
  private readonly version = '1.0.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {
    this.serviceName = this.configService.get<string>('app.serviceName', 'user-service');
  }

  /**
   * Basic health check
   * Returns 200 if service is running
   */
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Liveness probe for Kubernetes
   * Checks if the application is alive
   */
  getLiveness(): HealthCheckResponse {
    return {
      status: 'ok',
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe for Kubernetes
   * Checks if the application is ready to accept traffic
   * Validates database and cache connections
   */
  async getReadiness(): Promise<HealthCheckResponse> {
    const checks = {
      database: await this.checkDatabase(),
      cache: await this.checkCache(),
    };

    const hasErrors = Object.values(checks).some((check) => check.status === 'error');
    const status = hasErrors ? 'degraded' : 'ok';

    return {
      status,
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Check cache (Redis) connectivity
   */
  private async checkCache(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const isConnected = this.cache.isConnected();
      if (!isConnected) {
        return {
          status: 'error',
          message: 'Cache is not connected',
        };
      }
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Cache health check failed', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Cache connection failed',
      };
    }
  }
}
