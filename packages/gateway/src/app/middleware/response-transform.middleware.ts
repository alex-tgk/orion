import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RequestContext } from '../interfaces/request-context.interface';

@Injectable()
export class ResponseTransformMiddleware implements NestMiddleware {
  use(req: RequestContext, res: Response, next: NextFunction): void {
    // Store original send function
    const originalSend = res.send.bind(res);

    // Override send function
    res.send = (body: any): Response => {
      // Add correlation ID to response
      if (req.correlationId) {
        res.setHeader('X-Correlation-ID', req.correlationId);
      }

      // Add security headers
      this.addSecurityHeaders(res);

      // Remove internal headers
      this.removeInternalHeaders(res);

      // Call original send
      return originalSend(body);
    };

    next();
  }

  /**
   * Add security headers to response
   */
  private addSecurityHeaders(res: Response): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    if (process.env['NODE_ENV'] === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }

  /**
   * Remove internal headers that shouldn't be exposed
   */
  private removeInternalHeaders(res: Response): void {
    const internalHeaders = [
      'x-gateway-forwarded',
      'x-service-name',
      'x-service-version',
    ];

    for (const header of internalHeaders) {
      res.removeHeader(header);
    }
  }
}
