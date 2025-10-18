import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FlagCacheService } from '../app/services/flag-cache.service';
import { FlagType } from '../app/interfaces/feature-flag.interface';

describe('FlagCacheService', () => {
  let service: FlagCacheService;
  let mockRedisClient: any;

  const mockFlag = {
    id: '1',
    key: 'test-flag',
    name: 'Test Flag',
    enabled: true,
    type: FlagType.BOOLEAN,
    rolloutPercentage: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      publish: jest.fn(),
      duplicate: jest.fn(),
      subscribe: jest.fn(),
      on: jest.fn(),
      quit: jest.fn(),
    };

    // Mock duplicate for subscription
    mockRedisClient.duplicate.mockReturnValue({
      subscribe: jest.fn((_channel, callback) => callback(null)),
      on: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlagCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<FlagCacheService>(FlagCacheService);
    // Replace the real Redis client with mock
    (service as any).redis = mockRedisClient;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    // Cleanup Redis connections
    await service.onModuleDestroy().catch(() => {});
  });

  describe('get', () => {
    it('should return cached flag if exists', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockFlag));

      const result = await service.get('test-flag');

      // Dates are serialized as strings when retrieved from Redis
      expect(result).toEqual({
        ...mockFlag,
        createdAt: mockFlag.createdAt.toISOString(),
        updatedAt: mockFlag.updatedAt.toISOString(),
      });
      expect(mockRedisClient.get).toHaveBeenCalledWith('feature-flag:test-flag');
    });

    it('should return null if flag not in cache', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('test-flag');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test-flag');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache flag with TTL', async () => {
      mockRedisClient.setex.mockResolvedValue('OK');

      await service.set('test-flag', mockFlag);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'feature-flag:test-flag',
        300, // TTL
        JSON.stringify(mockFlag),
      );
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('test-flag', mockFlag)).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should remove flag from cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.invalidate('test-flag');

      expect(mockRedisClient.del).toHaveBeenCalledWith('feature-flag:test-flag');
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.invalidate('test-flag')).resolves.not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should clear all cached flags', async () => {
      const keys = ['feature-flag:flag1', 'feature-flag:flag2'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(2);

      await service.clearAll();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('feature-flag:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should not call del if no keys found', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.clearAll();

      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.clearAll()).resolves.not.toThrow();
    });
  });

  describe('publishInvalidation', () => {
    it('should publish invalidation event', async () => {
      mockRedisClient.publish.mockResolvedValue(1);

      await service.publishInvalidation('test-flag');

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'flag:invalidate',
        'test-flag',
      );
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.publish.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.publishInvalidation('test-flag'),
      ).resolves.not.toThrow();
    });
  });

  describe('subscribeToInvalidations', () => {
    it('should subscribe to invalidation events', () => {
      const callback = jest.fn();
      const mockSubscriber = {
        subscribe: jest.fn((_channel, cb) => cb(null)),
        on: jest.fn(),
      };
      mockRedisClient.duplicate.mockReturnValue(mockSubscriber);

      service.subscribeToInvalidations(callback);

      expect(mockRedisClient.duplicate).toHaveBeenCalled();
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith(
        'flag:invalidate',
        expect.any(Function),
      );
    });

    it('should call callback when message received', () => {
      const callback = jest.fn();
      const mockSubscriber = {
        subscribe: jest.fn((_channel, cb) => cb(null)),
        on: jest.fn((event, handler) => {
          if (event === 'message') {
            // Simulate receiving a message
            handler('flag:invalidate', 'test-flag');
          }
        }),
      };
      mockRedisClient.duplicate.mockReturnValue(mockSubscriber);

      service.subscribeToInvalidations(callback);

      expect(callback).toHaveBeenCalledWith('test-flag');
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis connection', async () => {
      mockRedisClient.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
