/**
 * Configuration options for the Logger service
 */
export interface LoggerConfig {
  /**
   * Name of the service using the logger
   */
  serviceName: string;

  /**
   * Minimum log level to output
   * @default 'info'
   */
  level?: 'error' | 'warn' | 'info' | 'http' | 'debug' | 'verbose';

  /**
   * Enable pretty printing for development
   * @default false
   */
  pretty?: boolean;

  /**
   * Transports to use for logging
   * @default ['console']
   */
  transports?: ('console' | 'file')[];

  /**
   * File transport configuration
   */
  fileOptions?: {
    /**
     * Log file path
     * @default 'logs/app.log'
     */
    filename: string;

    /**
     * Maximum file size before rotation
     * @default '20m'
     */
    maxSize?: string;

    /**
     * Number of days to keep logs
     * @default '14d'
     */
    maxFiles?: string;

    /**
     * Separate file for errors
     * @default 'logs/error.log'
     */
    errorFilename?: string;
  };

  /**
   * Sensitive field sanitization configuration
   */
  sanitize?: {
    /**
     * Fields to sanitize
     * @default ['password', 'token', 'secret', 'apiKey', 'authorization']
     */
    fields?: string[];

    /**
     * Replacement value for sanitized fields
     * @default '[REDACTED]'
     */
    replacement?: string;
  };

  /**
   * Environment name
   * @default process.env.NODE_ENV
   */
  environment?: string;
}

/**
 * Module options for LoggerModule
 */
export interface LoggerModuleOptions extends LoggerConfig {
  /**
   * Make logger global
   * @default true
   */
  isGlobal?: boolean;
}
