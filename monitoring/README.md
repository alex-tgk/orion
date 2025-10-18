# ORION Monitoring & Observability Stack

Complete monitoring and observability solution for the ORION microservices platform.

## Overview

This monitoring stack provides comprehensive observability through:

- **Metrics**: Prometheus for metrics collection and alerting
- **Logs**: Loki/Elasticsearch for centralized log aggregation
- **Traces**: Tempo/Jaeger for distributed tracing
- **Visualization**: Grafana for dashboards and analytics
- **Alerting**: AlertManager for alert routing and notifications

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Services Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Gateway  │  │   Auth   │  │   User   │  │  Notif   │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │ Metrics     │ Metrics      │ Metrics     │ Metrics     │
│       │ Logs        │ Logs         │ Logs        │ Logs        │
│       │ Traces      │ Traces       │ Traces      │ Traces      │
└───────┼─────────────┼──────────────┼─────────────┼─────────────┘
        │             │              │             │
        ▼             ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Collection Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Prometheus  │  │   Promtail   │  │ OTel Collector│          │
│  │   (Metrics)  │  │    (Logs)    │  │   (Traces)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Storage Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Prometheus  │  │     Loki     │  │    Tempo     │          │
│  │   (TSDB)     │  │  (LogStore)  │  │  (Traces)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Visualization Layer                           │
│                      ┌──────────────┐                            │
│                      │   Grafana    │                            │
│                      │  (Dashboards)│                            │
│                      └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Start with Elasticsearch (alternative to Loki)
docker-compose -f docker-compose.monitoring.yml --profile elastic up -d
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3100 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger UI**: http://localhost:16686
- **Loki**: http://localhost:3101

### 3. Configure Services

Each microservice needs to be configured to export metrics and traces:

```typescript
// main.ts
import { MetricsModule, MetricsInterceptor } from '@orion/shared/metrics';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable metrics
  app.useGlobalInterceptors(app.get(MetricsInterceptor));

  await app.listen(3000);
}
```

## Components

### Prometheus

**Purpose**: Metrics collection and time-series storage

**Configuration**: `prometheus/prometheus.yml`

**Scrape Targets**:
- Gateway Service: `http://gateway:3000/metrics`
- Auth Service: `http://auth:3001/api/auth/metrics`
- User Service: `http://user:3002/api/user/metrics`
- Notification Service: `http://notifications:3003/api/v1/metrics`
- PostgreSQL: `http://postgres-exporter:9187/metrics`
- Redis: `http://redis-exporter:9121/metrics`
- RabbitMQ: `http://rabbitmq-exporter:9419/metrics`

**Retention**: 15 days, 50GB max

### Grafana

**Purpose**: Visualization and dashboards

**Pre-configured Dashboards**:
1. System Overview - Overall platform health
2. Service Performance - Per-service metrics
3. Database Performance - PostgreSQL metrics
4. Cache Performance - Redis metrics
5. Message Queue - RabbitMQ metrics
6. Business Metrics - KPIs and analytics

**Datasources**:
- Prometheus (metrics)
- Loki (logs)
- Tempo (traces)
- PostgreSQL (direct queries)

### Loki

**Purpose**: Log aggregation and storage

**Features**:
- Structured logging support
- Label-based indexing
- Efficient storage
- Integration with Grafana

**Configuration**: `loki/loki-config.yml`

**Retention**: 7 days

### Tempo

**Purpose**: Distributed tracing

**Features**:
- OpenTelemetry support
- Jaeger integration
- Service dependency mapping
- Trace to metrics/logs correlation

**Protocols Supported**:
- OTLP (gRPC/HTTP)
- Jaeger
- Zipkin

### AlertManager

**Purpose**: Alert routing and notifications

**Features**:
- Alert grouping and deduplication
- Multiple notification channels
- Alert inhibition rules
- Silence management

**Notification Channels**:
- Slack
- Email
- PagerDuty
- Webhook

## Metrics

### HTTP Metrics

All services automatically expose these metrics:

```
http_requests_total{service, method, route, status}
http_request_duration_seconds{service, method, route, status}
http_request_size_bytes{service, method, route}
http_response_size_bytes{service, method, route, status}
```

### Database Metrics

```
db_queries_total{service, operation, model}
db_query_duration_seconds{service, operation, model}
db_connection_pool_active{service}
db_connection_pool_idle{service}
db_connection_pool_max{service}
```

### Cache Metrics

```
cache_operations_total{service, operation}
cache_hits_total{service}
cache_misses_total{service}
cache_keys_total{service}
cache_memory_usage_bytes{service}
```

### Business Metrics

```
users_created_total{service}
auth_attempts_total{service, status, method}
notifications_sent_total{service, type, status}
auth_active_sessions{service}
```

## Alerts

### Critical Alerts

- **ServiceDown**: Service is unavailable
- **HighErrorRate**: >5% error rate for 5 minutes
- **PostgresDown**: Database is unavailable
- **RedisDown**: Cache is unavailable
- **RabbitMQDown**: Message queue is unavailable

