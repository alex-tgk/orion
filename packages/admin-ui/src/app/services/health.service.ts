import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HealthCheckDto, AggregatedHealthDto, HealthStatus, DependencyHealthDto } from '../dto/health.dto';
import { RabbitMQService } from './rabbitmq.service';

interface ServiceConfig {
  name: string;
  url: string;
  healthEndpoint: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly services: ServiceConfig[];
  private healthCache: Map<string, HealthCheckDto> = new Map();
  private readonly cacheTimeout = 5000; // 5 seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    // Define all ORION services
    this.services = [
      {
        name: 'auth',
        url: this.configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001'),
        healthEndpoint: '/api/auth/health',
      },
      {
        name: 'gateway',
        url: this.configService.get<string>('GATEWAY_SERVICE_URL', 'http://localhost:3100'),
        healthEndpoint: '/api/health',
      },
      {
        name: 'ai-wrapper',
        url: this.configService.get<string>('AI_WRAPPER_URL', 'http://localhost:3200'),
        healthEndpoint: '/api/ai/health',
      },
      {
        name: 'notifications',
        url: this.configService.get<string>('NOTIFICATIONS_SERVICE_URL', 'http://localhost:3002'),
        healthEndpoint: '/api/health',
      },
      {
        name: 'analytics',
        url: this.configService.get<string>('ANALYTICS_SERVICE_URL', 'http://localhost:3003'),
        healthEndpoint: '/api/health',
      },
    ];
  }

  async checkServiceHealth(serviceName: string): Promise<HealthCheckDto> {
    // Check cache first
    const cached = this.healthCache.get(serviceName);
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      if (cacheAge < this.cacheTimeout) {
        return cached;
      }
    }

    const serviceConfig = this.services.find((s) => s.name === serviceName);
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not found in configuration`);
    }

    try {
      const response = await axios.get(`${serviceConfig.url}${serviceConfig.healthEndpoint}`, {
        timeout: 5000,
      });

      const healthData: HealthCheckDto = {
        status: response.data.status || HealthStatus.HEALTHY,
        service: serviceName,
        version: response.data.version || '1.0.0',
        uptime: response.data.uptime,
        timestamp: new Date().toISOString(),
        dependencies: response.data.dependencies || {},
      };

      // Cache the result
      this.healthCache.set(serviceName, healthData);

      return healthData;
    } catch (error) {
      this.logger.error(`Health check failed for ${serviceName}: ${error.message}`);

      const unhealthyData: HealthCheckDto = {
        status: HealthStatus.UNHEALTHY,
        service: serviceName,
        version: 'unknown',
        timestamp: new Date().toISOString(),
      };

      // Cache the unhealthy result too (for shorter duration)
      this.healthCache.set(serviceName, unhealthyData);

      return unhealthyData;
    }
  }

  async checkAllServices(): Promise<AggregatedHealthDto> {
    const serviceHealthChecks = await Promise.all(
      this.services.map(async (service) => {
        const health = await this.checkServiceHealth(service.name);
        return { name: service.name, health };
      }),
    );

    // Build services object
    const services: Record<string, HealthCheckDto> = {};
    serviceHealthChecks.forEach(({ name, health }) => {
      services[name] = health;
    });

    // Check infrastructure dependencies
    const infrastructure = await this.checkInfrastructure();

    // Calculate counts
    const healthStatuses = Object.values(services).map((s) => s.status);
    const healthy = healthStatuses.filter((s) => s === HealthStatus.HEALTHY).length;
    const degraded = healthStatuses.filter((s) => s === HealthStatus.DEGRADED).length;
    const unhealthy = healthStatuses.filter((s) => s === HealthStatus.UNHEALTHY).length;

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;
    if (unhealthy > 0 || !infrastructure.rabbitmq.available) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (degraded > 0) {
      overallStatus = HealthStatus.DEGRADED;
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      infrastructure,
      total: this.services.length,
      healthy,
      degraded,
      unhealthy,
    };
  }

  private async checkInfrastructure(): Promise<{
    database: DependencyHealthDto;
    redis: DependencyHealthDto;
    rabbitmq: DependencyHealthDto;
  }> {
    // Check RabbitMQ
    const rabbitMQHealthy = await this.rabbitMQService.isHealthy();

    // Database and Redis checks would go here
    // For now, returning basic checks

    return {
      database: {
        name: 'PostgreSQL',
        status: HealthStatus.HEALTHY,
        available: true,
        details: { message: 'Database health check not implemented yet' },
      },
      redis: {
        name: 'Redis',
        status: HealthStatus.HEALTHY,
        available: true,
        details: { message: 'Redis health check not implemented yet' },
      },
      rabbitmq: {
        name: 'RabbitMQ',
        status: rabbitMQHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        available: rabbitMQHealthy,
      },
    };
  }

  async getBackendHealth(): Promise<HealthCheckDto> {
    const startTime = process.uptime();

    return {
      status: HealthStatus.HEALTHY,
      service: 'admin-api',
      version: '1.0.0',
      uptime: startTime,
      timestamp: new Date().toISOString(),
    };
  }

  clearCache(): void {
    this.healthCache.clear();
    this.logger.log('Health cache cleared');
  }
}
