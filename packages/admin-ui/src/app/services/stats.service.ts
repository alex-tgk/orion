import { Injectable, Logger } from '@nestjs/common';
import {
  SystemStatsDto,
  ServiceStatsDto,
  RequestStatsDto,
  ResourceStatsDto,
  ErrorStatsDto,
  UpTimeStatsDto,
} from '../dto/system-stats.dto';
import { ObservabilityService } from './observability.service';
import { MetricsService } from './metrics.service';
import { EventsService } from './events.service';
import { CacheService } from './cache.service';
import { EventLevel } from '../dto/system-events.dto';
import { ServiceStatus } from '../dto/service-health.dto';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private readonly CACHE_TTL = 60; // 60 seconds cache

  constructor(
    private readonly observabilityService: ObservabilityService,
    private readonly metricsService: MetricsService,
    private readonly eventsService: EventsService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get aggregate system statistics
   */
  async getSystemStats(timeRange: number = 60): Promise<SystemStatsDto> {
    const cacheKey = `stats:system:${timeRange}`;
    const cached = await this.cacheService.get<SystemStatsDto>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached system stats');
      return cached;
    }

    const [servicesList, aggregatedMetrics, eventStats] = await Promise.all([
      this.observabilityService.getServicesList(),
      this.metricsService.getAggregatedMetrics(timeRange),
      this.eventsService.getEventStats(),
    ]);

    // Service statistics
    const services: ServiceStatsDto = {
      total: servicesList.total,
      running: servicesList.services.filter((s) => s.status !== ServiceStatus.UNKNOWN)
        .length,
      healthy: servicesList.healthy,
      degraded: servicesList.degraded,
      unhealthy: servicesList.unhealthy,
      unknown: servicesList.unknown,
    };

    // Request statistics
    const successRate =
      aggregatedMetrics.totalRequests > 0
        ? parseFloat(
            (
              ((aggregatedMetrics.totalRequests - aggregatedMetrics.totalErrors) /
                aggregatedMetrics.totalRequests) *
              100
            ).toFixed(2),
          )
        : 100;

    const requests: RequestStatsDto = {
      total: aggregatedMetrics.totalRequests,
      requestsPerSecond: parseFloat(
        (aggregatedMetrics.totalRequests / (timeRange * 60)).toFixed(2),
      ),
      avgResponseTime: aggregatedMetrics.avgResponseTime,
      successRate,
      errorRate: parseFloat((100 - successRate).toFixed(2)),
    };

    // Resource statistics
    const avgMemoryPerService =
      services.running > 0
        ? parseFloat((aggregatedMetrics.totalMemoryUsage / services.running).toFixed(2))
        : 0;

    // Calculate cache hit rate from service metrics
    const cacheHitRate = await this.calculateAverageCacheHitRate(timeRange);

    const resources: ResourceStatsDto = {
      totalMemoryUsed: aggregatedMetrics.totalMemoryUsage,
      avgMemoryPerService,
      avgCpuUsage: aggregatedMetrics.avgCpuUsage,
      totalDatabaseConnections: await this.calculateTotalDatabaseConnections(timeRange),
      cacheHitRate,
    };

    // Error statistics
    const errorRate = parseFloat(
      (aggregatedMetrics.totalErrors / (timeRange * 60)).toFixed(2),
    );

    const errors: ErrorStatsDto = {
      total: aggregatedMetrics.totalErrors,
      critical: eventStats.byLevel[EventLevel.CRITICAL] || 0,
      serverErrors: Math.floor(aggregatedMetrics.totalErrors * 0.3), // Estimate
      clientErrors: Math.floor(aggregatedMetrics.totalErrors * 0.7), // Estimate
      errorRate,
    };

    // Uptime statistics
    const uptimes = servicesList.services
      .filter((s) => s.startedAt)
      .map((s) => {
        const started = new Date(s.startedAt).getTime();
        return (Date.now() - started) / 1000;
      });

    const avgServiceUptime =
      uptimes.length > 0
        ? parseFloat(
            (uptimes.reduce((sum, uptime) => sum + uptime, 0) / uptimes.length).toFixed(
              2,
            ),
          )
        : 0;

    const oldestServiceUptime =
      uptimes.length > 0 ? Math.max(...uptimes) : 0;

    const uptime: UpTimeStatsDto = {
      systemUptime: process.uptime(),
      avgServiceUptime,
      oldestServiceUptime,
    };

    const stats: SystemStatsDto = {
      services,
      requests,
      resources,
      errors,
      uptime,
      timestamp: new Date().toISOString(),
      timeRange,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, stats, { ttl: this.CACHE_TTL });

    return stats;
  }

  /**
   * Calculate average cache hit rate across all services
   */
  private async calculateAverageCacheHitRate(timeRange: number): Promise<number> {
    try {
      const services = await this.observabilityService.discoverServices();
      const metricsPromises = services.map((serviceName) =>
        this.metricsService.getServiceMetrics(serviceName, timeRange).catch(() => null),
      );

      const allMetrics = (await Promise.all(metricsPromises)).filter((m) => m !== null);

      const cacheMetrics = allMetrics
        .filter((m) => m?.cache)
        .map((m) => m!.cache!.hitRate);

      if (cacheMetrics.length === 0) {
        return 0;
      }

      return parseFloat(
        (cacheMetrics.reduce((sum, rate) => sum + rate, 0) / cacheMetrics.length).toFixed(
          2,
        ),
      );
    } catch (error) {
      this.logger.error('Failed to calculate cache hit rate', error);
      return 0;
    }
  }

  /**
   * Calculate total database connections across all services
   */
  private async calculateTotalDatabaseConnections(timeRange: number): Promise<number> {
    try {
      const services = await this.observabilityService.discoverServices();
      const metricsPromises = services.map((serviceName) =>
        this.metricsService.getServiceMetrics(serviceName, timeRange).catch(() => null),
      );

      const allMetrics = (await Promise.all(metricsPromises)).filter((m) => m !== null);

      return allMetrics
        .filter((m) => m?.database)
        .reduce((sum, m) => sum + (m!.database!.activeConnections || 0), 0);
    } catch (error) {
      this.logger.error('Failed to calculate total database connections', error);
      return 0;
    }
  }

  /**
   * Get health summary
   */
  async getHealthSummary(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceStatsDto;
    timestamp: string;
  }> {
    const servicesList = await this.observabilityService.getServicesList();

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (servicesList.unhealthy > 0) {
      overall = 'unhealthy';
    } else if (servicesList.degraded > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      services: {
        total: servicesList.total,
        running: servicesList.services.filter(
          (s) => s.status !== ServiceStatus.UNKNOWN,
        ).length,
        healthy: servicesList.healthy,
        degraded: servicesList.degraded,
        unhealthy: servicesList.unhealthy,
        unknown: servicesList.unknown,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear stats cache
   */
  async clearStatsCache(): Promise<void> {
    await this.cacheService.clear('stats:*');
    this.logger.log('Stats cache cleared');
  }
}
