import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { CacheService } from './cache.service';

describe('HealthService', () => {
  let service: HealthService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      healthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return healthy status when Redis is up', async () => {
      cacheService.healthCheck.mockResolvedValue(true);

      const result = await service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('cache');
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(result.checks.redis.status).toBe('up');
      expect(result.checks.redis.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded status when Redis is down', async () => {
      cacheService.healthCheck.mockResolvedValue(false);

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.service).toBe('cache');
      expect(result.checks.redis.status).toBe('down');
    });

    it('should return down status on error', async () => {
      cacheService.healthCheck.mockRejectedValue(new Error('Connection error'));

      const result = await service.getHealth();

      expect(result.status).toBe('down');
      expect(result.service).toBe('cache');
      expect(result.checks.redis.status).toBe('down');
    });

    it('should measure response time', async () => {
      cacheService.healthCheck.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(true), 50);
          }),
      );

      const result = await service.getHealth();

      expect(result.checks.redis.responseTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('isReady', () => {
    it('should return true when Redis is healthy', async () => {
      cacheService.healthCheck.mockResolvedValue(true);

      const result = await service.isReady();

      expect(result).toBe(true);
    });

    it('should return false when Redis is unhealthy', async () => {
      cacheService.healthCheck.mockResolvedValue(false);

      const result = await service.isReady();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      cacheService.healthCheck.mockRejectedValue(new Error('Connection error'));

      const result = await service.isReady();

      expect(result).toBe(false);
    });
  });

  describe('isAlive', () => {
    it('should always return true', () => {
      const result = service.isAlive();

      expect(result).toBe(true);
    });
  });
});
