import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import type { SentryContext } from './interfaces/sentry-config.interface';

/**
 * Sentry Service for error tracking and performance monitoring
 */
@Injectable()
export class SentryService {
  /**
   * Capture an exception and send to Sentry
   * @param exception - Error object
   * @param context - Additional context
   * @returns Event ID
   */
  captureException(exception: Error, context?: SentryContext): string {
    return Sentry.captureException(exception, {
      user: context?.user,
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level,
      fingerprint: context?.fingerprint,
    });
  }

  /**
   * Capture a message and send to Sentry
   * @param message - Message string
   * @param level - Severity level
   * @param context - Additional context
   * @returns Event ID
   */
  captureMessage(
    message: string,
    level?: Sentry.SeverityLevel,
    context?: SentryContext
  ): string {
    return Sentry.captureMessage(message, {
      level: level || 'info',
      user: context?.user,
      tags: context?.tags,
      extra: context?.extra,
      fingerprint: context?.fingerprint,
    });
  }

  /**
   * Set user context
   * @param user - User information
   */
  setUser(user: { id: string; email?: string; username?: string } | null): void {
    Sentry.setUser(user);
  }

  /**
   * Set a single tag
   * @param key - Tag key
   * @param value - Tag value
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Set multiple tags
   * @param tags - Tags object
   */
  setTags(tags: Record<string, string>): void {
    Sentry.setTags(tags);
  }

  /**
   * Set extra context data
   * @param key - Context key
   * @param value - Context value
   */
  setExtra(key: string, value: any): void {
    Sentry.setExtra(key, value);
  }

  /**
   * Set named context
   * @param name - Context name
   * @param context - Context data
   */
  setContext(name: string, context: Record<string, any> | null): void {
    Sentry.setContext(name, context);
  }

  /**
   * Add a breadcrumb
   * @param breadcrumb - Breadcrumb data
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Start a new transaction for performance monitoring
   * @param name - Transaction name
   * @param op - Operation type
   * @returns Transaction instance (deprecated in newer Sentry versions)
   */
  startTransaction(name: string, op: string): any {
    // Note: startTransaction is deprecated in Sentry v8+
    // Use Sentry.startSpan() instead for newer versions
    return Sentry.startSpan({ name, op }, () => {});
  }

  /**
   * Execute code within an isolated scope
   * @param callback - Callback function with scope
   */
  withScope(callback: (scope: Sentry.Scope) => void): void {
    Sentry.withScope(callback);
  }

  /**
   * Flush pending events
   * @param timeout - Timeout in milliseconds
   * @returns Promise that resolves when flush completes
   */
  async flush(timeout?: number): Promise<boolean> {
    return Sentry.flush(timeout);
  }

  /**
   * Close Sentry connection
   * @param timeout - Timeout in milliseconds
   */
  async close(timeout?: number): Promise<boolean> {
    return Sentry.close(timeout);
  }
}
