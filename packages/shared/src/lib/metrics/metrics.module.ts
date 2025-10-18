import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

/**
 * Metrics Module - Provides Prometheus metrics instrumentation
 *
 * This module provides comprehensive metrics collection including:
 * - HTTP request metrics (rate, duration, errors)
 * - Database query metrics
 * - Business metrics
 * - Custom application metrics
 *
 * Usage:
 * ```typescript
 * import { MetricsModule } from '@orion/shared/metrics';
 *
 * @Module({
 *   imports: [MetricsModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [MetricsService, MetricsInterceptor],
  controllers: [MetricsController],
  exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule {}
