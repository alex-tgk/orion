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
import { StatsService } from '../services/stats.service';
import {
  ServicesListDto,
  ServiceHealthDto,
} from '../dto/service-health.dto';
import { ServiceMetricsDto } from '../dto/service-metrics.dto';
import {
  EventsQueryDto,
  EventsResponseDto,
} from '../dto/system-events.dto';
import { SystemStatsDto } from '../dto/system-stats.dto';

@ApiTags('Observability')
@Controller('api')
export class ObservabilityController {
  private readonly logger = new Logger(ObservabilityController.name);

  constructor(
    private readonly observabilityService: ObservabilityService,
    private readonly metricsService: MetricsService,
    private readonly eventsService: EventsService,
    private readonly statsService: StatsService,
  ) {}

  /**
   * GET /api/services - List all services with their health status
   */
  @Get('services')
  @ApiOperation({
    summary: 'List all services',
    description:
      'Returns a list of all registered ORION services with their current health status, registration info, and last check time.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of services retrieved successfully',
    type: ServicesListDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getServices(): Promise<ServicesListDto> {
    try {
      this.logger.log('Fetching services list');
      return await this.observabilityService.getServicesList();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get services list: ${message}`);
      throw new HttpException(
        'Failed to retrieve services list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/services/:serviceName/health - Get detailed health of specific service
   */
  @Get('services/:serviceName/health')
  @ApiOperation({
    summary: 'Get service health',
    description:
      'Returns detailed health information for a specific service including status, dependencies, and resource metrics.',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service to check',
    example: 'auth',
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
          `Service ${serviceName} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      return health;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get health for ${serviceName}: ${message}`);
      throw new HttpException(
        `Failed to retrieve health for service ${serviceName}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/services/:serviceName/metrics - Get metrics for specific service
   */
  @Get('services/:serviceName/metrics')
  @ApiOperation({
    summary: 'Get service metrics',
    description:
      'Returns detailed metrics for a specific service including request stats, resource usage, database metrics, and top endpoints.',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service',
    example: 'auth',
  })
  @ApiQuery({
    name: 'timeRange',
    description: 'Time range for metrics in minutes',
    required: false,
    example: 60,
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
      this.logger.log(`Fetching metrics for service: ${serviceName} (${range}m)`);

      return await this.metricsService.getServiceMetrics(serviceName, range);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get metrics for ${serviceName}: ${message}`);

      if (message.includes('not found')) {
        throw new HttpException(
          `Service ${serviceName} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        `Failed to retrieve metrics for service ${serviceName}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/events - Get recent system events/activity log
   */
  @Get('events')
  @ApiOperation({
    summary: 'Get system events',
    description:
      'Returns system events and activity logs with optional filtering by level, category, service, and time range.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of events to return',
    required: false,
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of events to skip',
    required: false,
    example: 0,
  })
  @ApiQuery({
    name: 'level',
    description: 'Filter by event level',
    required: false,
    enum: ['info', 'warn', 'error', 'critical'],
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by event category',
    required: false,
    enum: ['system', 'service', 'security', 'deployment', 'performance', 'user'],
  })
  @ApiQuery({
    name: 'serviceName',
    description: 'Filter by service name',
    required: false,
    example: 'auth',
  })
  @ApiQuery({
    name: 'startTime',
    description: 'Filter events after this time (ISO string)',
    required: false,
  })
  @ApiQuery({
    name: 'endTime',
    description: 'Filter events before this time (ISO string)',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    type: EventsResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getEvents(@Query() query: EventsQueryDto): Promise<EventsResponseDto> {
    try {
      this.logger.log(`Fetching events with filters: ${JSON.stringify(query)}`);
      return await this.eventsService.queryEvents(query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get events: ${message}`);
      throw new HttpException(
        'Failed to retrieve events',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/stats - Get aggregate system statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get system statistics',
    description:
      'Returns aggregate statistics across all services including service counts, request stats, resource usage, error rates, and uptime information.',
  })
  @ApiQuery({
    name: 'timeRange',
    description: 'Time range for statistics in minutes',
    required: false,
    example: 60,
  })
  @ApiResponse({
    status: 200,
    description: 'System statistics retrieved successfully',
    type: SystemStatsDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getStats(@Query('timeRange') timeRange?: number): Promise<SystemStatsDto> {
    try {
      const range = timeRange ? parseInt(String(timeRange), 10) : 60;
      this.logger.log(`Fetching system stats (${range}m)`);

      return await this.statsService.getSystemStats(range);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get system stats: ${message}`);
      throw new HttpException(
        'Failed to retrieve system statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/health/summary - Get quick health summary
   */
  @Get('health/summary')
  @ApiOperation({
    summary: 'Get health summary',
    description: 'Returns a quick overview of system health status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health summary retrieved successfully',
  })
  async getHealthSummary() {
    try {
      return await this.statsService.getHealthSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get health summary: ${message}`);
      throw new HttpException(
        'Failed to retrieve health summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
