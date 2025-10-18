import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryService } from '../sentry.service';

/**
 * Global exception filter that captures errors in Sentry
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly sentry: SentryService) {}

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Capture in Sentry for server errors (5xx)
    if (status >= 500) {
      this.sentry.captureException(exception, {
        tags: {
          endpoint: `${request.method} ${request.url}`,
          statusCode: status.toString(),
        },
        extra: {
          query: request.query,
          params: request.params,
          body: request.body,
          ip: request.ip,
          userAgent: request.get('user-agent'),
        },
      });
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: (request as any).correlationId,
    });
  }
}
