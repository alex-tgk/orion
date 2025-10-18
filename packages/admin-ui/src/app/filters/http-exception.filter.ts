import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate correlation ID for tracing
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      `admin-ui-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // Log the actual error for debugging
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack, {
        correlationId,
        path: request.url,
        method: request.method,
      });
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Unknown Error';

      this.logger.error('Unknown error type caught', JSON.stringify(exception), {
        correlationId,
        path: request.url,
        method: request.method,
      });
    }

    // Log all 4xx and 5xx errors
    if (status >= 400) {
      this.logger.warn(`HTTP Exception: ${status} - ${error}`, {
        correlationId,
        path: request.url,
        method: request.method,
        message,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId,
    };

    // Set correlation ID in response headers for client tracking
    response.setHeader('X-Correlation-Id', correlationId);

    response.status(status).json(errorResponse);
  }
}
