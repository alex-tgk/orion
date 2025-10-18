import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Validation exception filter
 * Handles class-validator validation errors with detailed messages
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse: unknown = exception.getResponse();

    // Extract validation errors if present
    const validationErrors =
      typeof exceptionResponse === 'object' && exceptionResponse.message
        ? Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : [exceptionResponse.message]
        : ['Validation failed'];

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: 'Validation Error',
      message: 'Input validation failed',
      validationErrors,
    };

    this.logger.warn(
      `Validation error on ${request.method} ${request.url}: ${JSON.stringify(validationErrors)}`,
    );

    response.status(status).json(errorResponse);
  }
}
