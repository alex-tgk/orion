import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisClient: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'redis.enabled': true,
        'redis.host': 'localhost',
        'redis.port': 6379,
        'redis.password': 'test-password',
        'redis.db': 0,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
      status: 'ready',
    } as any;

    (Redis as unknown as jest.Mock).mockImplementation(() => mockRedisClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<CacheService>(CacheService);
    await service.onModuleInit();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to Redis on module initialization', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: 'test-password',
        db: 0,
        retryStrategy: expect.any(Function),
      });
    });

    it('should register event listeners', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('get', () => {
    it('should retrieve and parse cached value', async () => {
      const testData = { name: 'Test User', email: 'test@example.com' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      const result = await service.get('test-key');

      expect(result).toBeNull();
    });

    it('should return null if Redis client is not connected', async () => {
      // Create a new service instance without Redis
      const module: TestingModule = await Test.createTestingModule({
        providers: [CacheService, { provide: ConfigService, useValue: {
          get: jest.fn((key: string) => key === 'redis.enabled' ? false : undefined)
        }}],
      }).compile();

      const disabledService = module.get<CacheService>(CacheService);
      await disabledService.onModuleInit();

      const result = await disabledService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      const testData = { name: 'Test User' };

      await service.set('test-key', testData);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });

    it('should set value with TTL', async () => {
      const testData = { name: 'Test User' };
      const ttl = 300;

      await service.set('test-key', testData, ttl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', ttl, JSON.stringify(testData));
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('test-key', { data: 'test' })).resolves.not.toThrow();
    });

    it('should do nothing if Redis client is not connected', async () => {
      // Create a new service instance without Redis
      const module: TestingModule = await Test.createTestingModule({
        providers: [CacheService, { provide: ConfigService, useValue: {
          get: jest.fn((key: string) => key === 'redis.enabled' ? false : undefined)
        }}],
      }).compile();

      const disabledService = module.get<CacheService>(CacheService);
      await disabledService.onModuleInit();

      await disabledService.set('test-key', { data: 'test' });

      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      await service.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('test-key')).resolves.not.toThrow();
    });

    it('should do nothing if Redis client is not connected', async () => {
      // Create a new service instance without Redis
      const module: TestingModule = await Test.createTestingModule({
        providers: [CacheService, { provide: ConfigService, useValue: {
          get: jest.fn((key: string) => key === 'redis.enabled' ? false : undefined)
        }}],
      }).compile();

      const disabledService = module.get<CacheService>(CacheService);
      await disabledService.onModuleInit();

      await disabledService.delete('test-key');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('deletePattern', () => {
    it('should delete keys matching pattern', async () => {
      const keys = ['user:1', 'user:2', 'user:3'];
      mockRedisClient.keys.mockResolvedValue(keys);

      await service.deletePattern('user:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should do nothing if no keys match pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.deletePattern('user:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.deletePattern('user:*')).resolves.not.toThrow();
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

    it('should return false on error', async () => {
      mockRedisClient.exists.mockRejectedValue(new Error('Redis error'));

      const result = await service.exists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('isConnected', () => {
    it('should return true when Redis client is connected', () => {
      expect(service.isConnected()).toBe(true);
    });

    it('should return false when Redis client is not connected', async () => {
      // Create a new service instance without Redis
      const module: TestingModule = await Test.createTestingModule({
        providers: [CacheService, { provide: ConfigService, useValue: {
          get: jest.fn((key: string) => key === 'redis.enabled' ? false : undefined)
        }}],
      }).compile();

      const disabledService = module.get<CacheService>(CacheService);
      await disabledService.onModuleInit();

      expect(disabledService.isConnected()).toBe(false);
    });

    it('should return false when Redis status is not ready', () => {
      (mockRedisClient as any).status = 'connecting';

      expect(service.isConnected()).toBe(false);
    });
  });

  describe('disabled cache', () => {
    it('should skip Redis initialization when disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'redis.enabled') return false;
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [CacheService, { provide: ConfigService, useValue: mockConfigService }],
      }).compile();

      const disabledService = module.get<CacheService>(CacheService);

      // Clear previous Redis constructor calls
      jest.clearAllMocks();

      await disabledService.onModuleInit();

      expect(Redis).not.toHaveBeenCalled();
      expect(disabledService.isConnected()).toBe(false);
    });
  });
});
