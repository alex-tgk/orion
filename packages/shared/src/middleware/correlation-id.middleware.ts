import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
// TODO: Import LoggerService when logger package is available
// import { LoggerService } from '@orion/logger';

/**
 * HTTP header name for correlation ID
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware to handle correlation ID for request tracing
 *
 * Features:
 * - Extracts correlation ID from request header
 * - Generates new correlation ID if not present
 * - Propagates correlation ID to response headers
 * - Sets correlation ID in AsyncLocalStorage for logging
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  /**
   * Apply correlation ID middleware
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Next function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract correlation ID from request header or generate new one
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string) ||
      (req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) ||
      uuidv4();

    // Set correlation ID in response header
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // Attach correlation ID to request for later use
    (req as any).correlationId = correlationId;

    // Run the rest of the request with correlation ID in AsyncLocalStorage
    // TODO: Enable when LoggerService is available
    // LoggerService.runWithCorrelationId(correlationId, () => {
    next();
    // });
  }
}

/**
 * Functional middleware version for non-DI usage
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next function
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const correlationId =
    (req.headers[CORRELATION_ID_HEADER] as string) ||
    (req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) ||
    uuidv4();

  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  (req as any).correlationId = correlationId;

  // TODO: Enable when LoggerService is available
  // LoggerService.runWithCorrelationId(correlationId, () => {
  next();
  // });
}

/**
 * Express type augmentation to include correlationId
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
