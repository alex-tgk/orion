import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ObservabilityService } from '../services/observability.service';
import { MetricsService } from '../services/metrics.service';
import { EventsService } from '../services/events.service';
import {
  ServicesListDto,
  ServiceHealthDto,
  ServiceListItemDto,
} from '../dto/service-health.dto';
import { ServiceMetricsDto } from '../dto/service-metrics.dto';
import { ServiceDetailsDto } from '../dto/service-details.dto';
import { SystemEventDto } from '../dto/system-events.dto';

/**
 * Services Controller
 *
 * Provides REST API endpoints for managing and monitoring ORION services.
 * This controller handles service discovery, health checks, metrics, and detailed service information.
 *
 * Key Features:
 * - Service discovery and listing
 * - Individual service health monitoring
 * - Service metrics collection
 * - Service event logs
 * - Detailed service information aggregation
 *
 * @example
 * GET /api/services - List all registered services
 * GET /api/services/auth - Get detailed info for auth service
 * GET /api/services/auth/health - Get health status for auth service
 * GET /api/services/auth/metrics - Get metrics for auth service
 */
@ApiTags('Services')
@Controller('api/services')
export class ServicesController {
  private readonly logger = new Logger(ServicesController.name);

  constructor(
    private readonly observabilityService: ObservabilityService,
    private readonly metricsService: MetricsService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * List all registered ORION services
   *
   * Returns a comprehensive list of all services registered in the ORION platform
   * with their current health status, connection details, and last check timestamp.
   *
   * Response includes aggregated counts by status (healthy, degraded, unhealthy, unknown).
   */
  @Get()
  @ApiOperation({
    summary: 'List all services',
    description:
      'Returns a list of all registered ORION services with their current health status, ' +
      'registration info, and last check time. Includes aggregated status counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Services list retrieved successfully',
    type: ServicesListDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error while fetching services',
  })
  async listServices(): Promise<ServicesListDto> {
    try {
      this.logger.log('Fetching all services list');
      return await this.observabilityService.getServicesList();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list services: ${message}`, error instanceof Error ? error.stack : undefined);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve services list',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get detailed information for a specific service
   *
   * Aggregates health, metrics, and recent events for a comprehensive service overview.
   * This endpoint combines data from multiple sources to provide a complete picture
   * of the service's current state.
   */
  @Get(':serviceName')
  @ApiOperation({
    summary: 'Get detailed service information',
    description:
      'Returns comprehensive information about a specific service including health status, ' +
      'metrics, recent events, and configuration details. Aggregates data from multiple sources.',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service to retrieve details for',
    example: 'auth',
    type: String,
  })
  @ApiQuery({
    name: 'timeRange',
    description: 'Time range for metrics in minutes (default: 60)',
    required: false,
    example: 60,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Service details retrieved successfully',
    type: ServiceDetailsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getServiceDetails(
    @Param('serviceName') serviceName: string,
    @Query('timeRange') timeRange?: number,
  ): Promise<ServiceDetailsDto> {
    try {
      const range = timeRange ? parseInt(String(timeRange), 10) : 60;
      this.logger.log(`Fetching details for service: ${serviceName} (${range}m range)`);

      // Fetch all data in parallel
      const [health, metrics, events] = await Promise.all([
        this.observabilityService.getServiceHealth(serviceName),
        this.metricsService.getServiceMetrics(serviceName, range).catch(() => null),
        this.eventsService.getEventsByService(serviceName, 50),
      ]);

      if (!health) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: `Service '${serviceName}' not found`,
            error: 'Not Found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const details: ServiceDetailsDto = {
        serviceName,
        health,
        metrics: metrics || undefined,
        recentEvents: events,
        lastUpdated: new Date().toISOString(),
      };

      return details;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get details for ${serviceName}: ${message}`, error instanceof Error ? error.stack : undefined);

      if (message.includes('not found')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: `Service '${serviceName}' not found`,
            error: 'Not Found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to retrieve details for service '${serviceName}'`,
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get health status for a specific service
   *
   * Returns detailed health information including status, uptime, version,
   * dependency health (database, redis), and resource metrics.
   */
  @Get(':serviceName/health')
  @ApiOperation({
    summary: 'Get service health status',
    description:
      'Returns detailed health information for a specific service including overall status, ' +
      'uptime, version, environment, dependency health (database, Redis), and resource metrics.',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service to check health for',
    example: 'auth',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Service health retrieved successfully',
    type: ServiceHealthDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getServiceHealth(
    @Param('serviceName') serviceName: string,
  ): Promise<ServiceHealthDto> {
    try {
      this.logger.log(`Fetching health for service: ${serviceName}`);
      const health = await this.observabilityService.getServiceHealth(serviceName);

      if (!health) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: `Service '${serviceName}' not found`,
            error: 'Not Found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return health;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get health for ${serviceName}: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to retrieve health for service '${serviceName}'`,
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get metrics for a specific service
   *
   * Returns detailed performance metrics including request stats, resource usage,
   * database metrics, cache performance, and top endpoints by traffic.
   */
  @Get(':serviceName/metrics')
  @ApiOperation({
    summary: 'Get service metrics',
    description:
      'Returns detailed performance metrics for a specific service including request statistics, ' +
      'resource usage (CPU, memory), database metrics, cache performance, and top endpoints by traffic.',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service',
    example: 'auth',
    type: String,
  })
  @ApiQuery({
    name: 'timeRange',
    description: 'Time range for metrics in minutes (default: 60)',
    required: false,
    example: 60,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Service metrics retrieved successfully',
    type: ServiceMetricsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getServiceMetrics(
    @Param('serviceName') serviceName: string,
    @Query('timeRange') timeRange?: number,
  ): Promise<ServiceMetricsDto> {
    try {
      const range = timeRange ? parseInt(String(timeRange), 10) : 60;
      this.logger.log(`Fetching metrics for service: ${serviceName} (${range}m range)`);

      const metrics = await this.metricsService.getServiceMetrics(serviceName, range);
      return metrics;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get metrics for ${serviceName}: ${message}`, error instanceof Error ? error.stack : undefined);

      if (message.includes('not found')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: `Service '${serviceName}' not found`,
            error: 'Not Found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to retrieve metrics for service '${serviceName}'`,
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get recent events for a specific service
   *
   * Returns a list of recent events and activity logs specific to this service,
   * useful for debugging and monitoring service behavior.
   */
  @Get(':serviceName/events')
  @ApiOperation({
    summary: 'Get service events',
    description:
      'Returns recent events and activity logs specific to a service. ' +
      'Useful for debugging, auditing, and monitoring service behavior over time.',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service',
    example: 'auth',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of events to return (default: 100)',
    required: false,
    example: 100,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Service events retrieved successfully',
    type: [SystemEventDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getServiceEvents(
    @Param('serviceName') serviceName: string,
    @Query('limit') limit?: number,
  ): Promise<SystemEventDto[]> {
    try {
      const maxEvents = limit ? parseInt(String(limit), 10) : 100;
      this.logger.log(`Fetching events for service: ${serviceName} (limit: ${maxEvents})`);

      const events = await this.eventsService.getEventsByService(serviceName, maxEvents);
      return events;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get events for ${serviceName}: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to retrieve events for service '${serviceName}'`,
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
