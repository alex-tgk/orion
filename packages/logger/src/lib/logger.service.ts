import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as winston from 'winston';

/**
 * AsyncLocalStorage for correlation ID context
 */
const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

/**
 * Enhanced Logger Service with Winston integration
 * Provides structured logging with correlation ID support
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private readonly logger: winston.Logger;

  constructor(logger: winston.Logger, context?: string) {
    this.logger = logger;
    this.context = context;
  }

  /**
   * Set the context for this logger instance
   * @param context - Context identifier (usually class name)
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Get the current correlation ID from AsyncLocalStorage
   */
  private getCorrelationId(): string | undefined {
    const store = asyncLocalStorage.getStore();
    return store?.get('correlationId');
  }

  /**
   * Set correlation ID in AsyncLocalStorage
   * @param correlationId - Correlation ID to set
   */
  static setCorrelationId(correlationId: string): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.set('correlationId', correlationId);
    }
  }

  /**
   * Run a function with correlation ID context
   * @param correlationId - Correlation ID
   * @param fn - Function to run
   */
  static runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
    const store = new Map<string, any>();
    store.set('correlationId', correlationId);
    return asyncLocalStorage.run(store, fn);
  }

  /**
   * Get the AsyncLocalStorage instance for external use
   */
  static getAsyncLocalStorage(): AsyncLocalStorage<Map<string, any>> {
    return asyncLocalStorage;
  }

  /**
   * Build log metadata with correlation ID and context
   */
  private buildMetadata(metadata?: Record<string, any>): any {
    return {
      context: this.context,
      correlationId: this.getCorrelationId(),
      metadata: metadata || {},
    };
  }

  /**
   * Log an informational message
   * @param message - Log message
   * @param context - Optional context override
   * @param metadata - Additional metadata
   */
  log(message: string, context?: string, metadata?: Record<string, any>): void {
    const logContext = context || this.context;
    this.logger.info(message, this.buildMetadata(metadata));
  }

  /**
   * Log an error message
   * @param message - Error message
   * @param trace - Stack trace
   * @param context - Optional context override
   * @param metadata - Additional metadata
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    const logContext = context || this.context;
    this.logger.error(message, {
      ...this.buildMetadata(metadata),
      stack: trace,
    });
  }

  /**
   * Log a warning message
   * @param message - Warning message
   * @param context - Optional context override
   * @param metadata - Additional metadata
   */
  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    const logContext = context || this.context;
    this.logger.warn(message, this.buildMetadata(metadata));
  }

  /**
   * Log a debug message
   * @param message - Debug message
   * @param context - Optional context override
   * @param metadata - Additional metadata
   */
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    const logContext = context || this.context;
    this.logger.debug(message, this.buildMetadata(metadata));
  }

  /**
   * Log a verbose message
   * @param message - Verbose message
   * @param context - Optional context override
   * @param metadata - Additional metadata
   */
  verbose(message: string, context?: string, metadata?: Record<string, any>): void {
    const logContext = context || this.context;
    this.logger.verbose(message, this.buildMetadata(metadata));
  }

  /**
   * Log an HTTP message
   * @param message - HTTP message
   * @param metadata - Additional metadata
   */
  http(message: string, metadata?: Record<string, any>): void {
    this.logger.http(message, this.buildMetadata(metadata));
  }

  /**
   * Create a child logger with specific context and metadata
   * @param context - Child logger context
   * @param metadata - Default metadata for child logger
   */
  child(context: string, metadata?: Record<string, any>): LoggerService {
    const childLogger = this.logger.child({
      context,
      ...metadata,
    });
    return new LoggerService(childLogger, context);
  }

  /**
   * Get the underlying Winston logger instance
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}
