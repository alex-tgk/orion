# Prometheus Metrics Specification

## Overview
Comprehensive metrics collection and monitoring for ORION microservices using Prometheus with custom business metrics, HTTP request metrics, and system health indicators.

## Technical Stack
- **@willsoto/nestjs-prometheus**: NestJS Prometheus integration
- **prom-client**: Prometheus client library
- **Express middleware**: HTTP metrics collection
- **Prometheus server**: Metrics scraping and storage

## Architecture

### Metrics Package Structure
```
packages/shared/src/metrics/
├── metrics.module.ts              # NestJS module
├── metrics.service.ts             # Metrics service wrapper
├── metrics.config.ts              # Configuration factory
├── collectors/
│   ├── http-metrics.collector.ts  # HTTP request metrics
│   ├── business-metrics.collector.ts
│   └── system-metrics.collector.ts
├── middleware/
│   └── metrics.middleware.ts      # HTTP metrics middleware
├── decorators/
│   ├── counted.decorator.ts       # Counter decorator
│   ├── timed.decorator.ts         # Histogram decorator
│   └── gauged.decorator.ts        # Gauge decorator
├── interfaces/
│   ├── metrics-config.interface.ts
│   └── metric-labels.interface.ts
└── __tests__/
    ├── metrics.service.spec.ts
    ├── metrics.middleware.spec.ts
    └── collectors/
        ├── http-metrics.collector.spec.ts
        └── business-metrics.collector.spec.ts
```

## Core Features

### 1. Standard HTTP Metrics (RED Metrics)
- **Rate**: Requests per second by endpoint
- **Errors**: Error rate by status code
- **Duration**: Request latency distribution

**Metrics**:
```typescript
// Request counter
http_requests_total{
  method="GET",
  path="/api/users",
  status="200",
  service="user-service"
}

// Request duration histogram
http_request_duration_seconds{
  method="GET",
  path="/api/users",
  service="user-service"
}

// Request size histogram
http_request_size_bytes{
  method="POST",
  path="/api/users",
  service="user-service"
}

// Response size histogram
http_response_size_bytes{
  method="GET",
  path="/api/users",
  service="user-service"
}
```

### 2. Business Metrics
- User registrations
- Order completions
- Payment transactions
- Active sessions
- Queue lengths

**Examples**:
```typescript
// Counters
user_registrations_total{type="email"}
orders_completed_total{status="success"}
payments_processed_total{method="stripe"}

// Gauges
active_users_count
queue_length{queue="email"}
cache_hit_rate

// Histograms
order_value_dollars
payment_processing_duration_seconds
```

### 3. System Metrics
- Process CPU usage
- Process memory usage
- Event loop lag
- Garbage collection stats
- Node.js version info

### 4. Custom Metrics
- Counter: Monotonically increasing values
- Gauge: Values that can go up or down
- Histogram: Distribution of values
- Summary: Similar to histogram with quantiles

## API Design

### MetricsService Interface
```typescript
export class MetricsService {
  // Counter operations
  incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
  getCounter(name: string): Counter;

  // Gauge operations
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  incrementGauge(name: string, labels?: Record<string, string>, value?: number): void;
  decrementGauge(name: string, labels?: Record<string, string>, value?: number): void;
  getGauge(name: string): Gauge;

  // Histogram operations
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
  startHistogramTimer(name: string, labels?: Record<string, string>): () => void;
  getHistogram(name: string): Histogram;

  // Summary operations
  observeSummary(name: string, value: number, labels?: Record<string, string>): void;
  getSummary(name: string): Summary;

  // Metric creation
  createCounter(config: MetricConfig): Counter;
  createGauge(config: MetricConfig): Gauge;
  createHistogram(config: HistogramConfig): Histogram;
  createSummary(config: SummaryConfig): Summary;

  // Metrics retrieval
  getMetrics(): Promise<string>;
  getMetricsAsJSON(): Promise<any>;
}
```

### MetricsModule Configuration
```typescript
MetricsModule.forRoot({
  defaultLabels: {
    service: 'user-service',
    environment: 'production',
    version: '1.0.0',
  },
  path: '/metrics',
  defaultMetrics: {
    enabled: true,
    timeout: 10000,
  },
  customMetrics: [
    {
      type: 'counter',
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['type', 'status'],
    },
    {
      type: 'histogram',
      name: 'order_processing_duration_seconds',
      help: 'Time taken to process orders',
      labelNames: ['status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    },
  ],
})
```

