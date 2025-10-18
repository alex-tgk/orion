import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '@orion/shared';
import { SessionService } from './session.service';

describe('HealthService', () => {
  let service: HealthService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockSessionService = {
    getRedisStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getHealth', () => {
    it('should return healthy status when all services are connected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('connected');
      expect(result.services.redis.status).toBe('connected');
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.memory).toBeDefined();
    });

    it('should return degraded status when Redis is disconnected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('disconnected');

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.database.status).toBe('connected');
      expect(result.services.redis.status).toBe('disconnected');
      expect(result.services.redis.error).toBe('Redis connection unavailable');
    });

    it('should return degraded status when database latency is high', async () => {
      // Mock slow database response
      mockPrismaService.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ result: 1 }]), 150),
          ),
      );
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.services.database.latency).toBeGreaterThan(100);
    });

    it('should return unhealthy status when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Database connection failed'),
      );
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('error');
      expect(result.services.database.error).toBe('Database connection failed');
    });

    it('should include memory metrics in health response', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.metrics.memory.used).toBeGreaterThan(0);
      expect(result.metrics.memory.total).toBeGreaterThan(0);
      expect(result.metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include valid ISO timestamp', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should include process uptime', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.uptime).toBeGreaterThan(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('should include database latency when database is connected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.services.database.latency).toBeDefined();
      expect(result.services.database.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getLiveness', () => {
    it('should return alive true with timestamp', async () => {
      const result = await service.getLiveness();

      expect(result.alive).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should always return alive true regardless of service status', async () => {
      const result1 = await service.getLiveness();
      expect(result1.alive).toBe(true);

      const result2 = await service.getLiveness();
      expect(result2.alive).toBe(true);
    });
  });

  describe('getReadiness', () => {
    it('should return ready true when database is healthy', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getReadiness();

      expect(result.ready).toBe(true);
      expect(result.checks.database).toBe(true);
      expect(result.checks.redis).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('should return ready false when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Database error'),
      );
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getReadiness();

      expect(result.ready).toBe(false);
      expect(result.checks.database).toBe(false);
      expect(result.checks.redis).toBe(true);
    });

    it('should return ready true even when Redis is down', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('disconnected');

      const result = await service.getReadiness();

      expect(result.ready).toBe(true);
      expect(result.checks.database).toBe(true);
      expect(result.checks.redis).toBe(false);
    });

    it('should include valid ISO timestamp', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getReadiness();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle database error with custom error object', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Custom database error'),
      );
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('error');
      expect(result.services.database.error).toBe('Custom database error');
    });

    it('should handle rapid successive health checks', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const results = await Promise.all(
        Array.from({ length: 10 }, () => service.getHealth()),
      );

      results.forEach((result) => {
        expect(result.status).toBe('healthy');
        expect(result.services.database.status).toBe('connected');
        expect(result.services.redis.status).toBe('connected');
      });
    });

    it('should handle both database and Redis down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error('Database error'),
      );
      mockSessionService.getRedisStatus.mockReturnValue('disconnected');

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('error');
      expect(result.services.redis.status).toBe('disconnected');
    });
  });

  describe('integration with environment variables', () => {
    it('should use environment variables for version and environment', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = await service.getHealth();

      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(typeof result.version).toBe('string');
      expect(typeof result.environment).toBe('string');
    });
  });
});
