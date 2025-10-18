/**
 * @orion/shared/sentry - Sentry error tracking and monitoring
 *
 * Features:
 * - Automatic error capture
 * - Performance monitoring
 * - User context tracking
 * - Breadcrumb tracking
 * - Request context enrichment
 */

export { SentryModule } from './sentry.module';
export { SentryService } from './sentry.service';
export { SentryInterceptor } from './interceptors/sentry.interceptor';
export { SentryExceptionFilter } from './filters/sentry-exception.filter';
export type { SentryConfig, SentryContext } from './interfaces/sentry-config.interface';
