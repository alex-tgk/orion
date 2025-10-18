import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ServiceDiscoveryService } from './service-discovery.service';
import { CacheService } from './cache.service';
import { ServiceMetricsDto } from '../dto/service-metrics.dto';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly CACHE_TTL = 60; // 60 seconds
  private readonly REQUEST_TIMEOUT = 5000;

  constructor(
    private readonly serviceDiscovery: ServiceDiscoveryService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get metrics for a specific service
   */
  async getServiceMetrics(serviceName: string): Promise<ServiceMetricsDto | null> {
    const cacheKey = `metrics:${serviceName}`;
    const cached = await this.cacheService.get<ServiceMetricsDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached metrics for ${serviceName}`);
      return cached;
    }

    const serviceInfo = await this.serviceDiscovery.getServiceInfo(serviceName);
    if (!serviceInfo) {
      return null;
    }

    try {
      const metricsUrl = `http://${serviceInfo.host}:${serviceInfo.port}/metrics`;
      const response = await axios.get(metricsUrl, {
        timeout: this.REQUEST_TIMEOUT,
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        this.logger.warn(`Metrics endpoint returned ${response.status} for ${serviceName}`);
        return null;
      }

      const metrics: ServiceMetricsDto = {
        serviceName,
        ...response.data,
        timestamp: new Date().toISOString(),
        timeRange: 60, // Default 60 minutes
      };

      await this.cacheService.set(cacheKey, metrics, { ttl: this.CACHE_TTL });

      return metrics;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to fetch metrics for ${serviceName}: ${message}`);
      return null;
    }
  }

  /**
   * Get aggregated metrics across all services
   */
  async getAggregatedMetrics() {
    const services = await this.serviceDiscovery.listServices();
    const metricsPromises = services.map((service) =>
      this.getServiceMetrics(service.serviceName),
    );
    const allMetrics = await Promise.all(metricsPromises);

    return allMetrics.filter((m) => m !== null);
  }
}
