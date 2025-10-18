import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { PrismaService } from './prisma.service';
import { TrackEventDto, BulkTrackEventDto, EventType } from '../dto';
import { EventType as PrismaEventType } from '@prisma/analytics';

describe('EventService', () => {
  let service: EventService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      event: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    prisma = module.get(PrismaService);
  });

  describe('trackEvent', () => {
    it('should track a single event successfully', async () => {
      const dto: TrackEventDto = {
        eventName: 'user.login',
        eventType: EventType.USER_ACTION,
        userId: 'user-123',
        properties: { method: 'email' },
      };

      const mockEvent = {
        id: 'event-1',
        eventName: 'user.login',
        eventType: PrismaEventType.USER_ACTION,
        timestamp: new Date(),
        success: true,
        category: null,
        userId: 'user-123',
        sessionId: null,
        serviceId: null,
        properties: { method: 'email' },
        metadata: {},
        ipAddress: null,
        userAgent: null,
        location: null,
        duration: null,
        errorMessage: null,
        errorStack: null,
        processingTime: null,
        tags: [],
        createdAt: new Date(),
      };

      (prisma.event.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await service.trackEvent(dto);

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          eventName: 'user.login',
          eventType: PrismaEventType.USER_ACTION,
          category: undefined,
          userId: 'user-123',
          sessionId: undefined,
          serviceId: undefined,
          properties: { method: 'email' },
          metadata: {},
          ipAddress: undefined,
          userAgent: undefined,
          location: undefined,
          duration: undefined,
          success: true,
          errorMessage: undefined,
          tags: [],
        },
      });

      expect(result).toEqual({
        id: 'event-1',
        eventName: 'user.login',
        eventType: EventType.USER_ACTION,
        timestamp: mockEvent.timestamp,
        success: true,
      });
    });

    it('should track an error event', async () => {
      const dto: TrackEventDto = {
        eventName: 'api.error',
        eventType: EventType.ERROR,
        success: false,
        errorMessage: 'Internal server error',
      };

      const mockEvent = {
        id: 'event-2',
        eventName: 'api.error',
        eventType: PrismaEventType.ERROR,
        timestamp: new Date(),
        success: false,
        errorMessage: 'Internal server error',
        category: null,
        userId: null,
        sessionId: null,
        serviceId: null,
        properties: {},
        metadata: {},
        ipAddress: null,
        userAgent: null,
        location: null,
        duration: null,
        errorStack: null,
        processingTime: null,
        tags: [],
        createdAt: new Date(),
      };

      (prisma.event.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await service.trackEvent(dto);

      expect(result.success).toBe(false);
      expect(result.eventType).toBe(EventType.ERROR);
    });
  });

  describe('trackBulkEvents', () => {
    it('should track multiple events in a transaction', async () => {
      const dto: BulkTrackEventDto = {
        events: [
          { eventName: 'event1' },
          { eventName: 'event2' },
          { eventName: 'event3' },
        ],
      };

      const mockEvents = [
        {
          id: 'event-1',
          eventName: 'event1',
          eventType: PrismaEventType.USER_ACTION,
          timestamp: new Date(),
          success: true,
          category: null,
          userId: null,
          sessionId: null,
          serviceId: null,
          properties: {},
          metadata: {},
          ipAddress: null,
          userAgent: null,
          location: null,
          duration: null,
          errorMessage: null,
          errorStack: null,
          processingTime: null,
          tags: [],
          createdAt: new Date(),
        },
        {
          id: 'event-2',
          eventName: 'event2',
          eventType: PrismaEventType.USER_ACTION,
          timestamp: new Date(),
          success: true,
          category: null,
          userId: null,
          sessionId: null,
          serviceId: null,
          properties: {},
          metadata: {},
          ipAddress: null,
          userAgent: null,
          location: null,
          duration: null,
          errorMessage: null,
          errorStack: null,
          processingTime: null,
          tags: [],
          createdAt: new Date(),
        },
        {
          id: 'event-3',
          eventName: 'event3',
          eventType: PrismaEventType.USER_ACTION,
          timestamp: new Date(),
          success: true,
          category: null,
          userId: null,
          sessionId: null,
          serviceId: null,
          properties: {},
          metadata: {},
          ipAddress: null,
          userAgent: null,
          location: null,
          duration: null,
          errorMessage: null,
          errorStack: null,
          processingTime: null,
          tags: [],
          createdAt: new Date(),
        },
      ];

      (prisma.$transaction as jest.Mock).mockResolvedValue(mockEvents);

      const result = await service.trackBulkEvents(dto);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0].eventName).toBe('event1');
      expect(result[2].eventName).toBe('event3');
    });
  });

  describe('getEvents', () => {
    it('should get events with filters', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          eventName: 'user.login',
          eventType: PrismaEventType.USER_ACTION,
          timestamp: new Date(),
          userId: 'user-123',
        },
      ];

      (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

      const result = await service.getEvents({
        userId: 'user-123',
        eventName: 'user.login',
        limit: 10,
      });

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          eventName: 'user.login',
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        skip: 0,
      });

      expect(result).toEqual(mockEvents);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

      await service.getEvents({
        startDate,
        endDate,
      });

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should filter by tags', async () => {
      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

      await service.getEvents({
        tags: ['important', 'urgent'],
      });

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: {
          tags: { hasSome: ['important', 'urgent'] },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('countEvents', () => {
    it('should count events by criteria', async () => {
      (prisma.event.count as jest.Mock).mockResolvedValue(42);

      const result = await service.countEvents({
        userId: 'user-123',
        eventType: PrismaEventType.USER_ACTION,
      });

      expect(prisma.event.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          eventType: PrismaEventType.USER_ACTION,
        },
      });

      expect(result).toBe(42);
    });
  });

  describe('getTopEvents', () => {
    it('should get top events by count', async () => {
      const mockGroupBy = [
        { eventName: 'user.login', _count: { eventName: 150 } },
        { eventName: 'page.view', _count: { eventName: 120 } },
        { eventName: 'button.click', _count: { eventName: 80 } },
      ];

      (prisma.event.groupBy as jest.Mock).mockResolvedValue(mockGroupBy);

      const result = await service.getTopEvents({ limit: 3 });

      expect(prisma.event.groupBy).toHaveBeenCalledWith({
        by: ['eventName'],
        where: {},
        _count: { eventName: true },
        orderBy: { _count: { eventName: 'desc' } },
        take: 3,
      });

      expect(result).toEqual([
        { eventName: 'user.login', count: 150 },
        { eventName: 'page.view', count: 120 },
        { eventName: 'button.click', count: 80 },
      ]);
    });

    it('should filter top events by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (prisma.event.groupBy as jest.Mock).mockResolvedValue([]);

      await service.getTopEvents({ startDate, endDate });

      expect(prisma.event.groupBy).toHaveBeenCalledWith({
        by: ['eventName'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { eventName: true },
        orderBy: { _count: { eventName: 'desc' } },
        take: 10,
      });
    });
  });

  describe('cleanupOldEvents', () => {
    it('should delete events older than retention days', async () => {
      const retentionDays = 90;
      (prisma.event.deleteMany as jest.Mock).mockResolvedValue({ count: 1000 });

      const result = await service.cleanupOldEvents(retentionDays);

      expect(prisma.event.deleteMany).toHaveBeenCalled();
      const callArgs = (prisma.event.deleteMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.timestamp.lt).toBeDefined();
      expect(result).toBe(1000);
    });
  });
});
