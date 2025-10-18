import { Injectable, Logger } from '@nestjs/common';
import { PortRegistryService } from '@orion/shared';
import axios, { AxiosError } from 'axios';
import {
  ServiceHealthDto,
  ServiceListItemDto,
  ServicesListDto,
  ServiceStatus,
} from '../dto/service-health.dto';
import { CacheService } from './cache.service';

interface HealthCheckResult {
  serviceName: string;
  status: ServiceStatus;
  health?: any;
  error?: string;
  responseTime?: number;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private readonly CACHE_TTL = 30; // 30 seconds cache
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds timeout

  // All ORION services
  private readonly KNOWN_SERVICES = [
    'auth',
    'gateway',
    'orchestrator',
    'ai-interface',
    'mcp-server',
    'cache',
    'config',
    'logger',
    'analytics',
    'notifications',
    'webhooks',
    'search',
    'storage',
    'audit',
    'scheduler',
    'secrets',
    'vector-db',
    'migrations',
    'admin-ui',
  ];

  constructor(
    private readonly portRegistry: PortRegistryService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get list of all services with their health status
   */
  async getServicesList(): Promise<ServicesListDto> {
    const cacheKey = 'observability:services:list';
    const cached = await this.cacheService.get<ServicesListDto>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached services list');
      return cached;
    }

    const registeredServices = await this.portRegistry.listServices();
    const now = new Date().toISOString();

    // Perform health checks in parallel
    const healthChecks = await Promise.all(
      registeredServices.map((service) => this.checkServiceHealth(service.serviceName)),
    );

    const services: ServiceListItemDto[] = registeredServices.map((service, index) => {
      const healthCheck = healthChecks[index];

      return {
        serviceName: service.serviceName,
        status: healthCheck.status,
        host: service.host,
        port: service.port,
        url: `http://${service.host}:${service.port}`,
        startedAt: service.startedAt,
        lastCheck: now,
        responseTime: healthCheck.responseTime,
      };
    });

    // Count services by status
    const statusCounts = services.reduce(
      (acc, service) => {
        acc[service.status]++;
        return acc;
      },
      {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0,
      } as Record<ServiceStatus, number>,
    );

    const result: ServicesListDto = {
      services,
      total: services.length,
      healthy: statusCounts.healthy,
      degraded: statusCounts.degraded,
      unhealthy: statusCounts.unhealthy,
      unknown: statusCounts.unknown,
      timestamp: now,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, result, { ttl: this.CACHE_TTL });

    return result;
  }

  /**
   * Get detailed health information for a specific service
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealthDto> {
    const cacheKey = `observability:health:${serviceName}`;
    const cached = await this.cacheService.get<ServiceHealthDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached health for ${serviceName}`);
      return cached;
    }

    const serviceInfo = await this.portRegistry.getServiceInfo(serviceName);
    if (!serviceInfo) {
      return {
        serviceName,
        status: ServiceStatus.UNKNOWN,
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: 'unknown',
        environment: 'unknown',
        error: 'Service not registered',
      };
    }

    try {
      const startTime = Date.now();
      const response = await axios.get(`${serviceInfo.healthEndpoint}`, {
        timeout: this.REQUEST_TIMEOUT,
        validateStatus: () => true, // Don't throw on any status
      });
      const responseTime = Date.now() - startTime;

      const healthData = response.data;

      // Map the health data to our DTO
      const health: ServiceHealthDto = {
        serviceName,
        status: this.mapHealthStatus(healthData.status),
        timestamp: healthData.timestamp || new Date().toISOString(),
        uptime: healthData.uptime || 0,
        version: healthData.version || 'unknown',
        environment: healthData.environment || 'unknown',
        services: healthData.services,
        metrics: healthData.metrics,
        url: `http://${serviceInfo.host}:${serviceInfo.port}`,
      };

      // Cache the result
      await this.cacheService.set(cacheKey, health, { ttl: this.CACHE_TTL });

      this.logger.debug(`Health check for ${serviceName} completed in ${responseTime}ms`);

      return health;
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Health check failed for ${serviceName}: ${message}`);

      return {
        serviceName,
        status: ServiceStatus.UNHEALTHY,
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: 'unknown',
        environment: 'unknown',
        error: message,
        url: `http://${serviceInfo.host}:${serviceInfo.port}`,
      };
    }
  }

  /**
   * Check health of a service and return minimal result
   */
  private async checkServiceHealth(serviceName: string): Promise<HealthCheckResult> {
    const serviceInfo = await this.portRegistry.getServiceInfo(serviceName);
    if (!serviceInfo) {
      return {
        serviceName,
        status: ServiceStatus.UNKNOWN,
        error: 'Service not registered',
      };
    }

    try {
      const startTime = Date.now();
      const response = await axios.get(`${serviceInfo.healthEndpoint}`, {
        timeout: this.REQUEST_TIMEOUT,
        validateStatus: () => true,
      });
      const responseTime = Date.now() - startTime;

      return {
        serviceName,
        status: this.mapHealthStatus(response.data.status),
        health: response.data,
        responseTime,
      };
    } catch (error) {
      return {
        serviceName,
        status: ServiceStatus.UNHEALTHY,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Discover available services by checking the port registry
   */
  async discoverServices(): Promise<string[]> {
    const registered = await this.portRegistry.listServices();
    return registered.map((service) => service.serviceName);
  }

  /**
   * Get list of known services (both registered and unregistered)
   */
  getKnownServices(): string[] {
    return [...this.KNOWN_SERVICES];
  }

  /**
   * Map health status from service to our enum
   */
  private mapHealthStatus(status: string): ServiceStatus {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return ServiceStatus.HEALTHY;
      case 'degraded':
        return ServiceStatus.DEGRADED;
      case 'unhealthy':
        return ServiceStatus.UNHEALTHY;
      default:
        return ServiceStatus.UNKNOWN;
    }
  }

  /**
   * Extract error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        return 'Connection refused - service may be down';
      }
      if (axiosError.code === 'ETIMEDOUT') {
        return 'Request timeout';
      }
      return axiosError.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Clear all cached health data
   */
  async clearHealthCache(): Promise<void> {
    await this.cacheService.clear('observability:*');
    this.logger.log('Health cache cleared');
  }
}
