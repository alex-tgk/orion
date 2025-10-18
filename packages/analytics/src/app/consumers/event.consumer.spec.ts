import { Test, TestingModule } from '@nestjs/testing';
import { EventConsumer } from './event.consumer';
import { EventService, MetricService, UserAnalyticsService } from '../services';
import { EventType, MetricType } from '@prisma/analytics';

describe('EventConsumer', () => {
  let consumer: EventConsumer;
  let eventService: jest.Mocked<EventService>;
  let metricService: jest.Mocked<MetricService>;
  let userAnalyticsService: jest.Mocked<UserAnalyticsService>;

  beforeEach(async () => {
    const mockEventService = {
      trackEvent: jest.fn(),
    };

    const mockMetricService = {
      recordMetric: jest.fn(),
    };

    const mockUserAnalyticsService = {
      updateUserAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventConsumer,
        { provide: EventService, useValue: mockEventService },
        { provide: MetricService, useValue: mockMetricService },
        { provide: UserAnalyticsService, useValue: mockUserAnalyticsService },
      ],
    }).compile();

    consumer = module.get<EventConsumer>(EventConsumer);
    eventService = module.get(EventService);
    metricService = module.get(MetricService);
    userAnalyticsService = module.get(UserAnalyticsService);
  });

  describe('handleEvent', () => {
    it('should handle incoming event and track it', async () => {
      const message = {
        eventName: 'user.login',
        data: {
          userId: 'user-123',
          sessionId: 'session-456',
          properties: { method: 'email' },
          success: true,
        },
      };

      eventService.trackEvent.mockResolvedValue({
        id: 'event-1',
        eventName: 'user.login',
        eventType: EventType.USER_ACTION,
        timestamp: new Date(),
        success: true,
      });

      userAnalyticsService.updateUserAnalytics.mockResolvedValue(undefined);
      metricService.recordMetric.mockResolvedValue({} as any);

      await consumer.handleEvent(message);

      expect(eventService.trackEvent).toHaveBeenCalledWith({
        eventName: 'user.login',
        eventType: EventType.USER_ACTION,
        category: 'user',
        userId: 'user-123',
        sessionId: 'session-456',
        serviceId: 'user-service',
        properties: { method: 'email' },
        metadata: {},
        ipAddress: undefined,
        userAgent: undefined,
        location: undefined,
        duration: undefined,
        success: true,
        errorMessage: undefined,
        tags: [],
      });

      expect(userAnalyticsService.updateUserAnalytics).toHaveBeenCalledWith('user-123');
      expect(metricService.recordMetric).toHaveBeenCalled();
    });

    it('should handle event without userId', async () => {
      const message = {
        eventName: 'page.view',
        data: {
          properties: { page: '/home' },
        },
      };

      eventService.trackEvent.mockResolvedValue({} as any);
      metricService.recordMetric.mockResolvedValue({} as any);

      await consumer.handleEvent(message);

      expect(eventService.trackEvent).toHaveBeenCalled();
      expect(userAnalyticsService.updateUserAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('handleUserEvent', () => {
    it('should track user-specific events', async () => {
      const message = {
        eventName: 'user.created',
        data: {
          userId: 'user-123',
          email: 'user@example.com',
        },
      };

      eventService.trackEvent.mockResolvedValue({} as any);
      userAnalyticsService.updateUserAnalytics.mockResolvedValue(undefined);
      metricService.recordMetric.mockResolvedValue({} as any);

      await consumer.handleUserEvent(message);

      expect(eventService.trackEvent).toHaveBeenCalledWith({
        eventName: 'user.created',
        eventType: EventType.USER_ACTION,
        category: 'user',
        userId: 'user-123',
        sessionId: undefined,
        serviceId: 'user-service',
        properties: message.data,
        success: true,
      });

      expect(metricService.recordMetric).toHaveBeenCalledWith({
        name: 'user.user.created',
        type: MetricType.COUNTER,
        value: 1,
        serviceId: 'user-service',
        userId: 'user-123',
        tags: ['user', 'user.created'],
      });
    });
  });

  describe('handleAuthEvent', () => {
    it('should track authentication events', async () => {
      const message = {
        eventName: 'login',
        data: {
          userId: 'user-123',
          sessionId: 'session-456',
          success: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      };

      eventService.trackEvent.mockResolvedValue({} as any);
      metricService.recordMetric.mockResolvedValue({} as any);

      await consumer.handleAuthEvent(message);

      expect(eventService.trackEvent).toHaveBeenCalledWith({
        eventName: 'login',
        eventType: EventType.SYSTEM_EVENT,
        category: 'authentication',
        userId: 'user-123',
        sessionId: 'session-456',
        serviceId: 'auth-service',
        properties: message.data,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
        errorMessage: undefined,
      });

      expect(metricService.recordMetric).toHaveBeenCalledTimes(2);
    });

    it('should track failed login attempts', async () => {
      const message = {
        eventName: 'login',
        data: {
          userId: 'user-123',
          success: false,
          errorMessage: 'Invalid credentials',
        },
      };

      eventService.trackEvent.mockResolvedValue({} as any);
      metricService.recordMetric.mockResolvedValue({} as any);

      await consumer.handleAuthEvent(message);

      expect(eventService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Invalid credentials',
        })
      );
    });
  });

  describe('handlePerformanceEvent', () => {
    it('should track performance metrics', async () => {
      const message = {
        eventName: 'api.request',
        data: {
          serviceId: 'user-service',
          endpoint: '/api/users',
          method: 'GET',
          latency: 150,
          throughput: 100,
          duration: 150,
        },
      };

      eventService.trackEvent.mockResolvedValue({} as any);
      metricService.recordMetric.mockResolvedValue({} as any);

      await consumer.handlePerformanceEvent(message);

      expect(eventService.trackEvent).toHaveBeenCalledWith({
        eventName: 'api.request',
        eventType: EventType.PERFORMANCE,
        category: 'performance',
        serviceId: 'user-service',
        properties: message.data,
        duration: 150,
        success: true,
      });

      expect(metricService.recordMetric).toHaveBeenCalledWith({
        name: 'performance.latency',
        type: MetricType.HISTOGRAM,
        value: 150,
        unit: 'milliseconds',
        serviceId: 'user-service',
        labels: {
          endpoint: '/api/users',
          method: 'GET',
        },
        tags: ['performance', 'latency'],
      });

      expect(metricService.recordMetric).toHaveBeenCalledWith({
        name: 'performance.throughput',
        type: MetricType.GAUGE,
        value: 100,
        unit: 'requests_per_second',
        serviceId: 'user-service',
        tags: ['performance', 'throughput'],
      });
    });
  });

  describe('handleErrorEvent', () => {
    it('should track error events', async () => {
      const message = {
        eventName: 'database.error',
        data: {
          userId: 'user-123',
          serviceId: 'user-service',
          errorType: 'DatabaseConnectionError',
          errorMessage: 'Failed to connect to database',
          errorStack: 'Error stack trace...',
          severity: 'critical',
        },
      };

      eventService.trackEvent.mockResolvedValue({} as any);
      metricService.recordMetric.mockResolvedValue({} as any);

      await consumer.handleErrorEvent(message);

      expect(eventService.trackEvent).toHaveBeenCalledWith({
        eventName: 'database.error',
        eventType: EventType.ERROR,
        category: 'error',
        userId: 'user-123',
        sessionId: undefined,
        serviceId: 'user-service',
        properties: message.data,
        success: false,
        errorMessage: 'Failed to connect to database',
        errorStack: 'Error stack trace...',
      });

      expect(metricService.recordMetric).toHaveBeenCalledWith({
        name: 'error.count',
        type: MetricType.COUNTER,
        value: 1,
        serviceId: 'user-service',
        labels: {
          errorType: 'DatabaseConnectionError',
          severity: 'critical',
        },
        tags: ['error', 'DatabaseConnectionError'],
      });
    });
  });
});
