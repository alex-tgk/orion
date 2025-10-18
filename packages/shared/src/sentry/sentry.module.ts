import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { SentryService } from './sentry.service';
import type { SentryConfig } from './interfaces/sentry-config.interface';

export const SENTRY_MODULE_OPTIONS = 'SENTRY_MODULE_OPTIONS';

/**
 * Sentry Module for NestJS
 * Provides error tracking and performance monitoring
 */
@Global()
@Module({})
export class SentryModule {
  /**
   * Configure SentryModule with options
   * @param options - Sentry configuration options
   */
  static forRoot(options: SentryConfig): DynamicModule {
    // Initialize Sentry if enabled
    if (options.enabled !== false && options.dsn) {
      Sentry.init({
        dsn: options.dsn,
        environment: options.environment || process.env['NODE_ENV'] || 'development',
        release: options.release || process.env['GIT_COMMIT_SHA'],
        serverName: options.serverName,
        tracesSampleRate: options.tracesSampleRate ?? 0.1,
        profilesSampleRate: options.profilesSampleRate ?? 0.1,
        debug: options.debug || false,
        integrations: options.integrations || [],
        beforeSend: options.beforeSend || this.defaultBeforeSend,
        ignoreErrors: options.ignoreErrors || this.defaultIgnoreErrors,
        denyUrls: options.denyUrls,
        maxBreadcrumbs: options.maxBreadcrumbs || 100,
        attachStacktrace: options.attachStacktrace !== false,
      });
    }

    const optionsProvider: Provider = {
      provide: SENTRY_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: SentryModule,
      global: true,
      providers: [optionsProvider, SentryService],
      exports: [SentryService],
    };
  }

  /**
   * Configure SentryModule asynchronously
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<SentryConfig> | SentryConfig;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    const asyncProvider: Provider = {
      provide: SENTRY_MODULE_OPTIONS,
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);

        // Initialize Sentry if enabled
        if (config.enabled !== false && config.dsn) {
          Sentry.init({
            dsn: config.dsn,
            environment: config.environment || process.env['NODE_ENV'] || 'development',
            release: config.release || process.env['GIT_COMMIT_SHA'],
            serverName: config.serverName,
            tracesSampleRate: config.tracesSampleRate ?? 0.1,
            profilesSampleRate: config.profilesSampleRate ?? 0.1,
            debug: config.debug || false,
            integrations: config.integrations || [],
            beforeSend: config.beforeSend || SentryModule.defaultBeforeSend,
            ignoreErrors: config.ignoreErrors || SentryModule.defaultIgnoreErrors,
            denyUrls: config.denyUrls,
            maxBreadcrumbs: config.maxBreadcrumbs || 100,
            attachStacktrace: config.attachStacktrace !== false,
          });
        }

        return config;
      },
      inject: options.inject || [],
    };

    return {
      module: SentryModule,
      global: true,
      imports: options.imports || [],
      providers: [asyncProvider, SentryService],
      exports: [SentryService],
    };
  }

  /**
   * Default before send hook to sanitize sensitive data
   */
  private static defaultBeforeSend(
    event: Sentry.ErrorEvent,
    hint: Sentry.EventHint
  ): Sentry.ErrorEvent | PromiseLike<Sentry.ErrorEvent | null> | null {
    // Remove sensitive headers
    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      delete headers['authorization'];
      delete headers['cookie'];
      delete headers['x-api-key'];
      event.request.headers = headers;
    }

    // Sanitize request data
    if (event.request?.data) {
      const sanitized = { ...event.request.data };
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken'];

      sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });

      event.request.data = sanitized;
    }

    return event;
  }

  /**
   * Default errors to ignore
   */
  private static defaultIgnoreErrors = [
    'NotFoundException',
    'BadRequestException',
    'UnauthorizedException',
    'ForbiddenException',
    /ECONNREFUSED/,
    /ENOTFOUND/,
  ];
}
