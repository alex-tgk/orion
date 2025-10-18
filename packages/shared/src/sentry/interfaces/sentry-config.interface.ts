import type * as Sentry from '@sentry/node';

/**
 * Sentry module configuration options
 */
export interface SentryConfig {
  /**
   * Sentry DSN (Data Source Name)
   */
  dsn: string;

  /**
   * Environment name (development, staging, production)
   */
  environment?: string;

  /**
   * Release version or Git commit SHA
   */
  release?: string;

  /**
   * Server name (defaults to hostname)
   */
  serverName?: string;

  /**
   * Sample rate for performance transactions (0.0 to 1.0)
   * @default 0.1
   */
  tracesSampleRate?: number;

  /**
   * Sample rate for profiling (0.0 to 1.0)
   * @default 0.1
   */
  profilesSampleRate?: number;

  /**
   * Enable debug mode
   * @default false
   */
  debug?: boolean;

  /**
   * Enable Sentry
   * @default true
   */
  enabled?: boolean;

  /**
   * Sentry integrations
   */
  integrations?: any[];

  /**
   * Before send hook for event modification/filtering
   */
  beforeSend?: (event: Sentry.ErrorEvent, hint: Sentry.EventHint) => Sentry.ErrorEvent | PromiseLike<Sentry.ErrorEvent | null> | null;

  /**
   * Errors to ignore (error messages or RegExp patterns)
   */
  ignoreErrors?: (string | RegExp)[];

  /**
   * URLs to deny from error tracking
   */
  denyUrls?: (string | RegExp)[];

  /**
   * Maximum breadcrumbs to keep
   * @default 100
   */
  maxBreadcrumbs?: number;

  /**
   * Attach stack traces to non-Error messages
   * @default true
   */
  attachStacktrace?: boolean;
}

/**
 * Sentry context for error enrichment
 */
export interface SentryContext {
  /**
   * User context
   */
  user?: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  };

  /**
   * Tags for categorization and filtering
   */
  tags?: Record<string, string>;

  /**
   * Extra context data
   */
  extra?: Record<string, any>;

  /**
   * Fingerprint for error grouping
   */
  fingerprint?: string[];

  /**
   * Error level
   */
  level?: Sentry.SeverityLevel;
}
