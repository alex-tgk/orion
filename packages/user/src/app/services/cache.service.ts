import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('redis.enabled', true);
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('Redis caching is disabled');
      return;
    }

    try {
      const host = this.configService.get<string>('redis.host')!;
      const port = this.configService.get<number>('redis.port')!;
      const password = this.configService.get<string>('redis.password');
      const db = this.configService.get<number>('redis.db')!;

      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        this.logger.log('Connected to Redis successfully');
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis connection error', error);
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis', error);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get key ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.client) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Failed to delete pattern ${pattern}`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}`, error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }
}
