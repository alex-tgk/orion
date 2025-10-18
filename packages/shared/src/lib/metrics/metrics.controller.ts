import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Metrics Controller - Exposes Prometheus metrics endpoint
 *
 * This controller provides the /metrics endpoint that Prometheus scrapes
 * to collect application metrics.
 */
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   * Returns metrics in Prometheus exposition format
   */
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
