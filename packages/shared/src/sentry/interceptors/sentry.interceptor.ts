import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SentryService } from '../sentry.service';

/**
 * Sentry Interceptor for automatic error capture
 * Captures exceptions and enriches them with request context
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  constructor(private readonly sentry: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Set user context if available
    if (user) {
      this.sentry.setUser({
        id: user.id || user.sub,
        email: user.email,
        username: user.username,
      });
    }

    // Set request tags
    this.sentry.setTags({
      service: process.env['SERVICE_NAME'] || 'unknown',
      environment: process.env['NODE_ENV'] || 'development',
      correlationId: request.correlationId || 'unknown',
    });

    return next.handle().pipe(
      catchError((error) => {
        // Only capture server errors, not client errors (4xx)
        const shouldCapture =
          !(error instanceof HttpException) || error.getStatus() >= 500;

        if (shouldCapture) {
          this.sentry.captureException(error, {
            tags: {
              endpoint: `${request.method} ${request.url}`,
              method: request.method,
            },
            extra: {
              query: request.query,
              params: request.params,
              body: request.body,
              headers: this.sanitizeHeaders(request.headers),
            },
          });
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Sanitize sensitive headers
   */
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized = { ...headers };
    delete sanitized['authorization'];
    delete sanitized['cookie'];
    delete sanitized['x-api-key'];
    return sanitized;
  }
}
