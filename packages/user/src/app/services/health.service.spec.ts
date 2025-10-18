import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@orion/shared';
import { HealthService } from './health.service';
import { CacheService } from './cache.service';

describe('HealthService', () => {
  let service: HealthService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'app.serviceName') return 'user-service';
      return defaultValue;
    }),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockCacheService = {
    isConnected: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return basic health status', () => {
      const result = service.getHealth();

      expect(result).toMatchObject({
        status: 'ok',
        service: 'user-service',
        version: '1.0.0',
        timestamp: expect.any(String),
      });
    });

    it('should return timestamp in ISO format', () => {
      const result = service.getHealth();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status', () => {
      const result = service.getLiveness();

      expect(result).toMatchObject({
        status: 'ok',
        service: 'user-service',
        version: '1.0.0',
        timestamp: expect.any(String),
      });
    });

    it('should always return ok status for liveness', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('ok');
    });
  });

  describe('getReadiness', () => {
    it('should return ok status when all checks pass', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      mockCacheService.isConnected.mockReturnValue(true);

      const result = await service.getReadiness();

      expect(result.status).toBe('ok');
      expect(result.checks?.database?.status).toBe('ok');
      expect(result.checks?.cache?.status).toBe('ok');
    });

    it('should return degraded status when database check fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));
      mockCacheService.isConnected.mockReturnValue(true);

      const result = await service.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks?.database?.status).toBe('error');
      expect(result.checks?.database?.message).toBe('Database connection failed');
      expect(result.checks?.cache?.status).toBe('ok');
    });

    it('should return degraded status when cache check fails', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      mockCacheService.isConnected.mockReturnValue(false);

      const result = await service.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks?.database?.status).toBe('ok');
      expect(result.checks?.cache?.status).toBe('error');
      expect(result.checks?.cache?.message).toBe('Cache is not connected');
    });

    it('should return degraded status when both checks fail', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB error'));
      mockCacheService.isConnected.mockReturnValue(false);

      const result = await service.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks?.database?.status).toBe('error');
      expect(result.checks?.cache?.status).toBe('error');
    });

    it('should handle cache check throwing error', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      mockCacheService.isConnected.mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = await service.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks?.cache?.status).toBe('error');
      expect(result.checks?.cache?.message).toBe('Cache error');
    });

    it('should handle non-Error exceptions in database check', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue('Unknown error');
      mockCacheService.isConnected.mockReturnValue(true);

      const result = await service.getReadiness();

      expect(result.status).toBe('degraded');
      expect(result.checks?.database?.status).toBe('error');
      expect(result.checks?.database?.message).toBe('Database connection failed');
    });

    it('should include service metadata in readiness response', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      mockCacheService.isConnected.mockReturnValue(true);

      const result = await service.getReadiness();

      expect(result).toMatchObject({
        service: 'user-service',
        version: '1.0.0',
        timestamp: expect.any(String),
      });
    });
  });

  describe('service name configuration', () => {
    it('should use configured service name', () => {
      const result = service.getHealth();

      expect(result.service).toBe('user-service');
    });

    it('should use default service name if not configured', async () => {
      const defaultConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'app.serviceName') return defaultValue;
          return mockConfigService.get(key, defaultValue);
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HealthService,
          { provide: ConfigService, useValue: defaultConfigService },
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: CacheService, useValue: mockCacheService },
        ],
      }).compile();

      const testService = module.get<HealthService>(HealthService);
      const result = testService.getHealth();

      expect(result.service).toBe('user-service');
    });
  });
});
