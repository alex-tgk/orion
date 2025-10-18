import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from './prisma.service';
import { DashboardQueryDto } from '../dto';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      event: {
        count: jest.fn(),
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      serviceMetrics: {
        findMany: jest.fn(),
      },
      costMetric: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get(PrismaService);
  });

  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      const dto: DashboardQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      // Mock summary data
      (prisma.event.count as jest.Mock)
        .mockResolvedValueOnce(10000) // totalEvents
        .mockResolvedValueOnce(500); // errorEvents

      (prisma.event.findMany as jest.Mock)
        .mockResolvedValueOnce(
          Array.from({ length: 500 }, (_, i) => ({ userId: `user-${i}` }))
        ) // uniqueUsers
        .mockResolvedValueOnce(
          Array.from({ length: 2000 }, (_, i) => ({ sessionId: `session-${i}` }))
        ) // uniqueSessions
        .mockResolvedValueOnce(
          Array.from({ length: 100 }, (_, i) => ({ duration: 1000 * i }))
        ); // eventsWithDuration

      // Mock top events
      (prisma.event.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { eventName: 'user.login', _count: { eventName: 500 } },
          { eventName: 'page.view', _count: { eventName: 300 } },
        ])
        .mockResolvedValueOnce([
          { eventName: 'user.login', _count: { eventName: 450 } },
        ]);

      // Mock user activity timeline
      (prisma.event.findMany as jest.Mock).mockResolvedValueOnce([
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          userId: 'user-1',
          sessionId: 'session-1',
        },
        {
          timestamp: new Date('2024-01-01T14:00:00Z'),
          userId: 'user-2',
          sessionId: 'session-2',
        },
      ]);

      // Mock service performance
      (prisma.serviceMetrics.findMany as jest.Mock).mockResolvedValue([
        {
          serviceId: 'user-service',
          avgLatency: 50,
          errorRate: 0.5,
          requestsPerSecond: 100,
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-02'),
        },
      ]);

      // Mock cost metrics
      (prisma.costMetric.findMany as jest.Mock).mockResolvedValue([
        {
          resourceType: 'compute',
          amount: 100,
          currency: 'USD',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-31'),
        },
        {
          resourceType: 'storage',
          amount: 50,
          currency: 'USD',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-31'),
        },
      ]);

      const result = await service.getDashboardData(dto);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalEvents).toBe(10000);
      expect(result.summary.totalUsers).toBe(500);
      expect(result.topEvents).toBeDefined();
      expect(result.userActivity).toBeDefined();
      expect(result.servicePerformance).toBeDefined();
      expect(result.costs).toBeDefined();
      expect(result.costs?.total).toBe(150);
    });

    it('should handle empty data gracefully', async () => {
      const dto: DashboardQueryDto = {};

      (prisma.event.count as jest.Mock).mockResolvedValue(0);
      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.event.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.serviceMetrics.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.costMetric.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDashboardData(dto);

      expect(result.summary.totalEvents).toBe(0);
      expect(result.topEvents).toEqual([]);
      expect(result.costs).toBeUndefined();
    });
  });
});
