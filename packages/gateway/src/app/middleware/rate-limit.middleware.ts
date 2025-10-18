import { Injectable, Logger, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../services/redis.service';
import { ProxyService } from '../services/proxy.service';
import { RequestContext } from '../interfaces/request-context.interface';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly defaultLimit: number;
  private readonly defaultWindow: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly proxyService: ProxyService,
    private readonly configService: ConfigService
  ) {
    this.defaultLimit = this.configService.get<number>('gateway.RATE_LIMIT_DEFAULT', 100);
    this.defaultWindow = this.configService.get<number>('gateway.RATE_LIMIT_WINDOW', 60);
  }

  async use(req: RequestContext, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get route config
      const routeConfig = this.proxyService.getRouteConfig(req.path);
      
      // Determine rate limit for this route
      const limit = routeConfig?.rateLimit?.limit || this.defaultLimit;
      const window = routeConfig?.rateLimit?.window || this.defaultWindow;

      // Get identifier (user ID if authenticated, otherwise IP)
      const identifier = req.user?.userId || req.ip;
      const key = `rate:${identifier}:${req.path}`;

      // Increment counter
      const current = await this.redisService.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await this.redisService.expire(key, window);
      }

      // Get TTL for reset time
      const ttl = await this.redisService.ttl(key);
      const resetTime = Math.floor(Date.now() / 1000) + ttl;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current).toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      // Check if limit exceeded
      if (current > limit) {
        const retryAfter = ttl;
        res.setHeader('Retry-After', retryAfter.toString());

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            error: 'Too Many Requests',
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Rate limiting error: ${error instanceof Error ? error.message : String(error)}`);
      // On error, allow request to proceed
      next();
    }
  }
}