## Implementation Requirements

### 1. Prometheus Integration
- Expose /metrics endpoint
- Register default metrics
- Configure metric prefixes
- Set up default labels

### 2. HTTP Metrics Middleware
- Request counting
- Response time tracking
- Error rate monitoring
- Request/response size tracking

### 3. Custom Metric Registration
- Dynamic metric creation
- Metric validation
- Label validation
- Metric naming conventions

### 4. Performance Optimization
- Metric caching
- Efficient label usage
- Cardinality management
- Memory-efficient storage

### 5. Health Checks
- Liveness probe endpoint
- Readiness probe endpoint
- Startup probe endpoint

## Configuration Options

### Environment Variables
```env
METRICS_ENABLED=true
METRICS_PATH=/metrics
METRICS_PORT=9090
METRICS_DEFAULT_LABELS=service:user-service,env:production
METRICS_COLLECT_DEFAULT=true
METRICS_PREFIX=orion_
```

### Configuration Interface
```typescript
interface MetricsConfig {
  enabled?: boolean;
  path?: string;
  port?: number;
  defaultLabels?: Record<string, string>;
  defaultMetrics?: {
    enabled?: boolean;
    timeout?: number;
    prefix?: string;
  };
  customMetrics?: CustomMetricConfig[];
  histogramBuckets?: number[];
  summaryPercentiles?: number[];
}

interface CustomMetricConfig {
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[]; // For histogram
  percentiles?: number[]; // For summary
}
```

## Usage Examples

### HTTP Metrics (Automatic)
```typescript
// In main.ts
app.use(metricsMiddleware());

// Automatically tracks:
// - http_requests_total
// - http_request_duration_seconds
// - http_request_size_bytes
// - http_response_size_bytes
```

### Counter Usage
```typescript
@Injectable()
export class UserService {
  constructor(private readonly metrics: MetricsService) {}

  async registerUser(dto: RegisterUserDto): Promise<User> {
    try {
      const user = await this.userRepository.save(dto);

      // Increment registration counter
      this.metrics.incrementCounter('user_registrations_total', {
        type: dto.type,
        status: 'success',
      });

      return user;
    } catch (error) {
      this.metrics.incrementCounter('user_registrations_total', {
        type: dto.type,
        status: 'error',
      });
      throw error;
    }
  }
}
```

### Gauge Usage
```typescript
@Injectable()
export class SessionService {
  constructor(private readonly metrics: MetricsService) {}

  async createSession(userId: string): Promise<Session> {
    const session = await this.sessionRepository.save({ userId });

    // Increment active sessions gauge
    this.metrics.incrementGauge('active_sessions_count');

    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    await this.sessionRepository.delete(sessionId);

    // Decrement active sessions gauge
    this.metrics.decrementGauge('active_sessions_count');
  }
}
```

### Histogram Usage
```typescript
@Injectable()
export class OrderService {
  constructor(private readonly metrics: MetricsService) {}

  async processOrder(order: Order): Promise<Order> {
    const endTimer = this.metrics.startHistogramTimer(
      'order_processing_duration_seconds',
      { status: 'pending' }
    );

    try {
      const result = await this.orderRepository.save(order);

      endTimer({ status: 'success' }); // Updates labels

      // Record order value
      this.metrics.observeHistogram(
        'order_value_dollars',
        order.total,
        { currency: 'USD' }
      );

      return result;
    } catch (error) {
      endTimer({ status: 'error' });
      throw error;
    }
  }
}
```

### Decorator-Based Metrics
```typescript
@Injectable()
export class PaymentService {
  @Counted('payment_attempts_total', { labelNames: ['method', 'status'] })
  @Timed('payment_processing_duration_seconds')
  async processPayment(payment: PaymentDto): Promise<PaymentResult> {
    // Metrics automatically tracked
    return this.paymentGateway.charge(payment);
  }

  @Gauged('payment_queue_length')
  getQueueLength(): number {
    return this.queue.length;
  }
}
```

