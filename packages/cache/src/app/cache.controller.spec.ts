import { Test, TestingModule } from '@nestjs/testing';
import { CacheController } from './cache.controller';
import { CacheService } from './services/cache.service';
import { StatsService } from './services/stats.service';
import { HealthService } from './services/health.service';
import {
  SetCacheDto,
  GetCacheDto,
  BatchOperationDto,
  BatchGetDto,
  InvalidateCacheDto,
} from './dto';

describe('CacheController', () => {
  let controller: CacheController;
  let cacheService: jest.Mocked<CacheService>;
  let statsService: jest.Mocked<StatsService>;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
      getWithTtl: jest.fn(),
      delete: jest.fn(),
      setMany: jest.fn(),
      getMany: jest.fn(),
      invalidateByPattern: jest.fn(),
      invalidateByTags: jest.fn(),
    };

    const mockStatsService = {
      getStats: jest.fn(),
      resetStats: jest.fn(),
    };

    const mockHealthService = {
      getHealth: jest.fn(),
      isReady: jest.fn(),
      isAlive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: StatsService, useValue: mockStatsService },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<CacheController>(CacheController);
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
    statsService = module.get(StatsService) as jest.Mocked<StatsService>;
    healthService = module.get(HealthService) as jest.Mocked<HealthService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('setCache', () => {
    it('should set a cache value successfully', async () => {
      const dto: SetCacheDto = {
        key: 'test-key',
        value: { data: 'test' },
        ttl: 3600,
      };

      cacheService.set.mockResolvedValue(true);

      const result = await controller.setCache(dto);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(cacheService.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        3600,
        undefined,
        undefined,
      );
    });

    it('should set cache with namespace and tags', async () => {
      const dto: SetCacheDto = {
        key: 'test-key',
        value: { data: 'test' },
        ttl: 3600,
        namespace: 'tenant:acme',
        tags: ['user', 'profile'],
      };

      cacheService.set.mockResolvedValue(true);

      const result = await controller.setCache(dto);

      expect(result.success).toBe(true);
      expect(cacheService.set).toHaveBeenCalledWith(
        'test-key',
        { data: 'test' },
        3600,
        'tenant:acme',
        ['user', 'profile'],
      );
    });

    it('should return error if set fails', async () => {
      const dto: SetCacheDto = {
        key: 'test-key',
        value: { data: 'test' },
      };

      cacheService.set.mockResolvedValue(false);

      const result = await controller.setCache(dto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to set cache value');
    });

    it('should handle exceptions', async () => {
      const dto: SetCacheDto = {
        key: 'test-key',
        value: { data: 'test' },
      };

      cacheService.set.mockRejectedValue(new Error('Redis error'));

      const result = await controller.setCache(dto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
    });
  });

  describe('getCache', () => {
    it('should get a cache value successfully', async () => {
      const key = 'test-key';
      const query: GetCacheDto = {};
      const value = { data: 'test' };

      cacheService.getWithTtl.mockResolvedValue({ value, ttl: 3600 });

      const result = await controller.getCache(key, query);

      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.value).toEqual(value);
      expect(result.ttl).toBe(3600);
    });

    it('should return not found for non-existent key', async () => {
      cacheService.getWithTtl.mockResolvedValue({ value: null, ttl: -2 });

      const result = await controller.getCache('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.error).toBe('Key not found');
    });

    it('should get cache with namespace', async () => {
      const key = 'test-key';
      const query: GetCacheDto = { namespace: 'tenant:acme' };

      cacheService.getWithTtl.mockResolvedValue({
        value: { data: 'test' },
        ttl: 3600,
      });

      const result = await controller.getCache(key, query);

      expect(result.success).toBe(true);
      expect(cacheService.getWithTtl).toHaveBeenCalledWith('test-key', 'tenant:acme');
    });

    it('should handle exceptions', async () => {
      cacheService.getWithTtl.mockRejectedValue(new Error('Redis error'));

      const result = await controller.getCache('test-key', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
    });
  });

  describe('deleteCache', () => {
    it('should delete a cache key successfully', async () => {
      cacheService.delete.mockResolvedValue(true);

      const result = await controller.deleteCache('test-key', {});

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(cacheService.delete).toHaveBeenCalledWith('test-key', undefined);
    });

    it('should return error if deletion fails', async () => {
      cacheService.delete.mockResolvedValue(false);

      const result = await controller.deleteCache('test-key', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Key not found or failed to delete');
    });

    it('should delete with namespace', async () => {
      const query: GetCacheDto = { namespace: 'tenant:acme' };
      cacheService.delete.mockResolvedValue(true);

      const result = await controller.deleteCache('test-key', query);

      expect(result.success).toBe(true);
      expect(cacheService.delete).toHaveBeenCalledWith('test-key', 'tenant:acme');
    });
  });

  describe('batchSet', () => {
    it('should set multiple cache values', async () => {
      const dto: BatchOperationDto = {
        operations: [
          { key: 'key1', value: 'value1', ttl: 3600 },
          { key: 'key2', value: 'value2', ttl: 7200 },
        ],
      };

      cacheService.setMany.mockResolvedValue(2);

      const result = await controller.batchSet(dto);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle partial failures', async () => {
      const dto: BatchOperationDto = {
        operations: [
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' },
          { key: 'key3', value: 'value3' },
        ],
      };

      cacheService.setMany.mockResolvedValue(2); // Only 2 out of 3 succeeded

      const result = await controller.batchSet(dto);

      expect(result.success).toBe(false);
      expect(result.count).toBe(2);
      expect(result.error).toBe('Some operations failed');
    });

    it('should handle exceptions', async () => {
      const dto: BatchOperationDto = {
        operations: [{ key: 'key1', value: 'value1' }],
      };

      cacheService.setMany.mockRejectedValue(new Error('Redis error'));

      const result = await controller.batchSet(dto);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toBe('Redis error');
    });
  });

  describe('batchGet', () => {
    it('should get multiple cache values', async () => {
      const dto: BatchGetDto = {
        keys: ['key1', 'key2', 'key3'],
      };

      cacheService.getMany.mockResolvedValue([
        { data: 'value1' },
        { data: 'value2' },
        null,
      ]);

      const result = await controller.batchGet(dto);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(3);
      expect(result.results?.[0].success).toBe(true);
      expect(result.results?.[2].success).toBe(false);
    });

    it('should return failure if all keys not found', async () => {
      const dto: BatchGetDto = {
        keys: ['key1', 'key2'],
      };

      cacheService.getMany.mockResolvedValue([null, null]);

      const result = await controller.batchGet(dto);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should handle exceptions', async () => {
      const dto: BatchGetDto = {
        keys: ['key1'],
      };

      cacheService.getMany.mockRejectedValue(new Error('Redis error'));

      const result = await controller.batchGet(dto);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toBe('Redis error');
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate by pattern', async () => {
      const dto: InvalidateCacheDto = {
        pattern: 'user:*',
      };

      cacheService.invalidateByPattern.mockResolvedValue(15);

      const result = await controller.invalidateCache(dto);

      expect(result.success).toBe(true);
      expect(result.count).toBe(15);
      expect(cacheService.invalidateByPattern).toHaveBeenCalledWith('user:*', undefined);
    });

    it('should invalidate by tags', async () => {
      const dto: InvalidateCacheDto = {
        tags: ['user', 'profile'],
      };

      cacheService.invalidateByTags.mockResolvedValue(10);

      const result = await controller.invalidateCache(dto);

      expect(result.success).toBe(true);
      expect(result.count).toBe(10);
      expect(cacheService.invalidateByTags).toHaveBeenCalledWith(
        ['user', 'profile'],
        undefined,
      );
    });

    it('should return error if neither pattern nor tags provided', async () => {
      const dto: InvalidateCacheDto = {};

      const result = await controller.invalidateCache(dto);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toBe('Must provide either pattern or tags');
    });

    it('should handle exceptions', async () => {
      const dto: InvalidateCacheDto = {
        pattern: 'user:*',
      };

      cacheService.invalidateByPattern.mockRejectedValue(new Error('Redis error'));

      const result = await controller.invalidateCache(dto);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis error');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        totalKeys: 1250,
        hits: 5000,
        misses: 250,
        hitRatio: 0.952,
        memoryUsage: 1048576,
        memoryUsageFormatted: '1.00 MB',
        uptime: 86400,
        connectedClients: 5,
        totalCommands: 10500,
        timestamp: '2025-01-15T10:30:00.000Z',
      };

      statsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(statsService.getStats).toHaveBeenCalled();
    });
  });

  describe('resetStats', () => {
    it('should reset statistics', () => {
      const result = controller.resetStats();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Statistics reset successfully');
      expect(statsService.resetStats).toHaveBeenCalled();
    });

    it('should handle errors', () => {
      statsService.resetStats.mockImplementation(() => {
        throw new Error('Reset failed');
      });

      const result = controller.resetStats();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Reset failed');
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const mockHealth = {
        status: 'ok' as const,
        service: 'cache',
        uptime: 3600,
        timestamp: '2025-01-15T10:30:00.000Z',
        checks: {
          redis: {
            status: 'up' as const,
            responseTime: 5,
          },
        },
      };

      healthService.getHealth.mockResolvedValue(mockHealth);

      const result = await controller.getHealth();

      expect(result).toEqual(mockHealth);
      expect(healthService.getHealth).toHaveBeenCalled();
    });
  });

  describe('getReadiness', () => {
    it('should return ready status', async () => {
      healthService.isReady.mockResolvedValue(true);

      const result = await controller.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.timestamp).toBeDefined();
    });

    it('should return not ready status', async () => {
      healthService.isReady.mockResolvedValue(false);

      const result = await controller.getReadiness();

      expect(result.status).toBe('not_ready');
    });
  });

  describe('getLiveness', () => {
    it('should return alive status', () => {
      const result = controller.getLiveness();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
    });
  });
});
