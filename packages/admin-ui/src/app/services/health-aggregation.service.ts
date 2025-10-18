import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';
import { ServiceDiscoveryService, ServiceInfo } from './service-discovery.service';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  responseTime: number;
  details?: {
    version?: string;
    uptime?: number;
    memory?: {
      used: number;
      total: number;
    };
    cpu?: number;
    dependencies?: Record<string, string>;
  };
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  services: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

/**
 * Health Aggregation Service
 *
 * Polls health endpoints from all discovered services and aggregates health status.
 */
@Injectable()
export class HealthAggregationService {
  private readonly logger = new Logger(HealthAggregationService.name);
  private healthCheckInterval: NodeJS.Timer | null = null;
  private lastHealthStatus: SystemHealth | null = null;

  constructor(
    private readonly serviceDiscovery: ServiceDiscoveryService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.startHealthMonitoring();
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    // Initial health check
    this.checkSystemHealth();

    // Periodic health checks
    const interval = this.configService.get<number>('adminUi.monitoring.healthCheckInterval', 30000);
    this.healthCheckInterval = setInterval(() => {
      this.checkSystemHealth();
    }, interval);
  }

  /**
   * Check health of all services
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const services = this.serviceDiscovery.getAllServices();
    const healthChecks = await Promise.allSettled(
      services.map(service => this.checkServiceHealth(service))
    );

    const results: HealthCheckResult[] = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: services[index].name,
          status: 'unhealthy' as const,
          timestamp: new Date(),
          responseTime: 0,
          error: result.reason?.message || 'Health check failed',
        };
      }
    });

    const systemHealth = this.aggregateHealth(results);
    this.lastHealthStatus = systemHealth;

    // Emit health status event
    this.eventEmitter.emit('health.updated', systemHealth);

    // Log critical issues
    if (systemHealth.overall === 'critical') {
      this.logger.error('System health is critical', systemHealth.summary);
    } else if (systemHealth.overall === 'degraded') {
      this.logger.warn('System health is degraded', systemHealth.summary);
    }

    return systemHealth;
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(service: ServiceInfo): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const timeout = this.configService.get<number>('adminUi.services.auth.timeout', 5000);
      const response = await firstValueFrom(
        this.httpService.get(`${service.url}/health`, {
          timeout,
          validateStatus: () => true, // Don't throw on non-2xx status
        })
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200;

      // Update service status in discovery
      this.serviceDiscovery.updateServiceStatus(
        service.name,
        isHealthy ? 'online' : 'offline'
      );

      return {
        service: service.name,
        status: this.determineHealthStatus(response.status, responseTime),
        timestamp: new Date(),
        responseTime,
        details: response.data,
      };
    } catch (error) {
      this.serviceDiscovery.updateServiceStatus(service.name, 'offline');

      return {
        service: service.name,
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Determine health status based on response
   */
  private determineHealthStatus(
    statusCode: number,
    responseTime: number
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (statusCode !== 200) {
      return 'unhealthy';
    }

    // Consider service degraded if response time is high
    const degradedThreshold = 2000; // 2 seconds
    if (responseTime > degradedThreshold) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Aggregate individual health checks into system health
   */
  private aggregateHealth(checks: HealthCheckResult[]): SystemHealth {
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
    };

    let overall: 'healthy' | 'degraded' | 'critical';
    if (summary.unhealthy > summary.total * 0.5) {
      overall = 'critical';
    } else if (summary.unhealthy > 0 || summary.degraded > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      timestamp: new Date(),
      services: checks,
      summary,
    };
  }

  /**
   * Get current system health
   */
  getCurrentHealth(): SystemHealth | null {
    return this.lastHealthStatus;
  }

  /**
   * Get health history for a specific service
   */
  async getServiceHealthHistory(
    serviceName: string,
    duration: number = 3600000 // 1 hour
  ): Promise<HealthCheckResult[]> {
    // This would typically query from a time-series database
    // For now, return current status
    const service = this.serviceDiscovery.getService(serviceName);
    if (!service) {
      return [];
    }

    const currentHealth = await this.checkServiceHealth(service);
    return [currentHealth];
  }

  /**
   * Clean up on module destroy
   */
  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}