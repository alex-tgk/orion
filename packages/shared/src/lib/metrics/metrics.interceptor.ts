import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Metrics Interceptor - Automatically tracks HTTP request metrics
 *
 * This interceptor automatically records metrics for all HTTP requests including:
 * - Request count
 * - Request duration
 * - Request/response sizes
 * - Status codes
 *
 * Usage:
 * ```typescript
 * // Apply globally in main.ts
 * app.useGlobalInterceptors(app.get(MetricsInterceptor));
 *
 * // Or apply to specific controllers
 * @UseInterceptors(MetricsInterceptor)
 * @Controller('users')
 * export class UsersController {}
 * ```
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const method = request.method;
    const route = this.getRoute(context);
    const service = process.env.SERVICE_NAME || 'unknown';

    // Get request size
    const requestSize = request.headers['content-length']
      ? parseInt(request.headers['content-length'], 10)
      : 0;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const status = response.statusCode;

          // Estimate response size
          const responseSize = data ? JSON.stringify(data).length : 0;

          // Record metrics
          this.metricsService.recordHttpRequest(
            service,
            method,
            route,
            status,
            duration,
            requestSize,
            responseSize,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const status = error.status || 500;

          // Record error metrics
          this.metricsService.recordHttpRequest(
            service,
            method,
            route,
            status,
            duration,
            requestSize,
          );
        },
      }),
    );
  }

  /**
   * Extract route pattern from request
   * Removes parameter values to group similar routes
   */
  private getRoute(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Try to get route from metadata
    const routePath = Reflect.getMetadata('path', handler);
    const controllerPath = Reflect.getMetadata('path', controller);

    if (controllerPath && routePath) {
      return `/${controllerPath}/${routePath}`.replace(/\/+/g, '/');
    }

    // Fallback to request URL
    const request = context.switchToHttp().getRequest();
    return request.route?.path || request.url;
  }
}
