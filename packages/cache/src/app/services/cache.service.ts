import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheConfig } from '../config/cache.config';

export interface CacheEntry {
  value: any;
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = this.configService.get<CacheConfig>('cache');

    if (!config) {
      throw new Error('Cache configuration not found');
    }

    this.redis = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      db: config.REDIS_DB,
      retryStrategy: (times: number) => {
        if (times > config.MAX_RETRIES) {
          this.logger.error('Max Redis connection retries exceeded');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      connectTimeout: config.CONNECTION_TIMEOUT,
      maxRetriesPerRequest: config.MAX_RETRIES,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting');
    });

    try {
      await this.redis.ping();
      this.logger.log('Successfully connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  /**
   * Build the full cache key with optional namespace
   */
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Build the tag key for tag-based invalidation
   */
  private buildTagKey(tag: string, namespace?: string): string {
    const prefix = namespace ? `${namespace}:tag` : 'tag';
    return `${prefix}:${tag}`;
  }

  /**
   * Set a value in cache with optional TTL and tags
   */
  async set(
    key: string,
    value: any,
    ttl?: number,
    namespace?: string,
    tags?: string[],
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const serializedValue = JSON.stringify(value);
      const config = this.configService.get<CacheConfig>('cache');
      const effectiveTtl = ttl ?? config?.DEFAULT_TTL;

      if (effectiveTtl) {
        await this.redis.setex(fullKey, effectiveTtl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      // Store tags if provided
      if (tags && tags.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const tag of tags) {
          const tagKey = this.buildTagKey(tag, namespace);
          pipeline.sadd(tagKey, fullKey);
          if (effectiveTtl) {
            // Set expiration on tag set slightly longer than the cached value
            pipeline.expire(tagKey, effectiveTtl + 60);
          }
        }
        await pipeline.exec();
      }

      this.stats.sets++;
      this.logger.debug(
        `Cache set: ${fullKey} (TTL: ${effectiveTtl || 'none'})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        this.logger.debug(`Cache miss: ${fullKey}`);
        return null;
      }

      this.stats.hits++;
      this.logger.debug(`Cache hit: ${fullKey}`);
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Get a value with its TTL
   */
  async getWithTtl<T = any>(
    key: string,
    namespace?: string,
  ): Promise<{ value: T | null; ttl: number }> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const [value, ttl] = await Promise.all([
        this.redis.get(fullKey),
        this.redis.ttl(fullKey),
      ]);

      if (value === null) {
        this.stats.misses++;
        return { value: null, ttl: -2 }; // -2 means key doesn't exist
      }

      this.stats.hits++;
      return { value: JSON.parse(value) as T, ttl };
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key} with TTL:`, error);
      this.stats.misses++;
      return { value: null, ttl: -2 };
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.redis.del(fullKey);
      this.stats.deletes++;
      this.logger.debug(`Cache delete: ${fullKey} (result: ${result})`);
      return result > 0;
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[], namespace?: string): Promise<number> {
    if (keys.length === 0) return 0;

    try {
      const fullKeys = keys.map((key) => this.buildKey(key, namespace));
      const result = await this.redis.del(...fullKeys);
      this.stats.deletes += result;
      this.logger.debug(`Cache delete many: ${result} keys deleted`);
      return result;
    } catch (error) {
      this.logger.error('Failed to delete multiple cache keys:', error);
      return 0;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async setMany(
    entries: Array<{ key: string; value: any; ttl?: number; tags?: string[] }>,
    namespace?: string,
  ): Promise<number> {
    if (entries.length === 0) return 0;

    try {
      const pipeline = this.redis.pipeline();
      const config = this.configService.get<CacheConfig>('cache');

      for (const entry of entries) {
        const fullKey = this.buildKey(entry.key, namespace);
        const serializedValue = JSON.stringify(entry.value);
        const effectiveTtl = entry.ttl ?? config?.DEFAULT_TTL;

        if (effectiveTtl) {
          pipeline.setex(fullKey, effectiveTtl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }

        // Handle tags
        if (entry.tags && entry.tags.length > 0) {
          for (const tag of entry.tags) {
            const tagKey = this.buildTagKey(tag, namespace);
            pipeline.sadd(tagKey, fullKey);
            if (effectiveTtl) {
              pipeline.expire(tagKey, effectiveTtl + 60);
            }
          }
        }
      }

      const results = await pipeline.exec();
      const successCount = results?.filter((r) => r[0] === null).length || 0;
      this.stats.sets += successCount;
      this.logger.debug(
        `Cache set many: ${successCount}/${entries.length} successful`,
      );
      return successCount;
    } catch (error) {
      this.logger.error('Failed to set multiple cache keys:', error);
      return 0;
    }
  }

  /**
   * Get multiple values
   */
  async getMany<T = any>(
    keys: string[],
    namespace?: string,
  ): Promise<Array<T | null>> {
    if (keys.length === 0) return [];

    try {
      const fullKeys = keys.map((key) => this.buildKey(key, namespace));
      const values = await this.redis.mget(...fullKeys);

      return values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        try {
          return JSON.parse(value) as T;
        } catch (error) {
          this.logger.error(
            `Failed to parse value for key ${keys[index]}:`,
            error,
          );
          return null;
        }
      });
    } catch (error) {
      this.logger.error('Failed to get multiple cache keys:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Invalidate cache by pattern (supports wildcards)
   */
  async invalidateByPattern(
    pattern: string,
    namespace?: string,
  ): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, namespace);
      const keys = await this.scanKeys(fullPattern);

      if (keys.length === 0) {
        this.logger.debug(`No keys found for pattern: ${fullPattern}`);
        return 0;
      }

      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      this.logger.log(
        `Invalidated ${result} keys matching pattern: ${fullPattern}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to invalidate by pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[], namespace?: string): Promise<number> {
    if (tags.length === 0) return 0;

    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag, namespace);
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
        }

        // Delete the tag set itself
        await this.redis.del(tagKey);
      }

      this.stats.deletes += totalDeleted;
      this.logger.log(
        `Invalidated ${totalDeleted} keys for tags: ${tags.join(', ')}`,
      );
      return totalDeleted;
    } catch (error) {
      this.logger.error(`Failed to invalidate by tags ${tags}:`, error);
      return 0;
    }
  }

  /**
   * Scan keys matching a pattern (handles pagination internally)
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
    this.logger.log('Cache statistics reset');
  }

  /**
   * Get Redis info
   */
  async getRedisInfo(): Promise<any> {
    try {
      const info = await this.redis.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      return null;
    }
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const parsed: Record<string, any> = {};
    let section = 'general';

    for (const line of lines) {
      if (line.startsWith('#')) {
        section = line.substring(2).toLowerCase();
        parsed[section] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (section && key && value !== undefined) {
          parsed[section][key] = value;
        }
      }
    }

    return parsed;
  }

  /**
   * Get total number of keys
   */
  async getKeyCount(namespace?: string): Promise<number> {
    try {
      if (namespace) {
        const pattern = `${namespace}:*`;
        const keys = await this.scanKeys(pattern);
        return keys.length;
      }
      return await this.redis.dbsize();
    } catch (error) {
      this.logger.error('Failed to get key count:', error);
      return 0;
    }
  }

  /**
   * Flush all cache (use with caution)
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      this.logger.warn('Cache flushed - all keys deleted');
      return true;
    } catch (error) {
      this.logger.error('Failed to flush cache:', error);
      return false;
    }
  }

  /**
   * Check Redis health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }
}
