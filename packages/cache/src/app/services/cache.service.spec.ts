import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('CacheService', () => {
  let service: CacheService;
  let configService: ConfigService;
  let mockRedis: jest.Mocked<Redis>;

  const mockConfig = {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: undefined,
    REDIS_DB: 0,
    DEFAULT_TTL: 3600,
    MAX_CACHE_SIZE: 10000,
    CONNECTION_TIMEOUT: 5000,
    MAX_RETRIES: 3,
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock Redis instance
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      set: jest.fn().mockResolvedValue('OK'),
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      mget: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
      scan: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      expire: jest.fn(),
      info: jest.fn(),
      dbsize: jest.fn(),
      flushdb: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
      pipeline: jest.fn().mockReturnValue({
        setex: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 'OK']]),
      }),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'cache') return mockConfig;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service (calls onModuleInit)
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Module Lifecycle', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Redis connection on module init', async () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
          db: 0,
        }),
      );
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should close Redis connection on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should throw error if config is not found', async () => {
      const badConfigService = {
        get: jest.fn(() => null),
      };

      const module = await Test.createTestingModule({
        providers: [
          CacheService,
          { provide: ConfigService, useValue: badConfigService },
        ],
      }).compile();

      const badService = module.get<CacheService>(CacheService);

      await expect(badService.onModuleInit()).rejects.toThrow(
        'Cache configuration not found',
      );
    });
  });

  describe('set', () => {
    it('should set a value with default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      const result = await service.set(key, value);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        3600,
        JSON.stringify(value),
      );
    });

    it('should set a value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 7200;

      const result = await service.set(key, value, ttl);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        ttl,
        JSON.stringify(value),
      );
    });

    it('should set a value with undefined TTL (uses default)', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      const result = await service.set(key, value, undefined);

      expect(result).toBe(true);
      // Should use default TTL from config (3600)
      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        3600,
        JSON.stringify(value),
      );
    });

    it('should set a value with namespace', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const namespace = 'tenant:acme';

      const result = await service.set(key, value, 3600, namespace);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'tenant:acme:test-key',
        3600,
        JSON.stringify(value),
      );
    });

    it('should set a value with tags', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const tags = ['user', 'profile'];
      const pipeline = mockRedis.pipeline();

      const result = await service.set(key, value, 3600, undefined, tags);

      expect(result).toBe(true);
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(pipeline.sadd).toHaveBeenCalledTimes(2);
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.set('key', 'value');

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should get a value from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value));

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockRedis.get).toHaveBeenCalledWith(key);
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should get a value with namespace', async () => {
      const key = 'test-key';
      const namespace = 'tenant:acme';
      const value = { data: 'test' };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value));

      const result = await service.get(key, namespace);

      expect(result).toEqual(value);
      expect(mockRedis.get).toHaveBeenCalledWith('tenant:acme:test-key');
    });

    it('should return null on error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

      const result = await service.get('key');

      expect(result).toBeNull();
    });
  });

  describe('getWithTtl', () => {
    it('should get value with TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(value));
      mockRedis.ttl.mockResolvedValueOnce(3600);

      const result = await service.getWithTtl(key);

      expect(result).toEqual({ value, ttl: 3600 });
    });

    it('should return null value for non-existent key', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.ttl.mockResolvedValueOnce(-2);

      const result = await service.getWithTtl('non-existent');

      expect(result).toEqual({ value: null, ttl: -2 });
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedis.exists.mockResolvedValueOnce(1);

      const result = await service.exists('existing-key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedis.exists.mockResolvedValueOnce(0);

      const result = await service.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      const result = await service.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should return false if key was not deleted', async () => {
      mockRedis.del.mockResolvedValueOnce(0);

      const result = await service.delete('non-existent');

      expect(result).toBe(false);
    });

    it('should delete key with namespace', async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      const result = await service.delete('test-key', 'tenant:acme');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('tenant:acme:test-key');
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple keys', async () => {
      mockRedis.del.mockResolvedValueOnce(3);

      const result = await service.deleteMany(['key1', 'key2', 'key3']);

      expect(result).toBe(3);
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should return 0 for empty array', async () => {
      const result = await service.deleteMany([]);

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('setMany', () => {
    it('should set multiple values', async () => {
      const entries = [
        { key: 'key1', value: 'value1', ttl: 3600 },
        { key: 'key2', value: 'value2', ttl: 7200 },
      ];

      // Mock pipeline to return 2 successful results
      const mockPipeline = {
        setex: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 'OK'],
          [null, 'OK'],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const result = await service.setMany(entries);

      expect(result).toBe(2);
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should return 0 for empty array', async () => {
      const result = await service.setMany([]);

      expect(result).toBe(0);
      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('getMany', () => {
    it('should get multiple values', async () => {
      const values = [
        JSON.stringify({ data: 'test1' }),
        JSON.stringify({ data: 'test2' }),
      ];
      mockRedis.mget.mockResolvedValueOnce(values);

      const result = await service.getMany(['key1', 'key2']);

      expect(result).toEqual([{ data: 'test1' }, { data: 'test2' }]);
    });

    it('should return nulls for non-existent keys', async () => {
      mockRedis.mget.mockResolvedValueOnce([null, null]);

      const result = await service.getMany(['key1', 'key2']);

      expect(result).toEqual([null, null]);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.getMany([]);

      expect(result).toEqual([]);
      expect(mockRedis.mget).not.toHaveBeenCalled();
    });
  });

  describe('invalidateByPattern', () => {
    it('should invalidate keys by pattern', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['key1', 'key2', 'key3']]);
      mockRedis.del.mockResolvedValueOnce(3);

      const result = await service.invalidateByPattern('user:*');

      expect(result).toBe(3);
      expect(mockRedis.scan).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
    });

    it('should return 0 if no keys match', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]);

      const result = await service.invalidateByPattern('nonexistent:*');

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidateByTags', () => {
    it('should invalidate keys by tags', async () => {
      mockRedis.smembers.mockResolvedValueOnce(['key1', 'key2']);
      mockRedis.del.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const result = await service.invalidateByTags(['user']);

      expect(result).toBe(2);
      expect(mockRedis.smembers).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledTimes(2);
    });

    it('should return 0 for empty tags array', async () => {
      const result = await service.invalidateByTags([]);

      expect(result).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
    });
  });

  describe('resetStats', () => {
    it('should reset statistics', () => {
      service.resetStats();
      const stats = service.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
    });
  });

  describe('getKeyCount', () => {
    it('should return total key count', async () => {
      mockRedis.dbsize.mockResolvedValueOnce(100);

      const result = await service.getKeyCount();

      expect(result).toBe(100);
      expect(mockRedis.dbsize).toHaveBeenCalled();
    });

    it('should return key count for namespace', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', ['key1', 'key2']]);

      const result = await service.getKeyCount('tenant:acme');

      expect(result).toBe(2);
    });
  });

  describe('flushAll', () => {
    it('should flush all cache', async () => {
      mockRedis.flushdb.mockResolvedValueOnce('OK');

      const result = await service.flushAll();

      expect(result).toBe(true);
      expect(mockRedis.flushdb).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true if Redis is healthy', async () => {
      mockRedis.ping.mockResolvedValueOnce('PONG');

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false if Redis is unhealthy', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });
});