### Custom Metric Registration
```typescript
@Injectable()
export class CustomMetricsService implements OnModuleInit {
  constructor(private readonly metrics: MetricsService) {}

  onModuleInit() {
    // Register custom counter
    this.metrics.createCounter({
      name: 'api_calls_total',
      help: 'Total API calls to external services',
      labelNames: ['service', 'endpoint', 'status'],
    });

    // Register custom histogram
    this.metrics.createHistogram({
      name: 'cache_latency_seconds',
      help: 'Cache operation latency',
      labelNames: ['operation', 'hit'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    // Register custom gauge
    this.metrics.createGauge({
      name: 'database_connections',
      help: 'Number of active database connections',
      labelNames: ['pool', 'state'],
    });
  }
}
```

## Testing Requirements

### Unit Tests
- MetricsService metric creation
- Counter increment/decrement
- Gauge set/increment/decrement
- Histogram observation
- Middleware request tracking
- Decorator functionality

### Integration Tests
- Metrics endpoint exposure
- Prometheus scraping compatibility
- Label cardinality validation
- Metric naming validation

### Mock Metrics in Tests
```typescript
const mockMetricsService = {
  incrementCounter: jest.fn(),
  setGauge: jest.fn(),
  observeHistogram: jest.fn(),
  startHistogramTimer: jest.fn(() => jest.fn()),
  createCounter: jest.fn(),
  createGauge: jest.fn(),
  createHistogram: jest.fn(),
};
```

## Metric Naming Conventions

### Standard Format
```
<namespace>_<subsystem>_<name>_<unit>

Examples:
orion_http_requests_total
orion_user_registrations_total
orion_order_processing_duration_seconds
orion_cache_hit_rate_ratio
orion_db_connections_active
```

### Best Practices
- Use lowercase with underscores
- Include unit suffix (seconds, bytes, total, etc.)
- Use _total suffix for counters
- Use descriptive names
- Keep cardinality low (< 100 unique label combinations)

## Performance Considerations

### Cardinality Management
```typescript
// ❌ Bad - High cardinality (user IDs)
this.metrics.incrementCounter('requests', { userId: '12345' });

// ✅ Good - Low cardinality
this.metrics.incrementCounter('requests', { userType: 'premium' });
```

### Histogram Buckets
```typescript
// Default buckets (general purpose)
[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

// API latency buckets
[0.01, 0.05, 0.1, 0.5, 1, 2, 5]

// Database query buckets
[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]

// Business process buckets (order processing)
[1, 5, 10, 30, 60, 120, 300]
```

## Prometheus Queries

### Request Rate
```promql
# Total request rate
rate(http_requests_total[5m])

# Request rate by endpoint
rate(http_requests_total{path="/api/users"}[5m])

# Success rate
rate(http_requests_total{status=~"2.."}[5m])
```

### Error Rate
```promql
# Error rate percentage
100 * sum(rate(http_requests_total{status=~"5.."}[5m])) /
      sum(rate(http_requests_total[5m]))
```

### Latency Percentiles
```promql
# 95th percentile latency
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)

# 99th percentile latency
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket[5m])
)
```

### Business Metrics
```promql
# User registrations per hour
increase(user_registrations_total[1h])

# Average order value
avg(order_value_dollars)

# Active users
active_users_count
```

## Success Criteria
1. ✅ All HTTP requests tracked with method, path, status
2. ✅ Business metrics tracking key operations
3. ✅ System metrics exposed (CPU, memory, GC)
4. ✅ Metrics endpoint accessible at /metrics
5. ✅ Cardinality kept under control (< 10,000 time series)
6. ✅ Test coverage > 85%

## Dependencies
```json
{
  "@willsoto/nestjs-prometheus": "^6.0.0",
  "prom-client": "^15.1.0"
}
```

## Prometheus Server Setup

### Docker Compose
```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
```

### Configuration (prometheus.yml)
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'orion-services'
    static_configs:
      - targets:
          - 'user-service:9090'
          - 'auth-service:9090'
          - 'gateway:9090'
    metrics_path: '/metrics'
```

## Grafana Dashboards
- RED metrics dashboard (Rate, Errors, Duration)
- Business metrics dashboard
- System health dashboard
- Service-specific dashboards

## Future Enhancements
- [ ] Exemplars support (link metrics to traces)
- [ ] Remote write to long-term storage
- [ ] Metric federation across clusters
- [ ] Automated alerting rules
- [ ] Cost metrics tracking
- [ ] Custom aggregation rules
