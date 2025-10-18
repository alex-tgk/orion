/**
 * Context information for log entries
 */
export interface LogContext {
  /**
   * Correlation ID for request tracing
   */
  correlationId?: string;

  /**
   * Service or class context
   */
  context?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;

  /**
   * Timestamp of the log entry
   */
  timestamp?: string;

  /**
   * Process ID
   */
  pid?: number;

  /**
   * Service name
   */
  service?: string;

  /**
   * Environment name
   */
  environment?: string;
}

/**
 * Structured log entry format
 */
export interface LogEntry extends LogContext {
  /**
   * Log level
   */
  level: string;

  /**
   * Log message
   */
  message: string;

  /**
   * Error stack trace (for error logs)
   */
  stack?: string;
}
