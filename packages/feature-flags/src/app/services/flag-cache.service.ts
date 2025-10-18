import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IFeatureFlag } from '../interfaces/feature-flag.interface';

@Injectable()
export class FlagCacheService {
  private readonly logger = new Logger(FlagCacheService.name);
  private readonly redis: Redis;
  private readonly PREFIX = 'feature-flag:';
  private readonly TTL = 300; // 5 minutes

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });
  }

  /**
   * Get a flag from cache
   */
  async get(key: string): Promise<IFeatureFlag | null> {
    try {
      const cached = await this.redis.get(this.PREFIX + key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a flag in cache
   */
  async set(key: string, flag: IFeatureFlag): Promise<void> {
    try {
      await this.redis.setex(
        this.PREFIX + key,
        this.TTL,
        JSON.stringify(flag),
      );
    } catch (error) {
      this.logger.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Invalidate cache for a flag
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.del(this.PREFIX + key);
      this.logger.debug(`Cache invalidated for flag: ${key}`);
    } catch (error) {
      this.logger.error(`Cache invalidate error for ${key}:`, error);
    }
  }

  /**
   * Clear all flag cache
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await this.redis.keys(this.PREFIX + '*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} cached flags`);
      }
    } catch (error) {
      this.logger.error('Cache clear all error:', error);
    }
  }

  /**
   * Publish cache invalidation event (for distributed cache)
   */
  async publishInvalidation(key: string): Promise<void> {
    try {
      await this.redis.publish('flag:invalidate', key);
      this.logger.debug(`Published invalidation for: ${key}`);
    } catch (error) {
      this.logger.error(`Publish invalidation error for ${key}:`, error);
    }
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribeToInvalidations(callback: (key: string) => void): void {
    const subscriber = this.redis.duplicate();

    subscriber.subscribe('flag:invalidate', (err) => {
      if (err) {
        this.logger.error('Subscribe error:', err);
        return;
      }
      this.logger.log('Subscribed to cache invalidation events');
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'flag:invalidate') {
        callback(message);
      }
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
