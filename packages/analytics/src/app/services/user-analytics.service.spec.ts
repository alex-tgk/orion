import { Test, TestingModule } from '@nestjs/testing';
import { UserAnalyticsService } from './user-analytics.service';
import { PrismaService } from './prisma.service';

describe('UserAnalyticsService', () => {
  let service: UserAnalyticsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      userAnalytics: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      event: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserAnalyticsService>(UserAnalyticsService);
    prisma = module.get(PrismaService);
  });

  describe('getUserAnalytics', () => {
    it('should return existing user analytics', async () => {
      const userId = 'user-123';
      const mockAnalytics = {
        userId,
        totalEvents: 150,
        lastEventAt: new Date(),
        firstEventAt: new Date(),
        totalSessions: 30,
        avgSessionDuration: 300,
        lastSessionAt: new Date(),
        daysActive: 15,
        longestStreak: 7,
        currentStreak: 3,
        featuresUsed: ['login', 'profile'],
        favoriteFeatures: [{ feature: 'login', count: 50 }],
        peakUsageHour: 14,
        peakUsageDay: 1,
        avgLoadTime: 1.5,
        errorRate: 2.0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'analytics-1',
      };

      (prisma.userAnalytics.findUnique as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await service.getUserAnalytics(userId);

      expect(prisma.userAnalytics.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(result.userId).toBe(userId);
      expect(result.totalEvents).toBe(150);
      expect(result.daysActive).toBe(15);
    });

    it('should create new user analytics if not exists', async () => {
      const userId = 'user-456';
      const mockNewAnalytics = {
        userId,
        totalEvents: 0,
        lastEventAt: null,
        firstEventAt: null,
        totalSessions: 0,
        avgSessionDuration: null,
        lastSessionAt: null,
        daysActive: 0,
        longestStreak: 0,
        currentStreak: 0,
        featuresUsed: [],
        favoriteFeatures: [],
        peakUsageHour: null,
        peakUsageDay: null,
        avgLoadTime: null,
        errorRate: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'analytics-2',
      };

      (prisma.userAnalytics.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userAnalytics.create as jest.Mock).mockResolvedValue(mockNewAnalytics);

      const result = await service.getUserAnalytics(userId);

      expect(prisma.userAnalytics.create).toHaveBeenCalledWith({
        data: { userId },
      });

      expect(result.userId).toBe(userId);
      expect(result.totalEvents).toBe(0);
    });
  });

  describe('updateUserAnalytics', () => {
    it('should calculate and update user analytics from events', async () => {
      const userId = 'user-123';
      const mockEvents = [
        {
          id: 'event-1',
          eventName: 'user.login',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          userId,
          sessionId: 'session-1',
          duration: 1000,
          success: true,
        },
        {
          id: 'event-2',
          eventName: 'profile.view',
          timestamp: new Date('2024-01-02T14:00:00Z'),
          userId,
          sessionId: 'session-2',
          duration: 1500,
          success: true,
        },
        {
          id: 'event-3',
          eventName: 'settings.update',
          timestamp: new Date('2024-01-03T14:30:00Z'),
          userId,
          sessionId: 'session-3',
          duration: null,
          success: false,
        },
      ];

      (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (prisma.userAnalytics.upsert as jest.Mock).mockResolvedValue({});

      await service.updateUserAnalytics(userId);

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'asc' },
      });

      expect(prisma.userAnalytics.upsert).toHaveBeenCalled();
      const upsertCall = (prisma.userAnalytics.upsert as jest.Mock).mock.calls[0][0];

      expect(upsertCall.create.totalEvents).toBe(3);
      expect(upsertCall.create.daysActive).toBeGreaterThanOrEqual(1);
      expect(upsertCall.create.errorRate).toBeGreaterThan(0);
    });

    it('should handle empty events', async () => {
      const userId = 'user-empty';

      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);

      await service.updateUserAnalytics(userId);

      expect(prisma.userAnalytics.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getUserEngagement', () => {
    it('should calculate engagement score and metrics', async () => {
      const userId = 'user-123';
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const mockAnalytics = {
        userId,
        totalEvents: 150,
        lastEventAt: new Date(),
        firstEventAt: new Date(),
        totalSessions: 30,
        avgSessionDuration: 300,
        lastSessionAt: new Date(),
        daysActive: 15,
        longestStreak: 7,
        currentStreak: 5,
        featuresUsed: ['login', 'profile', 'settings', 'dashboard'],
        favoriteFeatures: [],
        peakUsageHour: 14,
        peakUsageDay: 1,
        avgLoadTime: 1.5,
        errorRate: 2.0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'analytics-1',
      };

      const mockRecentEvents = Array.from({ length: 50 }, (_, i) => ({
        id: `event-${i}`,
        eventName: 'test.event',
        timestamp: new Date(sevenDaysAgo.getTime() + i * 3600000),
        userId,
        sessionId: `session-${Math.floor(i / 5)}`,
        duration: 1000,
        success: true,
      }));

      const mockPreviousEvents = Array.from({ length: 40 }, (_, i) => ({
        id: `event-old-${i}`,
        eventName: 'test.event',
        timestamp: new Date(sevenDaysAgo.getTime() - i * 3600000),
        userId,
        sessionId: `session-old-${Math.floor(i / 5)}`,
        duration: 1200,
        success: true,
      }));

      (prisma.userAnalytics.findUnique as jest.Mock).mockResolvedValue(mockAnalytics);
      (prisma.event.findMany as jest.Mock)
        .mockResolvedValueOnce(mockRecentEvents)
        .mockResolvedValueOnce(mockPreviousEvents);

      const result = await service.getUserEngagement(userId);

      expect(result.userId).toBe(userId);
      expect(result.engagementScore).toBeGreaterThan(0);
      expect(result.engagementScore).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high', 'very_high']).toContain(result.activityLevel);
      expect(['low', 'medium', 'high']).toContain(result.retentionRisk);
      expect(result.lastSevenDaysActivity.totalEvents).toBe(50);
      expect(result.trends).toBeDefined();
    });
  });
});
