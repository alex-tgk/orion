import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '../interfaces/request-context.interface';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: RequestContext, res: Response, next: NextFunction): void {
    // Generate correlation ID
    const correlationId = uuidv4();
    req.correlationId = correlationId;
    req.startTime = Date.now();

    // Log request
    this.logger.log(
      `[${correlationId}] ${req.method} ${req.path} - ${req.ip}`
    );

    // Log request body for non-GET requests (sanitized)
    if (req.method !== 'GET' && req.body) {
      const sanitizedBody = this.sanitizeBody(req.body);
      this.logger.debug(
        `[${correlationId}] Request body: ${JSON.stringify(sanitizedBody)}`
      );
    }

    // Hook into response finish
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      const logLevel = res.statusCode >= 400 ? 'error' : 'log';

      this.logger[logLevel](
        `[${correlationId}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
      );
    });

    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
