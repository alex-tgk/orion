import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { AggregatedHealth, ServiceHealthStatus } from '../interfaces/service-health.interface';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Aggregate health status from all backend services
   */
  async checkHealth(): Promise<AggregatedHealth> {
    const timeout = this.configService.get<number>('gateway.HEALTH_CHECK_TIMEOUT', 5000);

    const serviceUrls = {
      auth: this.configService.get<string>('gateway.AUTH_SERVICE_URL'),
      user: this.configService.get<string>('gateway.USER_SERVICE_URL'),
      notification: this.configService.get<string>('gateway.NOTIFICATION_SERVICE_URL'),
    };

    const healthChecks = await Promise.allSettled([
      this.checkService('auth', `${serviceUrls.auth}/api/health`, timeout),
      this.checkService('user', `${serviceUrls.user}/api/health`, timeout),
      this.checkService('notification', `${serviceUrls.notification}/api/health`, timeout),
    ]);

    const services: Record<string, ServiceHealthStatus> = {};
    healthChecks.forEach((result, index) => {
      const serviceName = ['auth', 'user', 'notification'][index];
      if (result.status === 'fulfilled') {
        services[serviceName] = result.value;
      } else {
        services[serviceName] = {
          status: 'unhealthy',
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    // Determine overall status
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalCount = Object.keys(services).length;

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (healthyCount === totalCount) {
      overallStatus = 'healthy';
    } else if (healthyCount === 0) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check health of a single service
   */
  private async checkService(
    serviceName: string,
    url: string,
    timeout: number
  ): Promise<ServiceHealthStatus> {
    const startTime = Date.now();

    try {
      const response = await axios.get(url, {
        timeout,
        validateStatus: (status) => status < 500,
      });

      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        return {
          status: 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;

      this.logger.error(
        `Health check failed for ${serviceName}: ${axiosError.message}`
      );

      return {
        status: 'unhealthy',
        responseTime,
        error: axiosError.code === 'ECONNREFUSED'
          ? 'Connection refused'
          : axiosError.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
