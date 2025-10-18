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
import { EventsService } from '../services/events.service';
import {
  EventsQueryDto,
  EventsResponseDto,
  SystemEventDto,
  EventLevel,
  EventCategory,
} from '../dto/system-events.dto';

/**
 * Events Controller
 *
 * Provides REST API endpoints for managing and querying system events.
 * This controller handles event logs, activity tracking, and event analytics
 * across all ORION services.
 *
 * Key Features:
 * - Event querying with flexible filtering
 * - Critical event tracking
 * - Event statistics and analytics
 * - Service-specific event logs
 *
 * @example
 * GET /api/events - Query events with filters
 * GET /api/events/recent - Get recent events
 * GET /api/events/critical - Get critical events
 * GET /api/events/stats - Get event statistics
 */
@ApiTags('Events')
@Controller('api/events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  /**
   * Query system events with flexible filtering
   *
   * Supports filtering by level, category, service, and time range.
   * Includes pagination for handling large event logs.
   */
  @Get()
  @ApiOperation({
    summary: 'Query system events',
    description:
      'Returns system events and activity logs with flexible filtering options. ' +
      'Supports filtering by level (info, warn, error, critical), category (system, service, security, etc.), ' +
      'service name, and time range. Results are paginated for efficient data transfer.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of events to return (1-1000)',
    required: false,
    example: 100,
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Number of events to skip (for pagination)',
    required: false,
    example: 0,
    type: Number,
  })
  @ApiQuery({
    name: 'level',
    description: 'Filter by event severity level',
    required: false,
    enum: EventLevel,
    enumName: 'EventLevel',
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by event category',
    required: false,
    enum: EventCategory,
    enumName: 'EventCategory',
  })
  @ApiQuery({
    name: 'serviceName',
    description: 'Filter by service name',
    required: false,
    example: 'auth',
    type: String,
  })
  @ApiQuery({
    name: 'startTime',
    description: 'Filter events after this time (ISO 8601 format)',
    required: false,
    example: '2025-01-15T00:00:00Z',
    type: String,
  })
  @ApiQuery({
    name: 'endTime',
    description: 'Filter events before this time (ISO 8601 format)',
    required: false,
    example: '2025-01-15T23:59:59Z',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    type: EventsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async queryEvents(@Query() query: EventsQueryDto): Promise<EventsResponseDto> {
    try {
      this.logger.log(`Querying events with filters: ${JSON.stringify(query)}`);
      return await this.eventsService.queryEvents(query);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to query events: ${message}`, error instanceof Error ? error.stack : undefined);

      if (message.includes('Invalid')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid query parameters',
            error: 'Bad Request',
            details: process.env.NODE_ENV === 'development' ? message : undefined,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve events',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get recent events
   *
   * Returns the most recent system events without any filtering.
   * Useful for real-time monitoring and activity feeds.
   */
  @Get('recent')
  @ApiOperation({
    summary: 'Get recent events',
    description:
      'Returns the most recent system events across all services without filtering. ' +
      'Optimized for real-time monitoring and activity feeds.',
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
    description: 'Recent events retrieved successfully',
    type: [SystemEventDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid limit parameter',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getRecentEvents(@Query('limit') limit?: number): Promise<SystemEventDto[]> {
    try {
      const maxEvents = this.parseLimit(limit, 100, 1000);
      this.logger.log(`Fetching ${maxEvents} recent events`);

      return await this.eventsService.getRecentEvents(maxEvents);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get recent events: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve recent events',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get critical events
   *
   * Returns events with CRITICAL or ERROR severity level.
   * Essential for incident response and alerting systems.
   */
  @Get('critical')
  @ApiOperation({
    summary: 'Get critical events',
    description:
      'Returns events with CRITICAL or ERROR severity level. ' +
      'Essential for incident response, alerting systems, and security monitoring.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of critical events to return (default: 50)',
    required: false,
    example: 50,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Critical events retrieved successfully',
    type: [SystemEventDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid limit parameter',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getCriticalEvents(@Query('limit') limit?: number): Promise<SystemEventDto[]> {
    try {
      const maxEvents = this.parseLimit(limit, 50, 500);
      this.logger.log(`Fetching ${maxEvents} critical events`);

      return await this.eventsService.getCriticalEvents(maxEvents);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get critical events: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve critical events',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get event statistics
   *
   * Returns aggregated event statistics including counts by level,
   * category, and service. Useful for analytics and trend analysis.
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get event statistics',
    description:
      'Returns aggregated event statistics including total counts, ' +
      'distribution by level (info, warn, error, critical), distribution by category, ' +
      'and counts per service. Useful for analytics and trend analysis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Event statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: {
          type: 'number',
          description: 'Total number of events',
        },
        byLevel: {
          type: 'object',
          description: 'Event counts by severity level',
          properties: {
            info: { type: 'number' },
            warn: { type: 'number' },
            error: { type: 'number' },
            critical: { type: 'number' },
          },
        },
        byCategory: {
          type: 'object',
          description: 'Event counts by category',
          properties: {
            system: { type: 'number' },
            service: { type: 'number' },
            security: { type: 'number' },
            deployment: { type: 'number' },
            performance: { type: 'number' },
            user: { type: 'number' },
          },
        },
        byService: {
          type: 'object',
          description: 'Event counts by service',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getEventStats() {
    try {
      this.logger.log('Fetching event statistics');
      return await this.eventsService.getEventStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get event stats: ${message}`, error instanceof Error ? error.stack : undefined);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve event statistics',
          error: 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Parse and validate limit parameter
   */
  private parseLimit(limit: number | undefined, defaultValue: number, maxValue: number): number {
    if (limit === undefined) {
      return defaultValue;
    }

    const parsed = parseInt(String(limit), 10);

    if (isNaN(parsed)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid limit parameter',
          error: 'Bad Request',
          details: 'Limit must be a valid number',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (parsed < 1 || parsed > maxValue) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Limit out of bounds',
          error: 'Bad Request',
          details: `Limit must be between 1 and ${maxValue}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsed;
  }
}
