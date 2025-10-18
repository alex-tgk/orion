import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomRateLimitGuard extends ThrottlerGuard {
  /**
   * Get real IP address considering proxies
   */
  protected override getTracker(req: Request): Promise<string> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      '';
    return Promise.resolve(ip);
  }

  /**
   * Override to customize rate limiting behavior
   */
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip rate limiting for health checks
    if (request.path === '/health' || request.path === '/metrics') {
      return true;
    }

    // Skip for whitelisted IPs
    const ip = await this.getTracker(request);
    if (this.isWhitelistedIp(ip)) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Check if IP is whitelisted
   */
  private isWhitelistedIp(ip: string): boolean {
    const whitelist = process.env['RATE_LIMIT_WHITELIST']?.split(',') || [];
    return whitelist.includes(ip);
  }

  /**
   * Override error handling
   */
  protected override async throwThrottlingException(_context: ExecutionContext): Promise<void> {
    throw new ThrottlerException('Too many requests. Please try again later.');
  }
}
