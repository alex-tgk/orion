import { Test, TestingModule } from '@nestjs/testing';
import { FlagAuditService } from '../app/services/flag-audit.service';
import { AuditAction } from '../app/interfaces/feature-flag.interface';
import { PrismaService } from '@orion/shared';

describe('FlagAuditService', () => {
  let service: FlagAuditService;

  const mockAuditLog = {
    id: '1',
    flagId: 'flag-1',
    action: AuditAction.CREATED,
    changedBy: 'user-123',
    changes: JSON.stringify({ enabled: true }),
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    flagAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlagAuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FlagAuditService>(FlagAuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      mockPrismaService.flagAuditLog.create.mockResolvedValue(mockAuditLog);

      await service.log(
        'flag-1',
        AuditAction.CREATED,
        'user-123',
        { enabled: true },
        { ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0' },
      );

      expect(mockPrismaService.flagAuditLog.create).toHaveBeenCalledWith({
        data: {
          flagId: 'flag-1',
          action: AuditAction.CREATED,
          changedBy: 'user-123',
          changes: JSON.stringify({ enabled: true }),
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should create audit log without optional fields', async () => {
      mockPrismaService.flagAuditLog.create.mockResolvedValue(mockAuditLog);

      await service.log('flag-1', AuditAction.ENABLED);

      expect(mockPrismaService.flagAuditLog.create).toHaveBeenCalledWith({
        data: {
          flagId: 'flag-1',
          action: AuditAction.ENABLED,
          changedBy: undefined,
          changes: JSON.stringify({}),
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });

    it('should handle errors gracefully and not throw', async () => {
      mockPrismaService.flagAuditLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.log('flag-1', AuditAction.CREATED),
      ).resolves.not.toThrow();
    });
  });

  describe('getLogsForFlag', () => {
    it('should return audit logs for a specific flag', async () => {
      const mockLogs = [mockAuditLog];
      mockPrismaService.flagAuditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogsForFlag('flag-1');

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.flagAuditLog.findMany).toHaveBeenCalledWith({
        where: { flagId: 'flag-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('should respect custom limit', async () => {
      const mockLogs = [mockAuditLog];
      mockPrismaService.flagAuditLog.findMany.mockResolvedValue(mockLogs);

      await service.getLogsForFlag('flag-1', 50);

      expect(mockPrismaService.flagAuditLog.findMany).toHaveBeenCalledWith({
        where: { flagId: 'flag-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getLogsByUser', () => {
    it('should return audit logs for a specific user', async () => {
      const mockLogs = [
        {
          ...mockAuditLog,
          flag: {
            key: 'test-flag',
            name: 'Test Flag',
          },
        },
      ];
      mockPrismaService.flagAuditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogsByUser('user-123');

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.flagAuditLog.findMany).toHaveBeenCalledWith({
        where: { changedBy: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          flag: {
            select: {
              key: true,
              name: true,
            },
          },
        },
      });
    });

    it('should respect custom limit', async () => {
      mockPrismaService.flagAuditLog.findMany.mockResolvedValue([]);

      await service.getLogsByUser('user-123', 25);

      expect(mockPrismaService.flagAuditLog.findMany).toHaveBeenCalledWith({
        where: { changedBy: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          flag: {
            select: {
              key: true,
              name: true,
            },
          },
        },
      });
    });
  });

  describe('getRecentLogs', () => {
    it('should return recent audit logs', async () => {
      const mockLogs = [
        {
          ...mockAuditLog,
          flag: {
            key: 'test-flag',
            name: 'Test Flag',
          },
        },
      ];
      mockPrismaService.flagAuditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getRecentLogs();

      expect(result).toEqual(mockLogs);
      expect(mockPrismaService.flagAuditLog.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          flag: {
            select: {
              key: true,
              name: true,
            },
          },
        },
      });
    });

    it('should respect custom limit', async () => {
      mockPrismaService.flagAuditLog.findMany.mockResolvedValue([]);

      await service.getRecentLogs(10);

      expect(mockPrismaService.flagAuditLog.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          flag: {
            select: {
              key: true,
              name: true,
            },
          },
        },
      });
    });
  });
});
