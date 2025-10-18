# ORION Metrics Reference

Complete reference of all metrics collected by the ORION platform.

## Table of Contents

- [HTTP Metrics](#http-metrics)
- [Database Metrics](#database-metrics)
- [Cache Metrics](#cache-metrics)
- [Message Queue Metrics](#message-queue-metrics)
- [Business Metrics](#business-metrics)
- [Infrastructure Metrics](#infrastructure-metrics)
- [External API Metrics](#external-api-metrics)
- [SLO Metrics](#slo-metrics)

## HTTP Metrics

### http_requests_total

**Type**: Counter
**Description**: Total number of HTTP requests received
**Labels**:
- `service`: Service name (gateway, auth, user, notifications)
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `route`: Request route pattern
- `status`: HTTP status code

**Example Query**:
```promql
# Request rate by service
sum(rate(http_requests_total[5m])) by (service)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)

# Success rate
sum(rate(http_requests_total{status=~"2.."}[5m])) / sum(rate(http_requests_total[5m]))
```

### http_request_duration_seconds

**Type**: Histogram
**Description**: HTTP request duration in seconds
**Labels**:
- `service`: Service name
- `method`: HTTP method
- `route`: Request route pattern
- `status`: HTTP status code

**Buckets**: 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10 seconds

**Example Query**:
```promql
# P95 latency by service
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le))

# P99 latency for specific endpoint
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{route="/api/users"}[5m])) by (le))

# Average latency
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

### http_request_size_bytes

**Type**: Summary
**Description**: HTTP request size in bytes
**Labels**:
- `service`: Service name
- `method`: HTTP method
- `route`: Request route pattern

**Example Query**:
```promql
# Average request size
rate(http_request_size_bytes_sum[5m]) / rate(http_request_size_bytes_count[5m])

# Total data received
sum(rate(http_request_size_bytes_sum[5m]))
```

### http_response_size_bytes

**Type**: Summary
**Description**: HTTP response size in bytes
**Labels**:
- `service`: Service name
- `method`: HTTP method
- `route`: Request route pattern
- `status`: HTTP status code

**Example Query**:
```promql
# Average response size
rate(http_response_size_bytes_sum[5m]) / rate(http_response_size_bytes_count[5m])

# Bandwidth usage
sum(rate(http_response_size_bytes_sum[5m]))
```

## Database Metrics

### db_queries_total

**Type**: Counter
**Description**: Total number of database queries executed
**Labels**:
- `service`: Service name
- `operation`: Query operation (SELECT, INSERT, UPDATE, DELETE)
- `model`: Database model/table name

**Example Query**:
```promql
# Query rate by operation
sum(rate(db_queries_total[5m])) by (operation)

# Queries per service
sum(rate(db_queries_total[5m])) by (service)
```

### db_query_duration_seconds

**Type**: Histogram
**Description**: Database query duration in seconds
**Labels**:
- `service`: Service name
- `operation`: Query operation
- `model`: Database model/table name

**Buckets**: 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5 seconds

**Example Query**:
```promql
# P95 query duration
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (service, le))

# Slow queries (>500ms)
sum(rate(db_query_duration_seconds_bucket{le="0.5"}[5m])) by (service)
```

### db_connection_pool_active

**Type**: Gauge
**Description**: Number of active database connections
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Active connections by service
db_connection_pool_active

# Connection pool utilization
db_connection_pool_active / db_connection_pool_max
```

### db_connection_pool_idle

**Type**: Gauge
**Description**: Number of idle database connections
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Idle connections
db_connection_pool_idle
```

### db_connection_pool_max

**Type**: Gauge
**Description**: Maximum database connections allowed
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Pool capacity
db_connection_pool_max
```

### db_cache_hits / db_cache_misses

**Type**: Counter
**Description**: Database query cache hits and misses
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Cache hit rate
sum(rate(db_cache_hits[5m])) / (sum(rate(db_cache_hits[5m])) + sum(rate(db_cache_misses[5m])))
```

## Cache Metrics

### cache_operations_total

**Type**: Counter
**Description**: Total number of cache operations
**Labels**:
- `service`: Service name
- `operation`: Operation type (get, set, del)

**Example Query**:
```promql
# Operations rate by type
sum(rate(cache_operations_total[5m])) by (operation)
```

### cache_hits_total / cache_misses_total

**Type**: Counter
**Description**: Total cache hits and misses
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Hit rate
sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))

# Miss rate
sum(rate(cache_misses_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
```

### cache_keys_total

**Type**: Gauge
**Description**: Total number of cache keys
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Total keys
sum(cache_keys_total)
```

### cache_memory_usage_bytes

**Type**: Gauge
**Description**: Cache memory usage in bytes
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Memory usage
sum(cache_memory_usage_bytes)

# Memory usage percentage (assuming 256MB max)
cache_memory_usage_bytes / (256 * 1024 * 1024) * 100
```

## Message Queue Metrics

### message_queue_published_total

**Type**: Counter
**Description**: Total messages published to queue
**Labels**:
- `service`: Service name
- `queue`: Queue name
- `exchange`: Exchange name

**Example Query**:
```promql
# Publish rate
sum(rate(message_queue_published_total[5m])) by (queue)
```

### message_queue_consumed_total

**Type**: Counter
**Description**: Total messages consumed from queue
**Labels**:
- `service`: Service name
- `queue`: Queue name

**Example Query**:
```promql
# Consumption rate
sum(rate(message_queue_consumed_total[5m])) by (queue)

# Processing lag
sum(rate(message_queue_published_total[5m])) by (queue) - sum(rate(message_queue_consumed_total[5m])) by (queue)
```

### message_queue_failed_total

**Type**: Counter
**Description**: Total failed message processing attempts
**Labels**:
- `service`: Service name
- `queue`: Queue name
- `reason`: Failure reason

**Example Query**:
```promql
# Failure rate
sum(rate(message_queue_failed_total[5m])) by (queue)

# Failure rate by reason
sum(rate(message_queue_failed_total[5m])) by (reason)
```

### message_queue_processing_duration_seconds

**Type**: Histogram
**Description**: Message processing duration in seconds
**Labels**:
- `service`: Service name
- `queue`: Queue name

**Buckets**: 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30 seconds

**Example Query**:
```promql
# P95 processing time
histogram_quantile(0.95, sum(rate(message_queue_processing_duration_seconds_bucket[5m])) by (queue, le))
```

## Business Metrics

### users_created_total

**Type**: Counter
**Description**: Total number of users created
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# User creation rate
rate(users_created_total[1h])

# Daily user signups
increase(users_created_total[24h])
```

### auth_attempts_total

**Type**: Counter
**Description**: Total authentication attempts
**Labels**:
- `service`: Service name
- `status`: Status (success, failed)
- `method`: Authentication method (password, oauth, etc.)

**Example Query**:
```promql
# Auth success rate
sum(rate(auth_attempts_total{status="success"}[5m])) / sum(rate(auth_attempts_total[5m]))

# Failed login rate
sum(rate(auth_attempts_total{status="failed"}[5m]))
```

### notifications_sent_total

**Type**: Counter
**Description**: Total notifications sent
**Labels**:
- `service`: Service name
- `type`: Notification type (email, sms, push)
- `status`: Status (success, failed)

**Example Query**:
```promql
# Notification rate by type
sum(rate(notifications_sent_total[5m])) by (type)

# Delivery success rate
sum(rate(notifications_sent_total{status="success"}[5m])) / sum(rate(notifications_sent_total[5m]))
```

### auth_active_sessions

**Type**: Gauge
**Description**: Number of active user sessions
**Labels**:
- `service`: Service name

**Example Query**:
```promql
# Current active sessions
auth_active_sessions

# Peak sessions in last hour
max_over_time(auth_active_sessions[1h])
```

## Infrastructure Metrics

### container_cpu_usage_seconds_total

**Type**: Counter
**Description**: Total CPU usage by container
**Labels**:
- `name`: Container name

**Example Query**:
```promql
# CPU usage rate
rate(container_cpu_usage_seconds_total{name=~"orion-.*"}[5m])

# CPU percentage
rate(container_cpu_usage_seconds_total{name=~"orion-.*"}[5m]) * 100
```

### container_memory_usage_bytes

**Type**: Gauge
**Description**: Container memory usage in bytes
**Labels**:
- `name`: Container name

**Example Query**:
```promql
# Memory usage
container_memory_usage_bytes{name=~"orion-.*"}

# Memory percentage
container_memory_usage_bytes / container_spec_memory_limit_bytes * 100
```

### container_network_receive_bytes_total

**Type**: Counter
**Description**: Network bytes received by container
**Labels**:
- `name`: Container name

**Example Query**:
```promql
# Network receive rate
rate(container_network_receive_bytes_total{name=~"orion-.*"}[5m])
```

### container_network_transmit_bytes_total

**Type**: Counter
**Description**: Network bytes transmitted by container
**Labels**:
- `name`: Container name

**Example Query**:
```promql
# Network transmit rate
rate(container_network_transmit_bytes_total{name=~"orion-.*"}[5m])
```

## External API Metrics

### external_api_requests_total

**Type**: Counter
**Description**: Total external API requests
**Labels**:
- `service`: Service name
- `provider`: External provider (stripe, sendgrid, etc.)
- `endpoint`: API endpoint
- `status`: HTTP status code

**Example Query**:
```promql
# External API call rate
sum(rate(external_api_requests_total[5m])) by (provider)

# External API error rate
sum(rate(external_api_requests_total{status=~"5.."}[5m])) by (provider)
```

### external_api_duration_seconds

**Type**: Histogram
**Description**: External API request duration
**Labels**:
- `service`: Service name
- `provider`: External provider
- `endpoint`: API endpoint

**Buckets**: 0.1, 0.5, 1, 2, 5, 10, 30 seconds

**Example Query**:
```promql
# P95 external API latency
histogram_quantile(0.95, sum(rate(external_api_duration_seconds_bucket[5m])) by (provider, le))
```

## SLO Metrics

### slo:availability:1h

**Type**: Recording Rule
**Description**: 1-hour availability SLI

**Example Query**:
```promql
# Current availability
slo:availability:1h

# Error budget (assuming 99.5% SLO)
(0.995 - slo:availability:1h) / 0.005
```

### slo:latency_p95:1h

**Type**: Recording Rule
**Description**: 1-hour P95 latency SLI

**Example Query**:
```promql
# Current P95 latency
slo:latency_p95:1h

# SLO compliance (target: 500ms)
slo:latency_p95:1h < 0.5
```

## Common Queries

### Service Health

```promql
# All services up
up{job=~"gateway|auth|user|notifications|admin-ui"}

# Services down
up{job=~"gateway|auth|user|notifications|admin-ui"} == 0
```

### Error Budget

```promql
# Remaining error budget (30 days, 99.5% SLO)
(0.995 - (sum(rate(http_requests_total{status=~"2.."}[30d])) / sum(rate(http_requests_total[30d])))) / 0.005

# Error budget burn rate
sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))
```

### Top Endpoints by Traffic

```promql
# Top 10 endpoints by request rate
topk(10, sum(rate(http_requests_total[5m])) by (route))
```

### Top Endpoints by Latency

```promql
# Top 10 slowest endpoints
topk(10, histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (route, le)))
```

### Resource Utilization

```promql
# Total platform CPU
sum(rate(container_cpu_usage_seconds_total{name=~"orion-.*"}[5m]))

# Total platform memory
sum(container_memory_usage_bytes{name=~"orion-.*"})
```

## Label Guidelines

### Do's

✅ Use consistent label names across metrics
✅ Keep label cardinality low (<100 unique values)
✅ Use meaningful label values
✅ Document all custom labels

### Don'ts

❌ Don't use user IDs or other high-cardinality data as labels
❌ Don't use timestamps as labels
❌ Don't use dynamic label values
❌ Don't create labels with unbounded values

## Metric Naming Conventions

1. **Use base units**: seconds (not milliseconds), bytes (not kilobytes)
2. **Counter suffix**: Use `_total` suffix (e.g., `requests_total`)
3. **Gauge naming**: Use present tense (e.g., `active_connections`)
4. **Histogram/Summary suffix**: Use `_seconds`, `_bytes`, etc.
5. **Prefix**: Use service/component prefix when appropriate

## Further Reading

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Metric and Label Naming](https://prometheus.io/docs/practices/naming/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
