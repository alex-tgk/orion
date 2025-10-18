import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import {
  EventService,
  MetricService,
  AggregationService,
  DashboardService,
  UserAnalyticsService,
  HealthService,
} from '../services';
import {
  TrackEventDto,
  BulkTrackEventDto,
  QueryMetricsDto,
  QueryAggregationDto,
  DashboardQueryDto,
  QueryUserActivityDto,
  EventType,
  MetricType,
  AggregationPeriod,
  AggregationType,
} from '../dto';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let eventService: jest.Mocked<EventService>;
  let metricService: jest.Mocked<MetricService>;
  let aggregationService: jest.Mocked<AggregationService>;
  let dashboardService: jest.Mocked<DashboardService>;
  let userAnalyticsService: jest.Mocked<UserAnalyticsService>;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockEventService = {
      trackEvent: jest.fn(),
      trackBulkEvents: jest.fn(),
      getTopEvents: jest.fn(),
    };

    const mockMetricService = {
      queryMetrics: jest.fn(),
      getMetricStats: jest.fn(),
    };

    const mockAggregationService = {
      queryAggregations: jest.fn(),
    };

    const mockDashboardService = {
      getDashboardData: jest.fn(),
    };

    const mockUserAnalyticsService = {
      getUserAnalytics: jest.fn(),
      getUserActivityTimeline: jest.fn(),
      getUserEngagement: jest.fn(),
      updateUserAnalytics: jest.fn(),
    };

    const mockHealthService = {
      getHealth: jest.fn(),
      getReadiness: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: EventService, useValue: mockEventService },
        { provide: MetricService, useValue: mockMetricService },
        { provide: AggregationService, useValue: mockAggregationService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: UserAnalyticsService, useValue: mockUserAnalyticsService },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    eventService = module.get(EventService);
    metricService = module.get(MetricService);
    aggregationService = module.get(AggregationService);
    dashboardService = module.get(DashboardService);
    userAnalyticsService = module.get(UserAnalyticsService);
    healthService = module.get(HealthService);
  });

  describe('Event Endpoints', () => {
    describe('trackEvent', () => {
      it('should track a single event', async () => {
        const dto: TrackEventDto = {
          eventName: 'user.login',
          eventType: EventType.USER_ACTION,
          userId: 'user-123',
          properties: { method: 'email' },
        };

        const expectedResult = {
          id: 'event-1',
          eventName: 'user.login',
          eventType: EventType.USER_ACTION,
          timestamp: new Date(),
          success: true,
        };

        eventService.trackEvent.mockResolvedValue(expectedResult);

        const result = await controller.trackEvent(dto);

        expect(eventService.trackEvent).toHaveBeenCalledWith(dto);
        expect(result).toEqual(expectedResult);
      });

      it('should handle tracking errors', async () => {
        const dto: TrackEventDto = {
          eventName: 'error.occurred',
          success: false,
          errorMessage: 'Test error',
        };

        const error = new Error('Database error');
        eventService.trackEvent.mockRejectedValue(error);

        await expect(controller.trackEvent(dto)).rejects.toThrow('Database error');
      });
    });

    describe('trackBulkEvents', () => {
      it('should track multiple events in bulk', async () => {
        const dto: BulkTrackEventDto = {
          events: [
            { eventName: 'event1' },
            { eventName: 'event2' },
            { eventName: 'event3' },
          ],
        };

        const expectedResult = [
          {
            id: 'event-1',
            eventName: 'event1',
            eventType: EventType.USER_ACTION,
            timestamp: new Date(),
            success: true,
          },
          {
            id: 'event-2',
            eventName: 'event2',
            eventType: EventType.USER_ACTION,
            timestamp: new Date(),
            success: true,
          },
          {
            id: 'event-3',
            eventName: 'event3',
            eventType: EventType.USER_ACTION,
            timestamp: new Date(),
            success: true,
          },
        ];

        eventService.trackBulkEvents.mockResolvedValue(expectedResult);

        const result = await controller.trackBulkEvents(dto);

        expect(eventService.trackBulkEvents).toHaveBeenCalledWith(dto);
        expect(result).toEqual(expectedResult);
        expect(result).toHaveLength(3);
      });
    });

    describe('getTopEvents', () => {
      it('should get top events with filters', async () => {
        const expectedResult = [
          { eventName: 'user.login', count: 150 },
          { eventName: 'page.view', count: 120 },
          { eventName: 'button.click', count: 80 },
        ];

        eventService.getTopEvents.mockResolvedValue(expectedResult);

        const result = await controller.getTopEvents('2024-01-01', '2024-01-31', '10');

        expect(eventService.getTopEvents).toHaveBeenCalledWith({
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          limit: 10,
        });
        expect(result).toEqual(expectedResult);
      });

      it('should get top events without filters', async () => {
        const expectedResult = [
          { eventName: 'user.login', count: 150 },
        ];

        eventService.getTopEvents.mockResolvedValue(expectedResult);

        const result = await controller.getTopEvents();

        expect(eventService.getTopEvents).toHaveBeenCalledWith({
          startDate: undefined,
          endDate: undefined,
          limit: undefined,
        });
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('Metric Endpoints', () => {
    describe('queryMetrics', () => {
      it('should query metrics with filters', async () => {
        const dto: QueryMetricsDto = {
          name: 'api.requests',
          type: MetricType.COUNTER,
          serviceId: 'user-service',
          limit: 50,
        };

        const expectedResult = [
          {
            id: 'metric-1',
            name: 'api.requests',
            type: MetricType.COUNTER,
            value: 100,
            timestamp: new Date(),
            serviceId: 'user-service',
          },
        ];

        metricService.queryMetrics.mockResolvedValue(expectedResult);

        const result = await controller.queryMetrics(dto);

        expect(metricService.queryMetrics).toHaveBeenCalledWith(dto);
        expect(result).toEqual(expectedResult);
      });
    });

    describe('getMetricStats', () => {
      it('should get metric statistics', async () => {
        const expectedResult = {
          count: 100,
          sum: 5000,
          avg: 50,
          min: 10,
          max: 200,
        };

        metricService.getMetricStats.mockResolvedValue(expectedResult);

        const result = await controller.getMetricStats(
          'api.latency',
          '2024-01-01',
          '2024-01-31'
        );

        expect(metricService.getMetricStats).toHaveBeenCalledWith(
          'api.latency',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('Aggregation Endpoints', () => {
    describe('queryAggregations', () => {
      it('should query aggregations', async () => {
        const dto: QueryAggregationDto = {
          metricName: 'api.requests',
          period: AggregationPeriod.DAILY,
          aggregationType: AggregationType.SUM,
          limit: 30,
        };

        const expectedResult = [
          {
            id: 'agg-1',
            metricName: 'api.requests',
            period: AggregationPeriod.DAILY,
            periodStart: new Date('2024-01-01'),
            periodEnd: new Date('2024-01-02'),
            aggregationType: AggregationType.SUM,
            value: 1000,
            count: 100,
          },
        ];

        aggregationService.queryAggregations.mockResolvedValue(expectedResult);

        const result = await controller.queryAggregations(dto);

        expect(aggregationService.queryAggregations).toHaveBeenCalledWith(dto);
        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('Dashboard Endpoints', () => {
    describe('getDashboard', () => {
      it('should get dashboard data', async () => {
        const dto: DashboardQueryDto = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        };

        const expectedResult = {
          summary: {
            totalEvents: 10000,
            totalUsers: 500,
            totalSessions: 2000,
            avgSessionDuration: 300,
            errorRate: 1.5,
          },
          topEvents: [
            { eventName: 'user.login', count: 500, trend: 10 },
          ],
          userActivity: [
            { date: '2024-01-01', activeUsers: 100, sessions: 200, events: 1000 },
          ],
          servicePerformance: [
            {
              serviceId: 'user-service',
              avgLatency: 50,
              errorRate: 0.5,
              requestsPerSecond: 100,
            },
          ],
        };

        dashboardService.getDashboardData.mockResolvedValue(expectedResult);

        const result = await controller.getDashboard(dto);

        expect(dashboardService.getDashboardData).toHaveBeenCalledWith(dto);
        expect(result).toEqual(expectedResult);
        expect(result.summary.totalEvents).toBe(10000);
      });
    });
  });

  describe('User Analytics Endpoints', () => {
    describe('getUserAnalytics', () => {
      it('should get user analytics', async () => {
        const userId = 'user-123';
        const expectedResult = {
          userId,
          totalEvents: 150,
          totalSessions: 30,
          daysActive: 15,
          longestStreak: 7,
          currentStreak: 3,
          featuresUsed: ['login', 'profile', 'settings'],
          favoriteFeatures: [
            { feature: 'profile', count: 50 },
          ],
          peakUsageHour: 14,
          peakUsageDay: 1,
          avgLoadTime: 1.5,
          errorRate: 2.0,
        };

        userAnalyticsService.getUserAnalytics.mockResolvedValue(expectedResult);

        const result = await controller.getUserAnalytics(userId);

        expect(userAnalyticsService.getUserAnalytics).toHaveBeenCalledWith(userId);
        expect(result).toEqual(expectedResult);
      });
    });

    describe('getUserActivity', () => {
      it('should get user activity timeline', async () => {
        const userId = 'user-123';
        const dto: QueryUserActivityDto = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        };

        const expectedResult = [
          {
            date: '2024-01-01',
            events: 50,
            sessions: 5,
            uniqueFeatures: 10,
            errors: 2,
          },
        ];

        userAnalyticsService.getUserActivityTimeline.mockResolvedValue(expectedResult);

        const result = await controller.getUserActivity(userId, dto);

        expect(userAnalyticsService.getUserActivityTimeline).toHaveBeenCalledWith(userId, dto);
        expect(result).toEqual(expectedResult);
      });
    });

    describe('getUserEngagement', () => {
      it('should get user engagement metrics', async () => {
        const userId = 'user-123';
        const expectedResult = {
          userId,
          engagementScore: 75,
          activityLevel: 'high' as const,
          retentionRisk: 'low' as const,
          lastSevenDaysActivity: {
            daysActive: 6,
            totalEvents: 100,
            totalSessions: 15,
          },
          trends: {
            eventsChange: 20,
            sessionsChange: 15,
            durationChange: -5,
          },
        };

        userAnalyticsService.getUserEngagement.mockResolvedValue(expectedResult);

        const result = await controller.getUserEngagement(userId);

        expect(userAnalyticsService.getUserEngagement).toHaveBeenCalledWith(userId);
        expect(result).toEqual(expectedResult);
        expect(result.engagementScore).toBe(75);
        expect(result.activityLevel).toBe('high');
      });
    });

    describe('refreshUserAnalytics', () => {
      it('should refresh user analytics', async () => {
        const userId = 'user-123';

        userAnalyticsService.updateUserAnalytics.mockResolvedValue(undefined);

        const result = await controller.refreshUserAnalytics(userId);

        expect(userAnalyticsService.updateUserAnalytics).toHaveBeenCalledWith(userId);
        expect(result).toEqual({ message: 'User analytics refreshed successfully' });
      });
    });
  });

  describe('Health Endpoints', () => {
    describe('getHealth', () => {
      it('should return health status', async () => {
        const expectedResult = {
          status: 'healthy',
          service: 'analytics',
          uptime: 100,
          timestamp: new Date().toISOString(),
          checks: {
            database: { status: 'healthy', latency: 5 },
            memory: { status: 'healthy', usage: {} },
          },
        };

        healthService.getHealth.mockResolvedValue(expectedResult);

        const result = await controller.getHealth();

        expect(healthService.getHealth).toHaveBeenCalled();
        expect(result.status).toBe('healthy');
        expect(result.service).toBe('analytics');
      });

      it('should return unhealthy status when database fails', async () => {
        const expectedResult = {
          status: 'unhealthy',
          service: 'analytics',
          uptime: 100,
          timestamp: new Date().toISOString(),
          checks: {
            database: { status: 'unhealthy', error: 'Connection failed' },
            memory: { status: 'healthy', usage: {} },
          },
        };

        healthService.getHealth.mockResolvedValue(expectedResult);

        const result = await controller.getHealth();

        expect(result.status).toBe('unhealthy');
      });
    });

    describe('getReadiness', () => {
      it('should return ready status', async () => {
        const expectedResult = {
          status: 'ready',
          service: 'analytics',
          timestamp: new Date().toISOString(),
        };

        healthService.getReadiness.mockResolvedValue(expectedResult);

        const result = await controller.getReadiness();

        expect(healthService.getReadiness).toHaveBeenCalled();
        expect(result.status).toBe('ready');
      });

      it('should return not ready status', async () => {
        const expectedResult = {
          status: 'not_ready',
          service: 'analytics',
          timestamp: new Date().toISOString(),
          error: 'Database not connected',
        };

        healthService.getReadiness.mockResolvedValue(expectedResult);

        const result = await controller.getReadiness();

        expect(result.status).toBe('not_ready');
      });
    });
  });
});
