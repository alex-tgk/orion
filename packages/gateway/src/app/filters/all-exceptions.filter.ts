import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * All Exceptions Filter
 *
 * Catches all unhandled exceptions and formats them consistently.
 * This is the last line of defense for error handling.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = response.status(status).json(errorResponse);
    const request = ctx.getRequest<Request>();

    // Determine status code and message
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    // Get correlation ID from request
    const correlationId = (request as any).correlationId || 'unknown';

    // Log the error
    this.logger.error(
      `[${correlationId}] ${request.method} ${request.url} - ${status} ${message}`,
      stack
    );

    // Build error response
    const errorResponse = {
      statusCode: status,
      message,
      error,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && stack) {
      (errorResponse as any).stack = stack;
    }

    response.status(status).json(errorResponse);
  }
}
