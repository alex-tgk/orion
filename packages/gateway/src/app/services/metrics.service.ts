import { Injectable, Logger } from '@nestjs/common';

/**
 * Request Metrics
 */
interface RequestMetrics {
  count: number;
  errors: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
}

/**
 * Service Metrics
 */
interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  lastError?: {
    timestamp: Date;
    message: string;
    statusCode: number;
  };
}

/**
 * Metrics Service
 *
 * Collects and aggregates metrics for monitoring and observability.
 * Tracks request counts, response times, error rates, and service health.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly routeMetrics = new Map<string, RequestMetrics>();
  private readonly serviceMetrics = new Map<string, ServiceMetrics>();
  private readonly responseTimes: number[] = [];
  private readonly maxResponseTimeSamples = 1000;

  /**
   * Record a request
   */
  recordRequest(route: string, duration: number, error: boolean = false): void {
    let metrics = this.routeMetrics.get(route);
    if (!metrics) {
      metrics = {
        count: 0,
        errors: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
      };
      this.routeMetrics.set(route, metrics);
    }

    metrics.count++;
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);

    if (error) {
      metrics.errors++;
    }

    // Store response time for percentile calculations
    this.responseTimes.push(duration);
    if (this.responseTimes.length > this.maxResponseTimeSamples) {
      this.responseTimes.shift();
    }
  }

  /**
   * Record service-specific metrics
   */
  recordServiceMetrics(
    service: string,
    responseTime: number,
    error?: { message: string; statusCode: number }
  ): void {
    let metrics = this.serviceMetrics.get(service);
    if (!metrics) {
      metrics = {
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
      this.serviceMetrics.set(service, metrics);
    }

    metrics.requestCount++;

    // Update average response time
    const totalRequests = metrics.requestCount;
    metrics.avgResponseTime =
      (metrics.avgResponseTime * (totalRequests - 1) + responseTime) /
      totalRequests;

    if (error) {
      metrics.errorCount++;
      metrics.lastError = {
        timestamp: new Date(),
        message: error.message,
        statusCode: error.statusCode,
      };
    }

    // Calculate percentiles (simplified - in production use a proper library)
    const serviceTimes = this.getServiceResponseTimes(service);
    metrics.p50ResponseTime = this.calculatePercentile(serviceTimes, 50);
    metrics.p95ResponseTime = this.calculatePercentile(serviceTimes, 95);
    metrics.p99ResponseTime = this.calculatePercentile(serviceTimes, 99);
  }

  /**
   * Get response times for a specific service
   */
  private getServiceResponseTimes(service: string): number[] {
    // In a real implementation, we'd track per-service response times
    // For now, return a subset of all response times as a proxy
    return this.responseTimes.slice();
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get metrics for a specific route
   */
  getRouteMetrics(route: string): RequestMetrics | null {
    return this.routeMetrics.get(route) || null;
  }

  /**
   * Get all route metrics
   */
  getAllRouteMetrics(): Map<string, RequestMetrics> {
    return new Map(this.routeMetrics);
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(service: string): ServiceMetrics | null {
    return this.serviceMetrics.get(service) || null;
  }

  /**
   * Get all service metrics
   */
  getAllServiceMetrics(): Map<string, ServiceMetrics> {
    return new Map(this.serviceMetrics);
  }

  /**
   * Get overall statistics
   */
  getOverallStats(): {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    let totalRequests = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    this.routeMetrics.forEach((metrics) => {
      totalRequests += metrics.count;
      totalErrors += metrics.errors;
      totalDuration += metrics.totalDuration;
    });

    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      avgResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
      p50ResponseTime: this.calculatePercentile(this.responseTimes, 50),
      p95ResponseTime: this.calculatePercentile(this.responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(this.responseTimes, 99),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.routeMetrics.clear();
    this.serviceMetrics.clear();
    this.responseTimes.length = 0;
    this.logger.log('All metrics have been reset');
  }

  /**
   * Reset metrics for a specific route
   */
  resetRoute(route: string): void {
    this.routeMetrics.delete(route);
  }

  /**
   * Reset metrics for a specific service
   */
  resetService(service: string): void {
    this.serviceMetrics.delete(service);
  }
}
