import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { StatsService } from '../services/stats.service';
import { ObservabilityService } from '../services/observability.service';
import { CacheService } from '../services/cache.service';
import { SystemStatsDto } from '../dto/system-stats.dto';
import { SystemOverviewDto } from '../dto/system-overview.dto';

/**
 * System Controller
 *
 * Provides REST API endpoints for system-wide monitoring and statistics.
 * This controller aggregates data across all ORION services to provide
 * high-level insights into the platform's health and performance.
 *
 * Key Features:
 * - System-wide statistics aggregation
 * - High-level system overview
 * - Health summary across all services
 * - Cache management utilities
 *
 * @example
 * GET /api/system/stats - Aggregate statistics across all services
 * GET /api/system/overview - High-level system health overview
 */
@ApiTags('System')
@Controller('api/system')
export class SystemController {
  private readonly logger = new Logger(SystemController.name);

  constructor(
    private readonly statsService: StatsService,
    private readonly observabilityService: ObservabilityService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get aggregate system statistics
   *
   * Returns comprehensive statistics aggregated across all ORION services
   * including service counts, request metrics, resource usage, error rates,
   * and uptime information.
   *
   * Statistics are cached for performance. Use different time ranges to
   * analyze system behavior over various periods.
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get system statistics',
    description:
      'Returns aggregate statistics across all ORION services including service counts, ' +
      'request metrics, resource usage (CPU, memory, database), error rates, and uptime information. ' +
      'Results are cached for performance.',
  })
  @ApiQuery({
    name: 'timeRange',
    description: 'Time range for statistics in minutes (default: 60)',
    required: false,
    example: 60,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'System statistics retrieved successfully',
    type: SystemStatsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time range parameter',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getSystemStats(@Query('timeRange') timeRange?: number): Promise<SystemStatsDto> {
    try {
      const range = this.parseTimeRange(timeRange);
      this.logger.log(`Fetching system statistics (${range}m range)`);

      const stats = await this.statsService.getSystemStats(range);
      return stats;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get system stats: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve system statistics',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get high-level system overview
   *
   * Returns a simplified, high-level overview of the ORION platform including
   * overall health status, service summary, key metrics, and active alerts.
   * Perfect for dashboard displays and quick status checks.
   */
  @Get('overview')
  @ApiOperation({
    summary: 'Get system overview',
    description:
      'Returns a high-level overview of the ORION platform including overall health status, ' +
      'service summary, key performance indicators, and active alerts. Optimized for dashboard displays.',
  })
  @ApiResponse({
    status: 200,
    description: 'System overview retrieved successfully',
    type: SystemOverviewDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getSystemOverview(): Promise<SystemOverviewDto> {
    try {
      this.logger.log('Fetching system overview');

      // Fetch key data in parallel
      const [healthSummary, servicesList, stats] = await Promise.all([
        this.statsService.getHealthSummary(),
        this.observabilityService.getServicesList(),
        this.statsService.getSystemStats(60), // Last hour
      ]);

      const overview: SystemOverviewDto = {
        overallHealth: healthSummary.overall,
        totalServices: servicesList.total,
        healthyServices: servicesList.healthy,
        degradedServices: servicesList.degraded,
        unhealthyServices: servicesList.unhealthy,
        unknownServices: servicesList.unknown,
        keyMetrics: {
          totalRequests: stats.requests.total,
          avgResponseTime: stats.requests.avgResponseTime,
          errorRate: stats.requests.errorRate,
          totalMemoryUsed: stats.resources.totalMemoryUsed,
          avgCpuUsage: stats.resources.avgCpuUsage,
        },
        uptime: {
          systemUptime: stats.uptime.systemUptime,
          avgServiceUptime: stats.uptime.avgServiceUptime,
        },
        timestamp: new Date().toISOString(),
      };

      return overview;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get system overview: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve system overview',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get quick health summary
   *
   * Returns a minimal health summary suitable for monitoring tools
   * and health check endpoints. Very fast response time.
   */
  @Get('health/summary')
  @ApiOperation({
    summary: 'Get health summary',
    description:
      'Returns a quick overview of system health status with minimal data. ' +
      'Optimized for fast response times, suitable for monitoring tools and health checks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        overall: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
          description: 'Overall system health status',
        },
        services: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            running: { type: 'number' },
            healthy: { type: 'number' },
            degraded: { type: 'number' },
            unhealthy: { type: 'number' },
            unknown: { type: 'number' },
          },
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getHealthSummary() {
    try {
      this.logger.debug('Fetching health summary');
      return await this.statsService.getHealthSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get health summary: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve health summary',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get cache statistics
   *
   * Returns information about the caching layer including whether Redis
   * is available, in-memory cache size, and cache type being used.
   * Useful for debugging and monitoring cache performance.
   */
  @Get('cache/stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description:
      'Returns information about the caching layer including Redis availability, ' +
      'in-memory cache size, and active cache type. Useful for debugging and monitoring.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        redisAvailable: {
          type: 'boolean',
          description: 'Whether Redis is available and connected',
        },
        inMemoryCacheSize: {
          type: 'number',
          description: 'Number of entries in the in-memory cache',
        },
        cacheType: {
          type: 'string',
          enum: ['redis', 'in-memory'],
          description: 'Active cache type',
        },
      },
    },
  })
  async getCacheStats() {
    try {
      this.logger.debug('Fetching cache statistics');
      return this.cacheService.getStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get cache stats: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve cache statistics',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Parse and validate time range parameter
   */
  private parseTimeRange(timeRange?: number): number {
    if (timeRange === undefined) {
      return 60; // Default to 60 minutes
    }

    const range = parseInt(String(timeRange), 10);

    if (isNaN(range)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid time range parameter',
          error: 'Bad Request',
          details: 'Time range must be a valid number',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (range < 1 || range > 10080) {
      // Max 1 week
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Time range out of bounds',
          error: 'Bad Request',
          details: 'Time range must be between 1 and 10080 minutes (1 week)',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return range;
  }
}
