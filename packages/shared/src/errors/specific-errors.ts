import { AppError } from './app-error';
import { ErrorSeverity, ErrorCategory } from './error-severity.enum';

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      503,
      ErrorSeverity.CRITICAL,
      ErrorCategory.DATABASE,
      context
    );
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      401,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHENTICATION,
      context
    );
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      403,
      ErrorSeverity.HIGH,
      ErrorCategory.AUTHORIZATION,
      context
    );
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    },
    validationErrors?: Record<string, string[]>
  ) {
    super(
      message,
      400,
      ErrorSeverity.LOW,
      ErrorCategory.VALIDATION,
      {
        ...context,
        metadata: { validationErrors },
      }
    );
  }
}

/**
 * Network Error
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      503,
      ErrorSeverity.HIGH,
      ErrorCategory.NETWORK,
      context
    );
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string,
    serviceName: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      503,
      ErrorSeverity.HIGH,
      ErrorCategory.EXTERNAL_SERVICE,
      {
        ...context,
        metadata: { externalService: serviceName },
      }
    );
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  constructor(
    message: string,
    retryAfter: number,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      429,
      ErrorSeverity.MEDIUM,
      ErrorCategory.RATE_LIMIT,
      {
        ...context,
        metadata: { retryAfter },
      }
    );
  }
}

/**
 * Configuration Error
 */
export class ConfigurationError extends AppError {
  constructor(
    message: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      500,
      ErrorSeverity.HIGH,
      ErrorCategory.CONFIGURATION,
      context,
      false // Not operational - indicates programming error
    );
  }
}

/**
 * Business Logic Error
 */
export class BusinessLogicError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      statusCode,
      ErrorSeverity.MEDIUM,
      ErrorCategory.BUSINESS_LOGIC,
      context
    );
  }
}

/**
 * Internal Error
 */
export class InternalError extends AppError {
  constructor(
    message: string,
    context: Partial<{ service: string; [key: string]: any }> & {
      service: string;
    }
  ) {
    super(
      message,
      500,
      ErrorSeverity.HIGH,
      ErrorCategory.INTERNAL,
      context,
      false // Not operational
    );
  }
}
