/**
 * Retry Utility with Exponential Backoff
 *
 * Handles transient failures when calling AI APIs with intelligent retry logic.
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  exponentialBase?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export class RetryHelper {
  /**
   * Execute a function with retry logic
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T> {
    const {
      maxRetries,
      baseDelayMs,
      maxDelayMs = 30000,
      exponentialBase = 2,
      shouldRetry = RetryHelper.defaultShouldRetry,
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt or if we shouldn't retry this error
        if (attempt >= maxRetries || !shouldRetry(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelayMs * Math.pow(exponentialBase, attempt),
          maxDelayMs,
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const delayWithJitter = delay + jitter;

        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delayWithJitter)}ms`,
        );

        await this.sleep(delayWithJitter);
      }
    }

    throw lastError;
  }

  /**
   * Default retry logic - retry on rate limits and server errors
   */
  private static defaultShouldRetry(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as { status?: number; code?: string; message?: string };

    // Retry on rate limits (429)
    if (err.status === 429) {
      return true;
    }

    // Retry on server errors (5xx)
    if (err.status && err.status >= 500 && err.status < 600) {
      return true;
    }

    // Retry on network errors
    if (
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ENOTFOUND'
    ) {
      return true;
    }

    // Retry on specific API errors
    if (err.message) {
      const message = err.message.toLowerCase();
      if (
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('service unavailable')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create retry options from configuration
   */
  static createOptions(
    maxRetries: number,
    baseDelayMs: number,
  ): RetryOptions {
    return {
      maxRetries,
      baseDelayMs,
      maxDelayMs: 30000,
      exponentialBase: 2,
    };
  }
}
