import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from '../services/events.service';
import { EventLevel, EventCategory } from '../dto/system-events.dto';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            queryEvents: jest.fn(),
            getRecentEvents: jest.fn(),
            getCriticalEvents: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    eventsService = module.get(EventsService);
  });

  describe('GET /api/events', () => {
    it('should query events with filters', async () => {
      const mockResponse = {
        events: [
          {
            id: '1',
            level: EventLevel.INFO,
            category: EventCategory.SYSTEM,
            serviceName: 'auth',
            message: 'Test event',
            timestamp: '2025-01-01T12:00:00Z',
          },
        ],
        total: 1,
        count: 1,
        offset: 0,
        limit: 100,
        hasMore: false,
      };

      eventsService.queryEvents.mockResolvedValue(mockResponse);

      const result = await controller.queryEvents({ limit: 100 });

      expect(result).toEqual(mockResponse);
      expect(eventsService.queryEvents).toHaveBeenCalledWith({ limit: 100 });
    });
  });

  describe('GET /api/events/recent', () => {
    it('should return recent events with default limit', async () => {
      const mockEvents = [
        {
          id: '1',
          level: EventLevel.INFO,
          category: EventCategory.SYSTEM,
          serviceName: 'auth',
          message: 'Recent event',
          timestamp: '2025-01-01T12:00:00Z',
        },
      ];

      eventsService.getRecentEvents.mockResolvedValue(mockEvents);

      const result = await controller.getRecentEvents();

      expect(result).toEqual(mockEvents);
      expect(eventsService.getRecentEvents).toHaveBeenCalledWith(100);
    });

    it('should respect custom limit', async () => {
      eventsService.getRecentEvents.mockResolvedValue([]);

      await controller.getRecentEvents(50);

      expect(eventsService.getRecentEvents).toHaveBeenCalledWith(50);
    });
  });

  describe('GET /api/events/critical', () => {
    it('should return critical events', async () => {
      const mockEvents = [
        {
          id: '1',
          level: EventLevel.CRITICAL,
          category: EventCategory.SECURITY,
          serviceName: 'auth',
          message: 'Critical event',
          timestamp: '2025-01-01T12:00:00Z',
        },
      ];

      eventsService.getCriticalEvents.mockResolvedValue(mockEvents);

      const result = await controller.getCriticalEvents();

      expect(result).toEqual(mockEvents);
    });
  });
});
