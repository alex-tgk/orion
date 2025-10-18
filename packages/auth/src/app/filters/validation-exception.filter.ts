import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationError {
  field: string;
  message: string[];
  value?: any;
}

interface ValidationErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  validationErrors: ValidationError[];
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Check if this is a validation error
    if (
      exceptionResponse.message &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.error === 'Bad Request'
    ) {
      const validationErrors = this.formatValidationErrors(
        exceptionResponse.message
      );

      const errorResponse: ValidationErrorResponse = {
        statusCode: status,
        error: 'Validation Failed',
        message: 'The request contains invalid data',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        validationErrors,
      };

      this.logger.warn('Validation error', {
        path: request.url,
        method: request.method,
        validationErrors,
        body: this.sanitizeBody(request.body),
      });

      response.status(status).json(errorResponse);
    } else {
      // If it's not a validation error, pass it to the default handler
      response.status(status).json({
        statusCode: status,
        message: exceptionResponse.message || 'Bad Request',
        error: exceptionResponse.error || 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    }
  }

  private formatValidationErrors(messages: string[]): ValidationError[] {
    const errors: Map<string, ValidationError> = new Map();

    messages.forEach((message) => {
      // Parse validation message format: "field.constraint message"
      const match = message.match(/^(\w+)\./);
      const field = match ? match[1] : 'unknown';

      if (!errors.has(field)) {
        errors.set(field, {
          field,
          message: [],
        });
      }

      errors.get(field)!.message.push(message);
    });

    return Array.from(errors.values());
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };

    // Remove sensitive fields from logs
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}