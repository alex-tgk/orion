import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

export interface SessionData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  createdAt: number;
  expiresAt: number;
  metadata: {
    ip?: string;
    userAgent?: string;
  };
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private redis: Redis | null = null;
  private readonly isRedisAvailable: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.redis.on('connect', () => {
        (this as { isRedisAvailable: boolean }).isRedisAvailable = true;
        this.logger.log('Redis connected successfully');
      });

      this.redis.on('error', (err) => {
        (this as { isRedisAvailable: boolean }).isRedisAvailable = false;
        this.logger.error(`Redis error: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
    }
  }

  async createSession(sessionData: SessionData): Promise<void> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, session not persisted');
      return;
    }

    try {
      const key = `session:${sessionData.userId}`;
      const ttl = 7 * 24 * 60 * 60; // 7 days

      await this.redis.setex(key, ttl, JSON.stringify(sessionData));
      this.logger.log(`Session created for user ${sessionData.userId}`);
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
    }
  }

  async getSession(userId: string): Promise<SessionData | null> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, cannot retrieve session');
      return null;
    }

    try {
      const key = `session:${userId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to get session: ${error.message}`);
      return null;
    }
  }

  async deleteSession(userId: string): Promise<void> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, session not deleted');
      return;
    }

    try {
      const key = `session:${userId}`;
      await this.redis.del(key);
      this.logger.log(`Session deleted for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete session: ${error.message}`);
    }
  }

  async blacklistToken(tokenId: string, expiresIn: number): Promise<void> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, token not blacklisted');
      return;
    }

    try {
      const key = `blacklist:${tokenId}`;
      await this.redis.setex(key, expiresIn, 'revoked');
      this.logger.log(`Token ${tokenId} blacklisted`);
    } catch (error) {
      this.logger.error(`Failed to blacklist token: ${error.message}`);
    }
  }

  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, cannot check blacklist');
      return false;
    }

    try {
      const key = `blacklist:${tokenId}`;
      const result = await this.redis.get(key);
      return result !== null;
    } catch (error) {
      this.logger.error(`Failed to check blacklist: ${error.message}`);
      return false;
    }
  }

  getRedisStatus(): 'connected' | 'disconnected' {
    return this.isRedisAvailable ? 'connected' : 'disconnected';
  }
}
