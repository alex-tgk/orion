import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../services/cache.service';
import Redis from 'ioredis';

/**
 * Integration Tests for CacheService with Real Redis
 *
 * These tests require a running Redis instance.
 * Skip these tests if Redis is not available in the test environment.
 */
describe('CacheService Integration Tests', () => {
  let service: CacheService;
  let redis: Redis;
  const testNamespace = 'test-integration';

  // Check if Redis is available
  const isRedisAvailable = async (): Promise<boolean> => {
    try {
      const client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        connectTimeout: 1000,
        maxRetriesPerRequest: 1,
      });
      await client.ping();
      await client.quit();
      return true;
    } catch {
      return false;
    }
  };

  beforeAll(async () => {
    const redisAvailable = await isRedisAvailable();

    if (!redisAvailable) {
      console.log('Redis not available, skipping integration tests');
      return;
    }

    const mockConfig = {
      REDIS_HOST: process.env.REDIS_HOST || 'localhost',
      REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
      REDIS_DB: 15, // Use separate DB for testing
      DEFAULT_TTL: 3600,
      MAX_CACHE_SIZE: 10000,
      CONNECTION_TIMEOUT: 5000,
      MAX_RETRIES: 3,
    };

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
    await service.onModuleInit();

    // Clean up test namespace before tests
    await service.invalidateByPattern(`${testNamespace}:*`);
  });

  afterAll(async () => {
    if (service) {
      // Clean up test namespace after tests
      await service.invalidateByPattern(`${testNamespace}:*`);
      await service.onModuleDestroy();
    }
  });

  // Helper to check if Redis is available for individual tests
  const skipIfNoRedis = () => {
    if (!service) {
      console.log('Skipping test: Redis not available');
      return true;
    }
    return false;
  };

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      if (skipIfNoRedis()) return;

      const key = 'basic-test';
      const value = { test: 'data', number: 123 };

      await service.set(key, value, undefined, testNamespace);
      const result = await service.get(key, testNamespace);

      expect(result).toEqual(value);
    });

    it('should respect TTL', async () => {
      if (skipIfNoRedis()) return;

      const key = 'ttl-test';
      const value = 'test-value';
      const ttl = 2; // 2 seconds

      await service.set(key, value, ttl, testNamespace);

      // Value should exist immediately
      const immediate = await service.get(key, testNamespace);
      expect(immediate).toBe(value);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Value should be gone
      const afterTtl = await service.get(key, testNamespace);
      expect(afterTtl).toBeNull();
    });

    it('should delete a key', async () => {
      if (skipIfNoRedis()) return;

      const key = 'delete-test';
      const value = 'test-value';

      await service.set(key, value, undefined, testNamespace);
      const exists = await service.exists(key, testNamespace);
      expect(exists).toBe(true);

      const deleted = await service.delete(key, testNamespace);
      expect(deleted).toBe(true);

      const afterDelete = await service.exists(key, testNamespace);
      expect(afterDelete).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should set and get multiple values', async () => {
      if (skipIfNoRedis()) return;

      const entries = [
        { key: 'batch-1', value: { id: 1 } },
        { key: 'batch-2', value: { id: 2 } },
        { key: 'batch-3', value: { id: 3 } },
      ];

      const setCount = await service.setMany(entries, testNamespace);
      expect(setCount).toBe(3);

      const keys = entries.map((e) => e.key);
      const values = await service.getMany(keys, testNamespace);

      expect(values).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should delete multiple keys', async () => {
      if (skipIfNoRedis()) return;

      const keys = ['multi-1', 'multi-2', 'multi-3'];

      // Set values
      for (const key of keys) {
        await service.set(key, `value-${key}`, undefined, testNamespace);
      }

      // Delete all
      const deleted = await service.deleteMany(keys, testNamespace);
      expect(deleted).toBe(3);

      // Verify deletion
      const values = await service.getMany(keys, testNamespace);
      expect(values).toEqual([null, null, null]);
    });
  });

  describe('Pattern-based Invalidation', () => {
    it('should invalidate keys by pattern', async () => {
      if (skipIfNoRedis()) return;

      // Set multiple keys with pattern
      await service.set('user:1:profile', { name: 'User 1' }, undefined, testNamespace);
      await service.set('user:1:settings', { theme: 'dark' }, undefined, testNamespace);
      await service.set('user:2:profile', { name: 'User 2' }, undefined, testNamespace);

      // Invalidate user:1:* pattern
      const count = await service.invalidateByPattern(
        'user:1:*',
        testNamespace,
      );
      expect(count).toBeGreaterThanOrEqual(2);

      // Verify invalidation
      const profile1 = await service.get('user:1:profile', testNamespace);
      const settings1 = await service.get('user:1:settings', testNamespace);
      const profile2 = await service.get('user:2:profile', testNamespace);

      expect(profile1).toBeNull();
      expect(settings1).toBeNull();
      expect(profile2).not.toBeNull(); // Should still exist
    });
  });

  describe('Tag-based Invalidation', () => {
    it('should invalidate keys by tags', async () => {
      if (skipIfNoRedis()) return;

      // Set keys with tags
      await service.set(
        'post:1',
        { title: 'Post 1' },
        undefined,
        testNamespace,
        ['post', 'user:1'],
      );
      await service.set(
        'post:2',
        { title: 'Post 2' },
        undefined,
        testNamespace,
        ['post', 'user:1'],
      );
      await service.set(
        'post:3',
        { title: 'Post 3' },
        undefined,
        testNamespace,
        ['post', 'user:2'],
      );

      // Invalidate by tag
      const count = await service.invalidateByTags(['user:1'], testNamespace);
      expect(count).toBeGreaterThanOrEqual(2);

      // Verify invalidation
      const post1 = await service.get('post:1', testNamespace);
      const post2 = await service.get('post:2', testNamespace);
      const post3 = await service.get('post:3', testNamespace);

      expect(post1).toBeNull();
      expect(post2).toBeNull();
      expect(post3).not.toBeNull(); // Different tag, should still exist
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', async () => {
      if (skipIfNoRedis()) return;

      service.resetStats();

      // Set a key
      await service.set('stats-test', 'value', undefined, testNamespace);

      // Hit
      await service.get('stats-test', testNamespace);

      // Miss
      await service.get('nonexistent', testNamespace);

      const stats = service.getStats();

      expect(stats.hits).toBeGreaterThanOrEqual(1);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.sets).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      if (skipIfNoRedis()) return;

      const healthy = await service.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should get Redis info', async () => {
      if (skipIfNoRedis()) return;

      const info = await service.getRedisInfo();
      expect(info).toBeDefined();
      expect(info).toHaveProperty('server');
      expect(info).toHaveProperty('memory');
    });
  });
});
