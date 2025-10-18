import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { SessionService } from './session.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      latency?: number;
      error?: string;
    };
    redis: {
      status: 'connected' | 'disconnected' | 'error';
      error?: string;
    };
  };
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu?: {
      usage: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version = process.env.npm_package_version || '1.0.0';
  private readonly environment = process.env.NODE_ENV || 'development';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const [databaseStatus, redisStatus, metrics] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.getMetrics(),
    ]);

    const overallStatus = this.determineOverallStatus(databaseStatus, redisStatus);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.version,
      environment: this.environment,
      services: {
        database: databaseStatus,
        redis: redisStatus,
      },
      metrics,
    };
  }

  private async checkDatabase(): Promise<HealthStatus['services']['database']> {
    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        status: 'connected',
        latency,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Database health check failed: ${err.message}`);

      return {
        status: 'error',
        error: err.message,
      };
    }
  }

  private checkRedis(): HealthStatus['services']['redis'] {
    const status = this.sessionService.getRedisStatus();

    return {
      status: status === 'connected' ? 'connected' : 'disconnected',
      ...(status === 'disconnected' && {
        error: 'Redis connection unavailable',
      }),
    };
  }

  private getMetrics(): HealthStatus['metrics'] {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;

    return {
      memory: {
        used: Math.round(usedMemory / 1024 / 1024), // Convert to MB
        total: Math.round(totalMemory / 1024 / 1024), // Convert to MB
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      ...(process.cpuUsage && {
        cpu: {
          usage: Math.round((process.cpuUsage().user + process.cpuUsage().system) / 1000), // Convert to milliseconds
        },
      }),
    };
  }

  private determineOverallStatus(
    database: HealthStatus['services']['database'],
    redis: HealthStatus['services']['redis'],
  ): HealthStatus['status'] {
    // If database is down, service is unhealthy
    if (database.status === 'error' || database.status === 'disconnected') {
      return 'unhealthy';
    }

    // If Redis is down, service is degraded (can still function)
    if (redis.status === 'disconnected' || redis.status === 'error') {
      return 'degraded';
    }

    // If database latency is high, service is degraded
    if (database.latency && database.latency > 100) {
      return 'degraded';
    }

    return 'healthy';
  }

  async getLiveness(): Promise<{ alive: boolean; timestamp: string }> {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{
    ready: boolean;
    checks: {
      database: boolean;
      redis: boolean;
    };
    timestamp: string;
  }> {
    const [dbHealthy, redisHealthy] = await Promise.all([
      this.isDatabaseHealthy(),
      this.isRedisHealthy(),
    ]);

    return {
      ready: dbHealthy, // Only require database for readiness
      checks: {
        database: dbHealthy,
        redis: redisHealthy,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async isDatabaseHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn('Database not ready');
      return false;
    }
  }

  private isRedisHealthy(): boolean {
    return this.sessionService.getRedisStatus() === 'connected';
  }
}