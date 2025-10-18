import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Service Instance Information
 */
export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  url: string;
  healthy: boolean;
  lastHealthCheck: Date;
  metadata?: Record<string, string>;
}

/**
 * Service Registration Options
 */
interface ServiceRegistration {
  name: string;
  instances: ServiceInstance[];
  healthCheckInterval: number;
  healthCheckPath: string;
}

/**
 * Service Discovery Service
 *
 * Provides service discovery and health checking for backend services.
 * Maintains a registry of available service instances and their health status.
 *
 * Features:
 * - Automatic service registration
 * - Periodic health checks
 * - Instance filtering (healthy only)
 * - Service metadata support
 */
@Injectable()
export class ServiceDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly services = new Map<string, ServiceRegistration>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {}

  async onModuleInit() {
    await this.registerServices();
    this.startHealthChecks();
  }

  /**
   * Register all backend services from configuration
   */
  private async registerServices(): Promise<void> {
    const services = [
      {
        name: 'auth',
        url: this.configService.get<string>('gateway.AUTH_SERVICE_URL'),
        healthPath: '/api/health',
      },
      {
        name: 'user',
        url: this.configService.get<string>('gateway.USER_SERVICE_URL'),
        healthPath: '/api/health',
      },
      {
        name: 'notification',
        url: this.configService.get<string>(
          'gateway.NOTIFICATION_SERVICE_URL'
        ),
        healthPath: '/api/health',
      },
    ];

    for (const service of services) {
      if (service.url) {
        await this.register(service.name, service.url, service.healthPath);
      }
    }
  }

  /**
   * Register a service with the discovery system
   */
  async register(
    name: string,
    url: string,
    healthCheckPath: string = '/health'
  ): Promise<void> {
    const urlObj = new URL(url);
    const instance: ServiceInstance = {
      id: `${name}-${urlObj.host}-${urlObj.port || 80}`,
      name,
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '80', 10),
      url,
      healthy: false,
      lastHealthCheck: new Date(),
    };

    let registration = this.services.get(name);
    if (!registration) {
      registration = {
        name,
        instances: [],
        healthCheckInterval: this.configService.get<number>(
          'gateway.healthCheckInterval',
          30000
        ),
        healthCheckPath,
      };
      this.services.set(name, registration);
    }

    // Check if instance already exists
    const existingIndex = registration.instances.findIndex(
      (i) => i.id === instance.id
    );
    if (existingIndex >= 0) {
      registration.instances[existingIndex] = instance;
    } else {
      registration.instances.push(instance);
    }

    // Perform initial health check
    await this.checkHealth(instance, healthCheckPath);

    this.logger.log(
      `Registered service: ${name} at ${url} (healthy: ${instance.healthy})`
    );
  }

  /**
   * Start periodic health checks for all services
   */
  private startHealthChecks(): void {
    this.services.forEach((registration, name) => {
      // Clear existing interval if any
      const existingInterval = this.healthCheckIntervals.get(name);
      if (existingInterval) {
        clearInterval(existingInterval);
      }

      // Start new interval
      const interval = setInterval(async () => {
        await this.performHealthChecks(registration);
      }, registration.healthCheckInterval);

      this.healthCheckIntervals.set(name, interval);

      this.logger.log(
        `Started health checks for ${name} (interval: ${registration.healthCheckInterval}ms)`
      );
    });
  }

  /**
   * Perform health checks on all instances of a service
   */
  private async performHealthChecks(
    registration: ServiceRegistration
  ): Promise<void> {
    const checks = registration.instances.map((instance) =>
      this.checkHealth(instance, registration.healthCheckPath)
    );

    await Promise.allSettled(checks);

    const healthyCount = registration.instances.filter(
      (i) => i.healthy
    ).length;
    const totalCount = registration.instances.length;

    if (healthyCount === 0) {
      this.logger.error(
        `All instances of ${registration.name} are unhealthy!`
      );
    } else if (healthyCount < totalCount) {
      this.logger.warn(
        `${registration.name}: ${healthyCount}/${totalCount} instances healthy`
      );
    }
  }

  /**
   * Check health of a single service instance
   */
  private async checkHealth(
    instance: ServiceInstance,
    healthCheckPath: string
  ): Promise<void> {
    const healthUrl = `${instance.url}${healthCheckPath}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, {
          timeout: 5000,
          validateStatus: (status) => status < 500,
        })
      );

      const wasHealthy = instance.healthy;
      instance.healthy = response.status === 200;
      instance.lastHealthCheck = new Date();

      if (!wasHealthy && instance.healthy) {
        this.logger.log(`Service ${instance.name} is now healthy: ${healthUrl}`);
      } else if (wasHealthy && !instance.healthy) {
        this.logger.warn(
          `Service ${instance.name} is now unhealthy: ${healthUrl}`
        );
      }
    } catch (error) {
      const wasHealthy = instance.healthy;
      instance.healthy = false;
      instance.lastHealthCheck = new Date();

      if (wasHealthy) {
        this.logger.error(
          `Health check failed for ${instance.name} at ${healthUrl}: ${error.message}`
        );
      }
    }
  }

  /**
   * Get all healthy instances of a service
   */
  getHealthyInstances(serviceName: string): ServiceInstance[] {
    const registration = this.services.get(serviceName);
    if (!registration) {
      return [];
    }
    return registration.instances.filter((instance) => instance.healthy);
  }

  /**
   * Get all instances of a service (healthy and unhealthy)
   */
  getAllInstances(serviceName: string): ServiceInstance[] {
    const registration = this.services.get(serviceName);
    if (!registration) {
      return [];
    }
    return [...registration.instances];
  }

  /**
   * Get a single healthy instance (for load balancing)
   */
  getInstance(serviceName: string): ServiceInstance | null {
    const instances = this.getHealthyInstances(serviceName);
    if (instances.length === 0) {
      return null;
    }
    // Simple round-robin (can be enhanced with more sophisticated load balancing)
    return instances[0];
  }

  /**
   * Check if a service has any healthy instances
   */
  isServiceAvailable(serviceName: string): boolean {
    return this.getHealthyInstances(serviceName).length > 0;
  }

  /**
   * Get service discovery statistics
   */
  getStats(): Record<string, {
    totalInstances: number;
    healthyInstances: number;
    unhealthyInstances: number;
  }> {
    const stats: Record<string, {
      totalInstances: number;
      healthyInstances: number;
      unhealthyInstances: number;
    }> = {};

    this.services.forEach((registration, name) => {
      const healthy = registration.instances.filter((i) => i.healthy).length;
      const total = registration.instances.length;

      stats[name] = {
        totalInstances: total,
        healthyInstances: healthy,
        unhealthyInstances: total - healthy,
      };
    });

    return stats;
  }

  /**
   * Deregister a service instance
   */
  deregister(serviceName: string, instanceId: string): void {
    const registration = this.services.get(serviceName);
    if (!registration) {
      return;
    }

    registration.instances = registration.instances.filter(
      (i) => i.id !== instanceId
    );

    this.logger.log(
      `Deregistered instance ${instanceId} from service ${serviceName}`
    );
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    this.healthCheckIntervals.forEach((interval) => clearInterval(interval));
    this.healthCheckIntervals.clear();
  }
}
