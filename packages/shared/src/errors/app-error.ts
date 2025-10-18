import { ErrorSeverity, ErrorCategory } from './error-severity.enum';
import * as crypto from 'crypto';

/**
 * Error context for additional information
 */
export interface ErrorContext {
  /**
   * User ID if available
   */
  userId?: string;

  /**
   * Correlation ID for request tracking
   */
  correlationId?: string;

  /**
   * Service name where error occurred
   */
  service: string;

  /**
   * HTTP method if applicable
   */
  method?: string;

  /**
   * Request path if applicable
   */
  path?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;

  /**
   * Stack trace
   */
  stack?: string;

  /**
   * Timestamp when error occurred
   */
  timestamp: Date;
}

/**
 * Base Application Error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  /**
   * HTTP status code
   */
  public readonly statusCode: number;

  /**
   * Error severity level
   */
  public readonly severity: ErrorSeverity;

  /**
   * Error category
   */
  public readonly category: ErrorCategory;

  /**
   * Is this error operational (expected) or programming error
   */
  public readonly isOperational: boolean;

  /**
   * Error context with additional information
   */
  public readonly context: ErrorContext;

  /**
   * Unique error signature for deduplication
   */
  public readonly signature: string;

  /**
   * Error code for programmatic handling
   */
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context: Partial<ErrorContext> & { service: string },
    isOperational = true,
    code?: string
  ) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.severity = severity;
    this.category = category;
    this.isOperational = isOperational;
    this.code = code || this.generateErrorCode();

    // Build complete context
    this.context = {
      ...context,
      timestamp: new Date(),
      stack: this.stack,
    };

    // Generate error signature for deduplication
    this.signature = this.generateSignature();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Generate unique error code
   */
  private generateErrorCode(): string {
    const categoryPrefix = this.category.toUpperCase().slice(0, 3);
    const severityPrefix = this.severity.toUpperCase().slice(0, 1);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${categoryPrefix}-${severityPrefix}-${timestamp}`;
  }

  /**
   * Generate error signature for deduplication
   * Similar errors should have the same signature
   */
  private generateSignature(): string {
    const signatureData = {
      name: this.name,
      message: this.normalizeMessage(this.message),
      category: this.category,
      service: this.context.service,
      path: this.context.path,
      // Only include the first few lines of stack to avoid noise
      stackPreview: this.getStackPreview(),
    };

    const signatureString = JSON.stringify(signatureData);
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  /**
   * Normalize error message to remove dynamic values
   * This helps in grouping similar errors
   */
  private normalizeMessage(message: string): string {
    return message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'EMAIL') // Replace emails
      .toLowerCase();
  }

  /**
   * Get preview of stack trace (first 3 lines)
   */
  private getStackPreview(): string {
    if (!this.stack) return '';
    return this.stack.split('\n').slice(0, 3).join('\n');
  }

  /**
   * Convert error to JSON format
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      severity: this.severity,
      category: this.category,
      isOperational: this.isOperational,
      signature: this.signature,
      context: {
        ...this.context,
        stack: undefined, // Don't include full stack in JSON
      },
    };
  }

  /**
   * Check if this error should trigger GitHub issue creation
   */
  shouldCreateIssue(): boolean {
    // Only create issues for operational errors
    if (!this.isOperational) return false;

    // Create issues for high and critical severity
    return (
      this.severity === ErrorSeverity.CRITICAL ||
      this.severity === ErrorSeverity.HIGH
    );
  }

  /**
   * Get error details for logging
   */
  getLogDetails() {
    return {
      ...this.toJSON(),
      stack: this.stack,
    };
  }
}
