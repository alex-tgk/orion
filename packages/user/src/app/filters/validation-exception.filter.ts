import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationErrorResponse {
  statusCode: number;
  message: string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
}

/**
 * Filter specifically for validation errors
 * Provides detailed validation error messages
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = request.headers['x-correlation-id'] as string ||
      `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const exceptionResponse = exception.getResponse() as Record<string, unknown>;
    const message = exceptionResponse.message as string[];

    this.logger.warn(
      `Validation error: ${JSON.stringify(message)}`,
      {
        correlationId,
        path: request.url,
        method: request.method,
      }
    );

    const errorResponse: ValidationErrorResponse = {
      statusCode: exception.getStatus(),
      message: Array.isArray(message) ? message : [message],
      error: 'Validation Failed',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      correlationId,
    };

    response.setHeader('X-Correlation-Id', correlationId);
    response.status(exception.getStatus()).json(errorResponse);
  }
}
