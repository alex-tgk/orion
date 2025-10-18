import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private isRedisAvailable = false;
  private inMemoryCache = new Map<string, { value: any; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  async onModuleInit() {
    await this.initializeRedis();
    this.startCleanupInterval();
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private async initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
        password: process.env['REDIS_PASSWORD'],
        db: parseInt(process.env['REDIS_DB'] || '1', 10), // Use different DB for caching
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed, using in-memory cache');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.redis.on('connect', () => {
        this.isRedisAvailable = true;
        this.logger.log('Cache service connected to Redis');
      });

      this.redis.on('error', (err) => {
        this.isRedisAvailable = false;
        this.logger.warn(`Redis error, falling back to in-memory cache: ${err.message}`);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to initialize Redis, using in-memory cache: ${message}`);
    }
  }

  private startCleanupInterval() {
    // Clean up expired in-memory cache entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.inMemoryCache.entries()) {
        if (entry.expiresAt <= now) {
          this.inMemoryCache.delete(key);
        }
      }
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redis && this.isRedisAvailable) {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value) as T;
        }
        return null;
      }

      // Fall back to in-memory cache
      const cached = this.inMemoryCache.get(key);
      if (!cached) {
        return null;
      }

      if (cached.expiresAt <= Date.now()) {
        this.inMemoryCache.delete(key);
        return null;
      }

      return cached.value as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache get error for key ${key}: ${message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // Default 5 minutes

    try {
      // Try Redis first if available
      if (this.redis && this.isRedisAvailable) {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
        return;
      }

      // Fall back to in-memory cache
      this.inMemoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache set error for key ${key}: ${message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.redis && this.isRedisAvailable) {
        await this.redis.del(key);
      }
      this.inMemoryCache.delete(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache delete error for key ${key}: ${message}`);
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (this.redis && this.isRedisAvailable && pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else if (pattern) {
        // Clear in-memory cache matching pattern
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.inMemoryCache.keys()) {
          if (regex.test(key)) {
            this.inMemoryCache.delete(key);
          }
        }
      } else {
        // Clear all
        if (this.redis && this.isRedisAvailable) {
          await this.redis.flushdb();
        }
        this.inMemoryCache.clear();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache clear error: ${message}`);
    }
  }

  getStats() {
    return {
      redisAvailable: this.isRedisAvailable,
      inMemoryCacheSize: this.inMemoryCache.size,
      cacheType: this.isRedisAvailable ? 'redis' : 'in-memory',
    };
  }
}
