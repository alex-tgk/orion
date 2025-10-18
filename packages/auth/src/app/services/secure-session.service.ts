import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  accessToken: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export interface EncryptedSession {
  data: string;
  iv: string;
  authTag: string;
  version: number;
}

/**
 * Secure session service with encryption for Redis storage
 */
@Injectable()
export class SecureSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(SecureSessionService.name);
  private redis: Redis;
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';
  private readonly sessionVersion = 1;
  private readonly keyPrefix = 'session:';
  private readonly lockPrefix = 'lock:';

  constructor(private readonly configService: ConfigService) {
    this.initializeRedis();
    this.initializeEncryption();
  }

  /**
   * Initialize Redis connection with security settings
   */
  private initializeRedis() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    try {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('REDIS_DB', 0),
        retryStrategy: (times: number) => {
          if (times > 10) {
            this.logger.error('Redis connection failed after 10 attempts');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        tls: isProduction
          ? {
              rejectUnauthorized: true,
              minVersion: 'TLSv1.2',
            }
          : undefined,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        commandTimeout: 5000,
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected successfully (encrypted mode)');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      throw new Error('Session store initialization failed');
    }
  }

  /**
   * Initialize encryption key
   */
  private initializeEncryption() {
    const masterKey = this.configService.get<string>('SESSION_SECRET');

    if (!masterKey) {
      throw new Error('SESSION_SECRET is required for secure session storage');
    }

    if (masterKey.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters');
    }

    // Derive encryption key from master key
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(masterKey)
      .digest();

    this.logger.log('Session encryption initialized');
  }

  /**
   * Encrypt session data
   */
  private encryptData(data: SessionData): EncryptedSession {
    const jsonData = JSON.stringify(data);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      version: this.sessionVersion,
    };
  }

  /**
   * Decrypt session data
   */
  private decryptData(encrypted: EncryptedSession): SessionData {
    // Check version compatibility
    if (encrypted.version !== this.sessionVersion) {
      throw new Error(`Incompatible session version: ${encrypted.version}`);
    }

    const decipher = crypto.createDecipheriv(
      this.encryptionAlgorithm,
      this.encryptionKey,
      Buffer.from(encrypted.iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Create a new session
   */
  async createSession(
    sessionId: string,
    data: SessionData,
    ttl: number = 3600,
  ): Promise<void> {
    const key = `${this.keyPrefix}${sessionId}`;
    const lockKey = `${this.lockPrefix}${sessionId}`;

    try {
      // Acquire lock to prevent race conditions
      const lock = await this.redis.set(lockKey, '1', 'EX', 5, 'NX');
      if (!lock) {
        throw new Error('Failed to acquire session lock');
      }

      // Encrypt session data
      const encrypted = this.encryptData(data);
      const encryptedJson = JSON.stringify(encrypted);

      // Store encrypted session with expiry
      await this.redis.setex(key, ttl, encryptedJson);

      // Log session creation (without sensitive data)
      this.logger.log(`Session created for user ${data.userId} (TTL: ${ttl}s)`);

      // Release lock
      await this.redis.del(lockKey);
    } catch (error) {
      await this.redis.del(lockKey); // Ensure lock is released
      this.logger.error(`Failed to create session: ${error.message}`);
      throw new Error('Session creation failed');
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `${this.keyPrefix}${sessionId}`;

    try {
      const encryptedJson = await this.redis.get(key);

      if (!encryptedJson) {
        return null;
      }

      const encrypted: EncryptedSession = JSON.parse(encryptedJson);
      const data = this.decryptData(encrypted);

      // Validate session expiry
      if (new Date(data.expiresAt) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last activity
      data.lastActivity = new Date();
      await this.updateSession(sessionId, data);

      return data;
    } catch (error) {
      this.logger.error(`Failed to retrieve session: ${error.message}`);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    data: SessionData,
  ): Promise<void> {
    const key = `${this.keyPrefix}${sessionId}`;

    try {
      const ttl = await this.redis.ttl(key);
      if (ttl <= 0) {
        throw new Error('Session expired or does not exist');
      }

      const encrypted = this.encryptData(data);
      const encryptedJson = JSON.stringify(encrypted);

      await this.redis.setex(key, ttl, encryptedJson);
    } catch (error) {
      this.logger.error(`Failed to update session: ${error.message}`);
      throw new Error('Session update failed');
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.keyPrefix}${sessionId}`;

    try {
      const result = await this.redis.del(key);
      if (result > 0) {
        this.logger.log(`Session deleted: ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete session: ${error.message}`);
      throw new Error('Session deletion failed');
    }
  }

  /**
   * Extend session TTL (sliding expiration)
   */
  async extendSession(sessionId: string, additionalTtl: number): Promise<boolean> {
    const key = `${this.keyPrefix}${sessionId}`;

    try {
      const currentTtl = await this.redis.ttl(key);
      if (currentTtl <= 0) {
        return false;
      }

      const newTtl = currentTtl + additionalTtl;
      const maxTtl = this.configService.get<number>('SESSION_MAX_AGE', 86400);

      // Cap the TTL to maximum allowed
      const finalTtl = Math.min(newTtl, maxTtl);

      const result = await this.redis.expire(key, finalTtl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to extend session: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      const userSessions: string[] = [];

      for (const key of keys) {
        const encryptedJson = await this.redis.get(key);
        if (encryptedJson) {
          try {
            const encrypted: EncryptedSession = JSON.parse(encryptedJson);
            const data = this.decryptData(encrypted);

            if (data.userId === userId) {
              const sessionId = key.replace(this.keyPrefix, '');
              userSessions.push(sessionId);
            }
          } catch {
            // Skip corrupted sessions
            continue;
          }
        }
      }

      return userSessions;
    } catch (error) {
      this.logger.error(`Failed to get user sessions: ${error.message}`);
      return [];
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeUserSessions(userId: string): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      let revoked = 0;

      for (const sessionId of sessions) {
        await this.deleteSession(sessionId);
        revoked++;
      }

      this.logger.log(`Revoked ${revoked} sessions for user ${userId}`);
      return revoked;
    } catch (error) {
      this.logger.error(`Failed to revoke user sessions: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const key = `${this.keyPrefix}${sessionId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      let cleaned = 0;

      for (const key of keys) {
        const encryptedJson = await this.redis.get(key);
        if (encryptedJson) {
          try {
            const encrypted: EncryptedSession = JSON.parse(encryptedJson);
            const data = this.decryptData(encrypted);

            if (new Date(data.expiresAt) < new Date()) {
              await this.redis.del(key);
              cleaned++;
            }
          } catch {
            // Remove corrupted sessions
            await this.redis.del(key);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        this.logger.log(`Cleaned up ${cleaned} expired sessions`);
      }

      return cleaned;
    } catch (error) {
      this.logger.error(`Failed to cleanup sessions: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeUsers: number;
    avgSessionAge: number;
  }> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      const userIds = new Set<string>();
      let totalAge = 0;
      let validSessions = 0;

      for (const key of keys) {
        const encryptedJson = await this.redis.get(key);
        if (encryptedJson) {
          try {
            const encrypted: EncryptedSession = JSON.parse(encryptedJson);
            const data = this.decryptData(encrypted);

            userIds.add(data.userId);
            const age = Date.now() - new Date(data.createdAt).getTime();
            totalAge += age;
            validSessions++;
          } catch {
            // Skip corrupted sessions
            continue;
          }
        }
      }

      return {
        totalSessions: validSessions,
        activeUsers: userIds.size,
        avgSessionAge: validSessions > 0 ? Math.floor(totalAge / validSessions / 1000) : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get session stats: ${error.message}`);
      return {
        totalSessions: 0,
        activeUsers: 0,
        avgSessionAge: 0,
      };
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }
}