import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { createHash } from 'crypto';
import { ValidatedToken } from '../interfaces/request-context.interface';
import axios, { AxiosError } from 'axios';

@Injectable()
export class JwtCacheService {
  private readonly logger = new Logger(JwtCacheService.name);
  private readonly cacheTtl: number;
  private readonly authServiceUrl: string;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {
    this.cacheTtl = this.configService.get<number>('gateway.JWT_CACHE_TTL', 300);
    this.authServiceUrl = this.configService.get<string>('gateway.AUTH_SERVICE_URL');
  }

  /**
   * Validate JWT token with caching
   */
  async validateToken(token: string): Promise<ValidatedToken> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `jwt:${tokenHash}`;

    // Try to get from cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug('JWT cache hit');
      return JSON.parse(cached) as ValidatedToken;
    }

    // Validate with auth service
    this.logger.debug('JWT cache miss - validating with auth service');
    const validated = await this.validateWithAuthService(token);

    // Cache the result
    await this.redisService.set(cacheKey, JSON.stringify(validated), this.cacheTtl);

    return validated;
  }

  /**
   * Invalidate cached token
   */
  async invalidateToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `jwt:${tokenHash}`;
    await this.redisService.del(cacheKey);
    this.logger.debug(`Invalidated JWT cache for token ${tokenHash.substring(0, 8)}...`);
  }

  /**
   * Validate token with auth service
   */
  private async validateWithAuthService(token: string): Promise<ValidatedToken> {
    try {
      const response = await axios.post(
        `${this.authServiceUrl}/api/auth/validate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        }
      );

      if (response.data && response.data.userId && response.data.email) {
        return {
          userId: response.data.userId,
          email: response.data.email,
          iat: response.data.iat,
          exp: response.data.exp,
        };
      }

      throw new UnauthorizedException('Invalid token response from auth service');
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 401) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      if (axiosError.code === 'ECONNREFUSED') {
        this.logger.error('Auth service unavailable');
        throw new Error('Auth service unavailable');
      }

      this.logger.error(`Token validation error: ${axiosError.message}`);
      throw new UnauthorizedException('Token validation failed');
    }
  }

  /**
   * Hash token for cache key (to avoid storing full token in Redis key)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
