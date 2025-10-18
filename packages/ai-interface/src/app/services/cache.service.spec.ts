import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'ai.AI_CACHE_ENABLED': 0, // Disabled for tests
        'ai.AI_CACHE_TTL': 3600,
        'ai.REDIS_HOST': 'localhost',
        'ai.REDIS_PORT': 6379,
        'ai.REDIS_DB': 0,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when cache is disabled', () => {
    it('should return null on get', async () => {
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should do nothing on set', async () => {
      await expect(service.set('test-key', { data: 'value' })).resolves.not.toThrow();
    });

    it('should do nothing on delete', async () => {
      await expect(service.delete('test-key')).resolves.not.toThrow();
    });

    it('should return false on exists', async () => {
      const result = await service.exists('test-key');
      expect(result).toBe(false);
    });

    it('should return disabled stats', async () => {
      const stats = await service.getStats();
      expect(stats.enabled).toBe(false);
      expect(stats.keyCount).toBe(0);
    });
  });

  describe('cache operations', () => {
    it('should handle get errors gracefully', async () => {
      const result = await service.get('error-key');
      expect(result).toBeNull();
    });

    it('should handle set errors gracefully', async () => {
      await expect(
        service.set('error-key', { data: 'value' }),
      ).resolves.not.toThrow();
    });

    it('should handle delete errors gracefully', async () => {
      await expect(service.delete('error-key')).resolves.not.toThrow();
    });
  });
});

describe('CacheService (enabled)', () => {
  let service: CacheService;

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    dbsize: jest.fn(),
    info: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'ai.AI_CACHE_ENABLED': 1, // Enabled
        'ai.AI_CACHE_TTL': 3600,
        'ai.REDIS_HOST': 'localhost',
        'ai.REDIS_PORT': 6379,
        'ai.REDIS_DB': 0,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Redis constructor
    jest.mock('ioredis', () => {
      return jest.fn().mockImplementation(() => mockRedisClient);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheService,
          useFactory: (config: ConfigService) => {
            const cacheService = new CacheService(config);
            // Replace redis client with mock
            (cacheService as any).redis = mockRedisClient;
            return cacheService;
          },
          inject: [ConfigService],
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('get', () => {
    it('should return parsed value from cache', async () => {
      const testData = { test: 'data' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent keys', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('error-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      const testData = { test: 'data' };
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('test-key', testData, 7200);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-key',
        7200,
        JSON.stringify(testData),
      );
    });

    it('should use default TTL if not provided', async () => {
      const testData = { test: 'data' };
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('test-key', testData);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'test-key',
        3600, // default TTL
        JSON.stringify(testData),
      );
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.set('error-key', { data: 'value' }),
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('error-key')).resolves.not.toThrow();
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2', 'key3']);
      mockRedisClient.del.mockResolvedValue(3);

      await service.deletePattern('test:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should do nothing if no keys match', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.deletePattern('test:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false if key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedisClient.dbsize.mockResolvedValue(100);
      mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\n');

      const stats = await service.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.keyCount).toBe(100);
      expect(stats.memoryUsage).toBe('1.5M');
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.dbsize.mockRejectedValue(new Error('Redis error'));

      const stats = await service.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.keyCount).toBe(0);
    });
  });
});
