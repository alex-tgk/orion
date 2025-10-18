import { AppError } from './app-error';
import { ErrorSeverity, ErrorCategory } from './error-severity.enum';

/**
 * Error classification rules
 */
interface ClassificationRule {
  pattern: RegExp | string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  statusCode?: number;
}

/**
 * Error Classifier
 * Analyzes errors and assigns severity/category
 */
export class ErrorClassifier {
  private static readonly rules: ClassificationRule[] = [
    // Critical errors
    {
      pattern: /database.*connection.*failed/i,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.DATABASE,
      statusCode: 503,
    },
    {
      pattern: /redis.*connection.*refused/i,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.DATABASE,
      statusCode: 503,
    },
    {
      pattern: /out of memory|memory leak/i,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.INTERNAL,
      statusCode: 500,
    },

    // Authentication errors
    {
      pattern: /unauthorized|authentication.*failed/i,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHENTICATION,
      statusCode: 401,
    },
    {
      pattern: /invalid.*token|token.*expired/i,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.AUTHENTICATION,
      statusCode: 401,
    },
    {
      pattern: /forbidden|insufficient.*permissions/i,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHORIZATION,
      statusCode: 403,
    },

    // Validation errors
    {
      pattern: /validation.*failed|invalid.*input/i,
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      statusCode: 400,
    },

    // Network errors
    {
      pattern: /network.*error|connection.*timeout|ECONNREFUSED/i,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.NETWORK,
      statusCode: 503,
    },
    {
      pattern: /ETIMEDOUT|socket.*hang.*up/i,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.NETWORK,
      statusCode: 504,
    },

    // External service errors
    {
      pattern: /external.*service.*unavailable/i,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.EXTERNAL_SERVICE,
      statusCode: 503,
    },

    // Rate limiting
    {
      pattern: /rate.*limit.*exceeded|too.*many.*requests/i,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.RATE_LIMIT,
      statusCode: 429,
    },

    // Configuration errors
    {
      pattern: /configuration.*error|missing.*environment/i,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.CONFIGURATION,
      statusCode: 500,
    },
  ];

  /**
   * Classify an error based on message and type
   */
  static classify(
    error: Error,
    context: { service: string; [key: string]: any }
  ): AppError {
    // If already an AppError, return as is
    if (error instanceof AppError) {
      return error;
    }

    // Find matching rule
    const rule = this.findMatchingRule(error);

    // Create AppError with classification
    return new AppError(
      error.message,
      rule.statusCode || 500,
      rule.severity,
      rule.category,
      {
        ...context,
        metadata: {
          originalErrorName: error.name,
          originalStack: error.stack,
        },
      }
    );
  }

  /**
   * Find matching classification rule
   */
  private static findMatchingRule(error: Error): ClassificationRule {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    const searchText = `${errorName} ${errorMessage}`;

    for (const rule of this.rules) {
      const pattern =
        typeof rule.pattern === 'string'
          ? new RegExp(rule.pattern, 'i')
          : rule.pattern;

      if (pattern.test(searchText)) {
        return rule;
      }
    }

    // Default classification
    return {
      pattern: '',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.UNKNOWN,
      statusCode: 500,
    };
  }

  /**
   * Classify error by HTTP status code
   */
  static classifyByStatusCode(
    statusCode: number,
    message: string,
    context: { service: string; [key: string]: any }
  ): AppError {
    let severity: ErrorSeverity;
    let category: ErrorCategory;

    // Map status codes to severity and category
    if (statusCode >= 500) {
      severity = ErrorSeverity.HIGH;
      category = ErrorCategory.INTERNAL;
    } else if (statusCode === 429) {
      severity = ErrorSeverity.MEDIUM;
      category = ErrorCategory.RATE_LIMIT;
    } else if (statusCode === 401) {
      severity = ErrorSeverity.MEDIUM;
      category = ErrorCategory.AUTHENTICATION;
    } else if (statusCode === 403) {
      severity = ErrorSeverity.MEDIUM;
      category = ErrorCategory.AUTHORIZATION;
    } else if (statusCode === 404) {
      severity = ErrorSeverity.LOW;
      category = ErrorCategory.BUSINESS_LOGIC;
    } else if (statusCode >= 400) {
      severity = ErrorSeverity.LOW;
      category = ErrorCategory.VALIDATION;
    } else {
      severity = ErrorSeverity.INFO;
      category = ErrorCategory.UNKNOWN;
    }

    return new AppError(message, statusCode, severity, category, context);
  }

  /**
   * Determine if errors are duplicates based on signature
   */
  static areDuplicates(error1: AppError, error2: AppError): boolean {
    return error1.signature === error2.signature;
  }

  /**
   * Check if error occurred recently (within time window)
   */
  static isRecent(error: AppError, windowMs: number = 3600000): boolean {
    const errorTime = error.context.timestamp.getTime();
    const now = Date.now();
    return now - errorTime <= windowMs;
  }
}
