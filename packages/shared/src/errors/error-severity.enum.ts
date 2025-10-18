/**
 * Error Severity Levels
 * Used for classification and prioritization of errors
 */
export enum ErrorSeverity {
  /**
   * Critical errors that require immediate attention
   * Examples: Database connection failures, security breaches
   */
  CRITICAL = 'critical',

  /**
   * High severity errors that impact core functionality
   * Examples: Authentication failures, payment processing errors
   */
  HIGH = 'high',

  /**
   * Medium severity errors that affect user experience
   * Examples: Failed API calls, validation errors
   */
  MEDIUM = 'medium',

  /**
   * Low severity errors that are recoverable
   * Examples: Cache misses, retry-able operations
   */
  LOW = 'low',

  /**
   * Informational errors used for debugging
   * Examples: Deprecated API usage warnings
   */
  INFO = 'info',
}

/**
 * Error Categories for better classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic',
  RATE_LIMIT = 'rate_limit',
  CONFIGURATION = 'configuration',
  INTERNAL = 'internal',
  UNKNOWN = 'unknown',
}

/**
 * Priority mapping for GitHub issues
 */
export const SeverityToPriority: Record<ErrorSeverity, string> = {
  [ErrorSeverity.CRITICAL]: 'P0',
  [ErrorSeverity.HIGH]: 'P1',
  [ErrorSeverity.MEDIUM]: 'P2',
  [ErrorSeverity.LOW]: 'P3',
  [ErrorSeverity.INFO]: 'P4',
};

/**
 * Label mapping for GitHub issues
 */
export const SeverityToLabel: Record<ErrorSeverity, string[]> = {
  [ErrorSeverity.CRITICAL]: ['bug', 'critical', 'priority:P0'],
  [ErrorSeverity.HIGH]: ['bug', 'high-priority', 'priority:P1'],
  [ErrorSeverity.MEDIUM]: ['bug', 'medium-priority', 'priority:P2'],
  [ErrorSeverity.LOW]: ['bug', 'low-priority', 'priority:P3'],
  [ErrorSeverity.INFO]: ['enhancement', 'informational', 'priority:P4'],
};

/**
 * Category to label mapping
 */
export const CategoryToLabel: Record<ErrorCategory, string> = {
  [ErrorCategory.AUTHENTICATION]: 'area:auth',
  [ErrorCategory.AUTHORIZATION]: 'area:auth',
  [ErrorCategory.VALIDATION]: 'area:validation',
  [ErrorCategory.DATABASE]: 'area:database',
  [ErrorCategory.NETWORK]: 'area:network',
  [ErrorCategory.EXTERNAL_SERVICE]: 'area:integration',
  [ErrorCategory.BUSINESS_LOGIC]: 'area:business-logic',
  [ErrorCategory.RATE_LIMIT]: 'area:rate-limiting',
  [ErrorCategory.CONFIGURATION]: 'area:config',
  [ErrorCategory.INTERNAL]: 'area:internal',
  [ErrorCategory.UNKNOWN]: 'area:unknown',
};
