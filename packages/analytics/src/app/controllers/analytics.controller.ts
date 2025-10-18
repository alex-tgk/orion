import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  TrackEventDto,
  BulkTrackEventDto,
  EventResponseDto,
  QueryMetricsDto,
  MetricResponseDto,
  QueryAggregationDto,
  AggregationResponseDto,
  DashboardQueryDto,
  DashboardResponseDto,
  QueryUserActivityDto,
  UserAnalyticsResponseDto,
  UserActivityTimelineDto,
  UserEngagementDto,
} from '../dto';
import {
  EventService,
  MetricService,
  AggregationService,
  DashboardService,
  UserAnalyticsService,
  HealthService,
} from '../services';

/**
 * Analytics Controller
 * Handles all analytics-related HTTP endpoints
 */
@Controller('api')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly eventService: EventService,
    private readonly metricService: MetricService,
    private readonly aggregationService: AggregationService,
    private readonly dashboardService: DashboardService,
    private readonly userAnalyticsService: UserAnalyticsService,
    private readonly healthService: HealthService
  ) {}

  // ===========================
  // EVENT ENDPOINTS
  // ===========================

  /**
   * Track a single event
   */
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async trackEvent(@Body() dto: TrackEventDto): Promise<EventResponseDto> {
    this.logger.log(`Tracking event: ${dto.eventName}`);
    return this.eventService.trackEvent(dto);
  }

  /**
   * Track multiple events in bulk
   */
  @Post('events/bulk')
  @HttpCode(HttpStatus.CREATED)
  async trackBulkEvents(@Body() dto: BulkTrackEventDto): Promise<EventResponseDto[]> {
    this.logger.log(`Tracking ${dto.events.length} events in bulk`);
    return this.eventService.trackBulkEvents(dto);
  }

  /**
   * Get top events
   */
  @Get('events/top')
  async getTopEvents(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string
  ) {
    return this.eventService.getTopEvents({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ===========================
  // METRIC ENDPOINTS
  // ===========================

  /**
   * Query metrics
   */
  @Get('metrics')
  async queryMetrics(@Query() dto: QueryMetricsDto): Promise<MetricResponseDto[]> {
    this.logger.log('Querying metrics');
    return this.metricService.queryMetrics(dto);
  }

  /**
   * Get metric statistics
   */
  @Get('metrics/:name/stats')
  async getMetricStats(
    @Param('name') name: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.metricService.getMetricStats(
      name,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  // ===========================
  // AGGREGATION ENDPOINTS
  // ===========================

  /**
   * Query aggregated metrics
   */
  @Get('aggregations')
  async queryAggregations(@Query() dto: QueryAggregationDto): Promise<AggregationResponseDto[]> {
    this.logger.log('Querying aggregations');
    return this.aggregationService.queryAggregations(dto);
  }

  // ===========================
  // DASHBOARD ENDPOINTS
  // ===========================

  /**
   * Get dashboard data
   */
  @Get('dashboard')
  async getDashboard(@Query() dto: DashboardQueryDto): Promise<DashboardResponseDto> {
    this.logger.log('Fetching dashboard data');
    return this.dashboardService.getDashboardData(dto);
  }

  // ===========================
  // USER ANALYTICS ENDPOINTS
  // ===========================

  /**
   * Get user analytics
   */
  @Get('users/:userId/analytics')
  async getUserAnalytics(@Param('userId') userId: string): Promise<UserAnalyticsResponseDto> {
    this.logger.log(`Fetching analytics for user: ${userId}`);
    return this.userAnalyticsService.getUserAnalytics(userId);
  }

  /**
   * Get user activity timeline
   */
  @Get('users/:userId/activity')
  async getUserActivity(
    @Param('userId') userId: string,
    @Query() dto: QueryUserActivityDto
  ): Promise<UserActivityTimelineDto[]> {
    this.logger.log(`Fetching activity timeline for user: ${userId}`);
    return this.userAnalyticsService.getUserActivityTimeline(userId, dto);
  }

  /**
   * Get user engagement metrics
   */
  @Get('users/:userId/engagement')
  async getUserEngagement(@Param('userId') userId: string): Promise<UserEngagementDto> {
    this.logger.log(`Fetching engagement metrics for user: ${userId}`);
    return this.userAnalyticsService.getUserEngagement(userId);
  }

  /**
   * Refresh user analytics (recalculate from events)
   */
  @Post('users/:userId/analytics/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshUserAnalytics(@Param('userId') userId: string) {
    this.logger.log(`Refreshing analytics for user: ${userId}`);
    await this.userAnalyticsService.updateUserAnalytics(userId);
    return { message: 'User analytics refreshed successfully' };
  }

  // ===========================
  // HEALTH ENDPOINTS
  // ===========================

  /**
   * Health check
   */
  @Get('health')
  async getHealth() {
    return this.healthService.getHealth();
  }

  /**
   * Readiness check
   */
  @Get('ready')
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
