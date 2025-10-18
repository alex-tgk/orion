import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from '../interfaces/request-context.interface';

@Injectable()
export class RequestTransformMiddleware implements NestMiddleware {
  use(req: RequestContext, res: Response, next: NextFunction): void {
    // Add correlation ID to forwarded headers
    if (req.correlationId) {
      req.headers['x-correlation-id'] = req.correlationId;
    }

    // Add user context headers if authenticated
    if (req.user) {
      req.headers['x-user-id'] = req.user.userId;
      req.headers['x-user-email'] = req.user.email;
    }

    // Add internal service marker
    req.headers['x-gateway-forwarded'] = 'true';

    // Remove sensitive headers before forwarding
    this.removeSensitiveHeaders(req);

    next();
  }

  /**
   * Remove sensitive headers that shouldn't be forwarded
   */
  private removeSensitiveHeaders(req: Request): void {
    const sensitiveHeaders = [
      'cookie',
      'set-cookie',
      'x-real-ip',
      'x-forwarded-for',
    ];

    for (const header of sensitiveHeaders) {
      delete req.headers[header];
    }
  }
}
