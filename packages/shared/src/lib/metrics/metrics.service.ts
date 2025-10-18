import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';

/**
 * Metrics Service - Manages Prometheus metrics for the application
 *
 * Provides methods to track various application metrics including:
 * - HTTP requests (rate, duration, status codes)
 * - Database queries (duration, connection pool)
 * - Cache operations (hits, misses, operations)
 * - Business metrics (users, notifications, etc.)
 * - Custom application metrics
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  // HTTP Metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestSize: Summary<string>;
  private httpResponseSize: Summary<string>;

  // Database Metrics
  private dbQueriesTotal: Counter<string>;
  private dbQueryDuration: Histogram<string>;
  private dbConnectionPoolActive: Gauge<string>;
  private dbConnectionPoolIdle: Gauge<string>;
  private dbConnectionPoolMax: Gauge<string>;
  private dbCacheHits: Counter<string>;
  private dbCacheMisses: Counter<string>;

  // Cache Metrics (Redis)
  private cacheOperationsTotal: Counter<string>;
  private cacheHits: Counter<string>;
  private cacheMisses: Counter<string>;
  private cacheKeyCount: Gauge<string>;
  private cacheMemoryUsage: Gauge<string>;

  // Message Queue Metrics
  private messageQueuePublished: Counter<string>;
  private messageQueueConsumed: Counter<string>;
  private messageQueueFailed: Counter<string>;
  private messageQueueDuration: Histogram<string>;

  // Business Metrics
  private usersCreatedTotal: Counter<string>;
  private authAttemptsTotal: Counter<string>;
  private notificationsSentTotal: Counter<string>;
  private activeSessionsGauge: Gauge<string>;

  // External API Metrics
  private externalApiRequestsTotal: Counter<string>;
  private externalApiDuration: Histogram<string>;

  // Circuit Breaker Metrics
  private circuitBreakerState: Gauge<string>;
  private circuitBreakerFailures: Counter<string>;

  onModuleInit() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['service', 'method', 'route', 'status'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['service', 'method', 'route', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.httpRequestSize = new Summary({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['service', 'method', 'route'],
      registers: [register],
    });

    this.httpResponseSize = new Summary({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['service', 'method', 'route', 'status'],
      registers: [register],
    });

    // Database Metrics
    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['service', 'operation', 'model'],
      registers: [register],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['service', 'operation', 'model'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.dbConnectionPoolActive = new Gauge({
      name: 'db_connection_pool_active',
      help: 'Number of active database connections',
      labelNames: ['service'],
      registers: [register],
    });

    this.dbConnectionPoolIdle = new Gauge({
      name: 'db_connection_pool_idle',
      help: 'Number of idle database connections',
      labelNames: ['service'],
      registers: [register],
    });

    this.dbConnectionPoolMax = new Gauge({
      name: 'db_connection_pool_max',
      help: 'Maximum database connections',
      labelNames: ['service'],
      registers: [register],
    });

    this.dbCacheHits = new Counter({
      name: 'db_cache_hits',
      help: 'Database query cache hits',
      labelNames: ['service'],
      registers: [register],
    });

    this.dbCacheMisses = new Counter({
      name: 'db_cache_misses',
      help: 'Database query cache misses',
      labelNames: ['service'],
      registers: [register],
    });

    // Cache Metrics
    this.cacheOperationsTotal = new Counter({
      name: 'cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['service', 'operation'],
      registers: [register],
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['service'],
      registers: [register],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['service'],
      registers: [register],
    });

    this.cacheKeyCount = new Gauge({
      name: 'cache_keys_total',
      help: 'Total number of cache keys',
      labelNames: ['service'],
      registers: [register],
    });

    this.cacheMemoryUsage = new Gauge({
      name: 'cache_memory_usage_bytes',
      help: 'Cache memory usage in bytes',
      labelNames: ['service'],
      registers: [register],
    });

    // Message Queue Metrics
    this.messageQueuePublished = new Counter({
      name: 'message_queue_published_total',
      help: 'Total messages published to queue',
      labelNames: ['service', 'queue', 'exchange'],
      registers: [register],
    });

    this.messageQueueConsumed = new Counter({
      name: 'message_queue_consumed_total',
      help: 'Total messages consumed from queue',
      labelNames: ['service', 'queue'],
      registers: [register],
    });

    this.messageQueueFailed = new Counter({
      name: 'message_queue_failed_total',
      help: 'Total failed message processing',
      labelNames: ['service', 'queue', 'reason'],
      registers: [register],
    });

    this.messageQueueDuration = new Histogram({
      name: 'message_queue_processing_duration_seconds',
      help: 'Message processing duration in seconds',
      labelNames: ['service', 'queue'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [register],
    });

    // Business Metrics
    this.usersCreatedTotal = new Counter({
      name: 'users_created_total',
      help: 'Total number of users created',
      labelNames: ['service'],
      registers: [register],
    });

    this.authAttemptsTotal = new Counter({
      name: 'auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['service', 'status', 'method'],
      registers: [register],
    });

    this.notificationsSentTotal = new Counter({
      name: 'notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['service', 'type', 'status'],
      registers: [register],
    });

    this.activeSessionsGauge = new Gauge({
      name: 'auth_active_sessions',
      help: 'Number of active user sessions',
      labelNames: ['service'],
      registers: [register],
    });

    // External API Metrics
    this.externalApiRequestsTotal = new Counter({
      name: 'external_api_requests_total',
      help: 'Total external API requests',
      labelNames: ['service', 'provider', 'endpoint', 'status'],
      registers: [register],
    });

    this.externalApiDuration = new Histogram({
      name: 'external_api_duration_seconds',
      help: 'External API request duration',
      labelNames: ['service', 'provider', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [register],
    });

    // Circuit Breaker Metrics
    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['service', 'circuit'],
      registers: [register],
    });

    this.circuitBreakerFailures = new Counter({
      name: 'circuit_breaker_failures_total',
      help: 'Total circuit breaker failures',
      labelNames: ['service', 'circuit'],
      registers: [register],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    service: string,
    method: string,
    route: string,
    status: number,
    duration: number,
    requestSize?: number,
    responseSize?: number,
  ) {
    this.httpRequestsTotal.inc({ service, method, route, status: status.toString() });
    this.httpRequestDuration.observe(
      { service, method, route, status: status.toString() },
      duration / 1000, // Convert to seconds
    );

    if (requestSize !== undefined) {
      this.httpRequestSize.observe({ service, method, route }, requestSize);
    }

    if (responseSize !== undefined) {
      this.httpResponseSize.observe(
        { service, method, route, status: status.toString() },
        responseSize,
      );
    }
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(service: string, operation: string, model: string, duration: number) {
    this.dbQueriesTotal.inc({ service, operation, model });
    this.dbQueryDuration.observe({ service, operation, model }, duration / 1000);
  }

  /**
   * Update database connection pool metrics
   */
  updateDbConnectionPool(service: string, active: number, idle: number, max: number) {
    this.dbConnectionPoolActive.set({ service }, active);
    this.dbConnectionPoolIdle.set({ service }, idle);
    this.dbConnectionPoolMax.set({ service }, max);
  }

  /**
   * Record database cache metrics
   */
  recordDbCacheHit(service: string) {
    this.dbCacheHits.inc({ service });
  }

  recordDbCacheMiss(service: string) {
    this.dbCacheMisses.inc({ service });
  }

  /**
   * Record cache operations
   */
  recordCacheOperation(service: string, operation: 'get' | 'set' | 'del', hit: boolean) {
    this.cacheOperationsTotal.inc({ service, operation });
    if (operation === 'get') {
      if (hit) {
        this.cacheHits.inc({ service });
      } else {
        this.cacheMisses.inc({ service });
      }
    }
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(service: string, keyCount: number, memoryUsage: number) {
    this.cacheKeyCount.set({ service }, keyCount);
    this.cacheMemoryUsage.set({ service }, memoryUsage);
  }

  /**
   * Record message queue metrics
   */
  recordMessagePublished(service: string, queue: string, exchange: string) {
    this.messageQueuePublished.inc({ service, queue, exchange });
  }

  recordMessageConsumed(service: string, queue: string, duration: number) {
    this.messageQueueConsumed.inc({ service, queue });
    this.messageQueueDuration.observe({ service, queue }, duration / 1000);
  }

  recordMessageFailed(service: string, queue: string, reason: string) {
    this.messageQueueFailed.inc({ service, queue, reason });
  }

  /**
   * Record business metrics
   */
  recordUserCreated(service: string) {
    this.usersCreatedTotal.inc({ service });
  }

  recordAuthAttempt(service: string, status: 'success' | 'failed', method: string) {
    this.authAttemptsTotal.inc({ service, status, method });
  }

  recordNotificationSent(service: string, type: string, status: 'success' | 'failed') {
    this.notificationsSentTotal.inc({ service, type, status });
  }

  updateActiveSessions(service: string, count: number) {
    this.activeSessionsGauge.set({ service }, count);
  }

  /**
   * Record external API call
   */
  recordExternalApiCall(
    service: string,
    provider: string,
    endpoint: string,
    status: number,
    duration: number,
  ) {
    this.externalApiRequestsTotal.inc({
      service,
      provider,
      endpoint,
      status: status.toString(),
    });
    this.externalApiDuration.observe({ service, provider, endpoint }, duration / 1000);
  }

  /**
   * Update circuit breaker metrics
   */
  updateCircuitBreakerState(service: string, circuit: string, state: 0 | 1 | 2) {
    this.circuitBreakerState.set({ service, circuit }, state);
  }

  recordCircuitBreakerFailure(service: string, circuit: string) {
    this.circuitBreakerFailures.inc({ service, circuit });
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get metrics content type
   */
  getContentType(): string {
    return register.contentType;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    register.clear();
    this.initializeMetrics();
  }
}
