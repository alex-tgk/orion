import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly enabled: boolean;
  private readonly defaultTTL: number;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<number>('ai.AI_CACHE_ENABLED') === 1;
    this.defaultTTL = this.configService.get<number>('ai.AI_CACHE_TTL') || 3600;

    if (this.enabled) {
      const host = this.configService.get<string>('ai.REDIS_HOST') || 'localhost';
      const port = this.configService.get<number>('ai.REDIS_PORT') || 6379;
      const password = this.configService.get<string>('ai.REDIS_PASSWORD');
      const db = this.configService.get<number>('ai.REDIS_DB') || 0;

      this.redis = new Redis({
        host,
        port,
        password,
        db,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected successfully');
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis error:', err);
      });
    } else {
      this.logger.warn('Cache is disabled');
      // Create a mock Redis client that does nothing
      this.redis = {} as Redis;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const serialized = JSON.stringify(value);
      const expirySeconds = ttl || this.defaultTTL;

      await this.redis.setex(key, expirySeconds, serialized);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    keyCount: number;
    memoryUsage?: string;
  }> {
    if (!this.enabled) {
      return { enabled: false, keyCount: 0 };
    }

    try {
      const keyCount = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : undefined;

      return {
        enabled: true,
        keyCount,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return { enabled: true, keyCount: 0 };
    }
  }

  async onModuleDestroy() {
    if (this.enabled) {
      await this.redis.quit();
    }
  }
}