### Warning Alerts

- **HighLatency**: P95 latency >1s for 10 minutes
- **HighMemoryUsage**: >85% memory usage
- **HighCPUUsage**: >80% CPU usage
- **LowCacheHitRate**: <80% cache hit rate

### Security Alerts

- **TooManyLoginAttempts**: >5 failed logins/sec from same IP
- **UnauthorizedAccessAttempts**: >10 401s per second
- **HighAuthenticationFailureRate**: >20% auth failures

## Logging

### Log Format

All services should use structured JSON logging:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "auth",
  "trace_id": "abc123",
  "span_id": "def456",
  "message": "User authenticated successfully",
  "user_id": "user-123",
  "duration_ms": 45
}
```

### Log Levels

- **ERROR**: Errors requiring immediate attention
- **WARN**: Warning conditions
- **INFO**: Informational messages
- **DEBUG**: Debug information

### Log Correlation

Logs are automatically correlated with traces using `trace_id` and `span_id` fields.

## Tracing

### Instrumentation

Services are instrumented with OpenTelemetry:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('auth-service');

async function authenticateUser(credentials) {
  const span = tracer.startSpan('authenticate-user');

  try {
    // Authentication logic
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

### Trace Sampling

- **Always sample**: Errors and slow requests (>1s)
- **Probabilistic**: 10% of other requests
- **Adjustable**: Via `TRACE_SAMPLING_RATE` environment variable

## Dashboards

### System Overview

Displays:
- Overall system health
- Request rates across all services
- Error rates
- P95 latency
- Resource utilization

### Service Dashboard

For each service:
- Request rate and latency
- Error rate and top errors
- Database query performance
- Cache hit rate
- Active connections

### Database Dashboard

- Query rate and duration
- Connection pool usage
- Slow queries (>500ms)
- Deadlocks and conflicts
- Table and index sizes

### Business Metrics

- User registrations
- Authentication success/failure rates
- Notification delivery rates
- Active user sessions
- API usage by endpoint

## Alerting Rules

### SLO-based Alerts

Platform SLOs:
- **Availability**: 99.5% uptime
- **Latency**: P95 < 500ms
- **Error Rate**: < 0.5%

Alerts fire when SLOs are violated for sustained periods.

### Resource Alerts

- Memory usage > 85%
- CPU usage > 80%
- Disk space < 10%
- Connection pool > 80%

## Troubleshooting

### High Latency

1. Check service dashboard for slow endpoints
2. Review database queries in Database dashboard
3. Check trace waterfall in Jaeger for bottlenecks
4. Review logs for errors/warnings

### High Error Rate

1. Check error logs in Grafana
2. Review recent deployments
3. Check external dependencies (DB, Redis, RabbitMQ)
4. Review traces for failed requests

### Service Down

1. Check container logs: `docker logs orion-<service>`
2. Verify health check: `curl http://localhost:PORT/health`
3. Check dependencies (database, cache, queue)
4. Review recent changes in git log

## Maintenance

### Log Retention

Logs are retained for:
- Loki: 7 days
- Elasticsearch: 30 days (if enabled)

Adjust in configuration files as needed.

### Metrics Retention

Prometheus retains metrics for 15 days by default. For long-term storage:

1. Configure remote write to long-term storage
2. Update `prometheus.yml` with remote write endpoint
3. Consider downsampling for older data

### Backup

Important data to backup:
- Grafana dashboards: `grafana_data` volume
- AlertManager configuration and silences
- Prometheus recording/alerting rules

```bash
# Backup Grafana
docker cp orion-grafana:/var/lib/grafana ./backup/grafana

# Backup AlertManager
docker cp orion-alertmanager:/alertmanager ./backup/alertmanager
```

## Security

### Access Control

- Grafana: Configure authentication (LDAP, OAuth, etc.)
- Prometheus: Enable basic auth or OAuth proxy
- AlertManager: Restrict access via firewall rules

### Secrets Management

- Store credentials in `.env` file (not in git)
- Use Docker secrets in production
- Rotate credentials regularly

### Network Security

- Services communicate over internal network
- Expose only necessary ports
- Use TLS for external access

## Performance Tuning

### Prometheus

```yaml
# Increase scrape interval for less critical metrics
scrape_interval: 30s

# Adjust retention
storage:
  tsdb:
    retention.time: 30d
    retention.size: 100GB
```

### Loki

```yaml
# Adjust ingestion limits
limits_config:
  ingestion_rate_mb: 20
  ingestion_burst_size_mb: 40
```

### Tempo

```yaml
# Adjust sampling rate
tail_sampling:
  policies:
    - name: probabilistic
      probabilistic:
        sampling_percentage: 5  # Reduce from 10%
```

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Tempo Documentation](https://grafana.com/docs/tempo/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)

## Support

For issues or questions:
1. Check the troubleshooting guide
2. Review runbooks in `/monitoring/docs/runbooks/`
3. Contact the platform team on Slack: `#orion-platform`
