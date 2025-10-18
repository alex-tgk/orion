import { Controller, Get, Post, Param, HttpCode } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { ServiceDiscoveryService } from '../services/service-discovery.service';
import { LoadBalancerService } from '../services/load-balancer.service';
import { WebSocketProxyService } from '../services/websocket-proxy.service';

/**
 * Metrics Controller
 *
 * Provides endpoints for accessing gateway metrics and statistics.
 * Useful for monitoring, alerting, and debugging.
 */
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly serviceDiscovery: ServiceDiscoveryService,
    private readonly loadBalancer: LoadBalancerService,
    private readonly wsProxy: WebSocketProxyService
  ) {}

  /**
   * Get overall metrics
   */
  @Get()
  getOverallMetrics() {
    return {
      stats: this.metricsService.getOverallStats(),
      routes: Object.fromEntries(this.metricsService.getAllRouteMetrics()),
      services: Object.fromEntries(
        this.metricsService.getAllServiceMetrics()
      ),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get route-specific metrics
   */
  @Get('routes/:route')
  getRouteMetrics(@Param('route') route: string) {
    const metrics = this.metricsService.getRouteMetrics(route);
    return {
      route,
      metrics: metrics || { message: 'No metrics found for this route' },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get service-specific metrics
   */
  @Get('services/:service')
  getServiceMetrics(@Param('service') service: string) {
    const metrics = this.metricsService.getServiceMetrics(service);
    return {
      service,
      metrics: metrics || { message: 'No metrics found for this service' },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get circuit breaker statistics
   */
  @Get('circuit-breaker')
  getCircuitBreakerStats() {
    return {
      circuits: this.circuitBreaker.getAllStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get service discovery statistics
   */
  @Get('service-discovery')
  getServiceDiscoveryStats() {
    return {
      stats: this.serviceDiscovery.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get load balancer statistics
   */
  @Get('load-balancer')
  getLoadBalancerStats() {
    return {
      strategy: this.loadBalancer.getStrategy(),
      metrics: Object.fromEntries(this.loadBalancer.getAllMetrics()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get WebSocket proxy statistics
   */
  @Get('websocket')
  getWebSocketStats() {
    return {
      stats: this.wsProxy.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics
   */
  @Post('reset')
  @HttpCode(204)
  resetMetrics() {
    this.metricsService.reset();
  }

  /**
   * Reset metrics for a specific route
   */
  @Post('reset/routes/:route')
  @HttpCode(204)
  resetRouteMetrics(@Param('route') route: string) {
    this.metricsService.resetRoute(route);
  }

  /**
   * Reset metrics for a specific service
   */
  @Post('reset/services/:service')
  @HttpCode(204)
  resetServiceMetrics(@Param('service') service: string) {
    this.metricsService.resetService(service);
  }
}
