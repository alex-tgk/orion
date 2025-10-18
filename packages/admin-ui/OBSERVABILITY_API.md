# ORION Admin UI - Observability API Documentation

## Overview

The ORION Admin UI provides a comprehensive observability and monitoring API for the entire ORION microservices platform. This API aggregates health, metrics, and events from all registered services to provide real-time insights into system health and performance.

## Table of Contents

- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
  - [Services API](#services-api)
  - [Events API](#events-api)
  - [System API](#system-api)
  - [Legacy Observability API](#legacy-observability-api)
- [Data Models](#data-models)
- [Configuration](#configuration)
- [Background Services](#background-services)
- [Caching Strategy](#caching-strategy)
- [Error Handling](#error-handling)

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    ObservabilityModule                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Controllers:                                                 │
│  ├─ ServicesController       (Service-specific endpoints)    │
│  ├─ EventsController         (Event management)              │
│  ├─ SystemController         (System-wide stats)             │
│  └─ ObservabilityController  (Legacy endpoints)              │
│                                                               │
│  Services:                                                    │
│  ├─ ObservabilityService     (Service discovery & health)    │
│  ├─ MetricsService           (Metrics collection)            │
│  ├─ EventsService            (Event logging & querying)      │
│  ├─ StatsService             (Statistics aggregation)        │
│  ├─ CacheService             (Redis/in-memory caching)       │
│  └─ HealthMonitorService     (Background monitoring)         │
│                                                               │
│  External Dependencies:                                       │
│  └─ PortRegistryService      (Service registry from @orion/shared) │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐
│ ORION Service│
│  (Auth, etc) │
└──────┬───────┘
       │ 1. Register port
       │    & health endpoint
       ▼
┌──────────────┐
│PortRegistry  │
│  (Redis)     │
└──────┬───────┘
       │ 2. Service discovery
       ▼
┌──────────────┐      ┌─────────────┐
│Observability │◄─────┤HealthMonitor│ (Background)
│   Service    │      │   Service   │
└──────┬───────┘      └─────────────┘
       │ 3. Poll health endpoints
       │ 4. Collect metrics
       │ 5. Cache results
       ▼
┌──────────────┐
│ Cache Service│
│ (Redis/Mem)  │
└──────┬───────┘
       │ 6. Serve cached data
       ▼
┌──────────────┐
│ API Endpoint │
└──────────────┘
```

## API Endpoints

All endpoints return JSON responses and include OpenAPI/Swagger documentation accessible at `/api-docs`.

### Services API

**Base Path:** `/api/services`

#### List All Services
```http
GET /api/services
```

Returns a list of all registered ORION services with health status.

**Response:**
```json
{
  "services": [
    {
      "serviceName": "auth",
      "status": "healthy",
      "host": "localhost",
      "port": 20001,
      "url": "http://localhost:20001",
      "startedAt": "2025-01-15T10:00:00.000Z",
      "lastCheck": "2025-01-15T10:30:00.000Z",
      "responseTime": 45
    }
  ],
  "total": 18,
  "healthy": 16,
  "degraded": 1,
  "unhealthy": 0,
  "unknown": 1,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

#### Get Service Details
```http
GET /api/services/:serviceName?timeRange=60
```

Returns comprehensive information about a specific service including health, metrics, and recent events.

**Parameters:**
- `serviceName` (path): Name of the service (e.g., `auth`)
- `timeRange` (query, optional): Time range for metrics in minutes (default: 60)

**Response:**
```json
{
  "serviceName": "auth",
  "health": {
    "serviceName": "auth",
    "status": "healthy",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "database": {
        "status": "connected",
        "latency": 12
      },
      "redis": {
        "status": "connected"
      }
    },
    "metrics": {
      "memory": {
        "used": 128,
        "total": 256,
        "percentage": 50
      }
    },
    "url": "http://localhost:20001"
  },
  "metrics": { /* ... */ },
  "recentEvents": [ /* ... */ ],
  "lastUpdated": "2025-01-15T10:30:00.000Z"
}
```

---

#### Get Service Health
```http
GET /api/services/:serviceName/health
```

Returns detailed health information for a specific service.

**Response:**
```json
{
  "serviceName": "auth",
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "connected",
      "latency": 12
    },
    "redis": {
      "status": "connected"
    }
  },
  "metrics": {
    "memory": {
      "used": 128,
      "total": 256,
      "percentage": 50
    },
    "cpu": {
      "usage": 25
    }
  },
  "url": "http://localhost:20001"
}
```

---

#### Get Service Metrics
```http
GET /api/services/:serviceName/metrics?timeRange=60
```

Returns performance metrics for a specific service.

**Parameters:**
- `timeRange` (query, optional): Time range in minutes (default: 60)

**Response:**
```json
{
  "serviceName": "auth",
  "requests": {
    "total": 12540,
    "success": 11980,
    "clientErrors": 450,
    "serverErrors": 110,
    "avgResponseTime": 45,
    "p95ResponseTime": 120,
    "p99ResponseTime": 250,
    "requestsPerSecond": 3.5
  },
  "resources": {
    "memoryUsage": 128,
    "memoryLimit": 1024,
    "cpuUsage": 25.5,
    "heapUsed": 128,
    "heapTotal": 256,
    "external": 12,
    "eventLoopLag": 2.3
  },
  "database": {
    "activeConnections": 10,
    "idleConnections": 5,
    "queriesExecuted": 50000,
    "avgQueryTime": 8.5,
    "slowQueries": 15
  },
  "cache": {
    "hits": 8500,
    "misses": 1500,
    "hitRate": 85.0,
    "keys": 2500,
    "memoryUsed": 64
  },
  "topEndpoints": [
    {
      "path": "/api/auth/login",
      "method": "POST",
      "count": 3500,
      "avgResponseTime": 35,
      "errors": 50,
      "errorRate": 1.43
    }
  ],
  "timestamp": "2025-01-15T10:30:00.000Z",
  "timeRange": 60
}
```

---

#### Get Service Events
```http
GET /api/services/:serviceName/events?limit=100
```

Returns recent events for a specific service.

**Parameters:**
- `limit` (query, optional): Maximum events to return (default: 100)

**Response:**
```json
[
  {
    "id": "evt-123",
    "level": "info",
    "category": "service",
    "serviceName": "auth",
    "message": "User authentication successful",
    "timestamp": "2025-01-15T10:29:00.000Z",
    "metadata": {
      "method": "jwt"
    },
    "userId": "user-123"
  }
]
```

---

### Events API

**Base Path:** `/api/events`

#### Query Events
```http
GET /api/events?limit=100&offset=0&level=error&category=security&serviceName=auth&startTime=2025-01-15T00:00:00Z&endTime=2025-01-15T23:59:59Z
```

Query events with flexible filtering and pagination.

**Query Parameters:**
- `limit` (optional): Max events to return (1-1000, default: 100)
- `offset` (optional): Number of events to skip (default: 0)
- `level` (optional): Filter by level (`info`, `warn`, `error`, `critical`)
- `category` (optional): Filter by category (`system`, `service`, `security`, `deployment`, `performance`, `user`)
- `serviceName` (optional): Filter by service name
- `startTime` (optional): Filter events after this time (ISO 8601)
- `endTime` (optional): Filter events before this time (ISO 8601)

**Response:**
```json
{
  "events": [ /* array of events */ ],
  "total": 250,
  "count": 100,
  "offset": 0,
  "limit": 100,
  "hasMore": true
}
```

---

#### Get Recent Events
```http
GET /api/events/recent?limit=100
```

Returns the most recent system events.

---

#### Get Critical Events
```http
GET /api/events/critical?limit=50
```

Returns events with CRITICAL or ERROR severity level.

---

#### Get Event Statistics
```http
GET /api/events/stats
```

Returns aggregated event statistics.

**Response:**
```json
{
  "total": 10000,
  "byLevel": {
    "info": 8500,
    "warn": 1200,
    "error": 250,
    "critical": 50
  },
  "byCategory": {
    "system": 2000,
    "service": 5000,
    "security": 1500,
    "deployment": 500,
    "performance": 800,
    "user": 200
  },
  "byService": {
    "auth": 3500,
    "gateway": 2000,
    "orchestrator": 1500
  }
}
```

---

### System API

**Base Path:** `/api/system`

#### Get System Statistics
```http
GET /api/system/stats?timeRange=60
```

Returns aggregate statistics across all services.

**Parameters:**
- `timeRange` (query, optional): Time range in minutes (default: 60, max: 10080)

**Response:**
```json
{
  "services": {
    "total": 18,
    "running": 17,
    "healthy": 16,
    "degraded": 1,
    "unhealthy": 0,
    "unknown": 1
  },
  "requests": {
    "total": 125430,
    "requestsPerSecond": 34.84,
    "avgResponseTime": 45.3,
    "successRate": 97.5,
    "errorRate": 2.5
  },
  "resources": {
    "totalMemoryUsed": 2048,
    "avgMemoryPerService": 120.5,
    "avgCpuUsage": 35.7,
    "totalDatabaseConnections": 85,
    "cacheHitRate": 82.5
  },
  "errors": {
    "total": 350,
    "critical": 15,
    "serverErrors": 105,
    "clientErrors": 245,
    "errorRate": 0.097
  },
  "uptime": {
    "systemUptime": 86400,
    "avgServiceUptime": 43200,
    "oldestServiceUptime": 86400
  },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "timeRange": 60
}
```

---

#### Get System Overview
```http
GET /api/system/overview
```

Returns a high-level system overview for dashboards.

**Response:**
```json
{
  "overallHealth": "healthy",
  "totalServices": 18,
  "healthyServices": 16,
  "degradedServices": 1,
  "unhealthyServices": 0,
  "unknownServices": 1,
  "keyMetrics": {
    "totalRequests": 125430,
    "avgResponseTime": 45.3,
    "errorRate": 2.5,
    "totalMemoryUsed": 2048,
    "avgCpuUsage": 35.7
  },
  "uptime": {
    "systemUptime": 86400,
    "avgServiceUptime": 43200
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

#### Get Health Summary
```http
GET /api/system/health/summary
```

Returns a quick health summary (fast endpoint for monitoring).

**Response:**
```json
{
  "overall": "healthy",
  "services": {
    "total": 18,
    "running": 17,
    "healthy": 16,
    "degraded": 1,
    "unhealthy": 0,
    "unknown": 1
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

#### Get Cache Statistics
```http
GET /api/system/cache/stats
```

Returns cache layer statistics.

**Response:**
```json
{
  "redisAvailable": true,
  "inMemoryCacheSize": 0,
  "cacheType": "redis"
}
```

---

### Legacy Observability API

**Base Path:** `/api`

These endpoints are maintained for backward compatibility.

- `GET /api/services` - Same as `/api/services`
- `GET /api/services/:serviceName/health` - Same as `/api/services/:serviceName/health`
- `GET /api/services/:serviceName/metrics` - Same as `/api/services/:serviceName/metrics`
- `GET /api/events` - Same as `/api/events`
- `GET /api/stats` - Same as `/api/system/stats`
- `GET /api/health/summary` - Same as `/api/system/health/summary`

---

## Data Models

### Service Status Enum
```typescript
enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}
```

### Event Level Enum
```typescript
enum EventLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

### Event Category Enum
```typescript
enum EventCategory {
  SYSTEM = 'system',
  SERVICE = 'service',
  SECURITY = 'security',
  DEPLOYMENT = 'deployment',
  PERFORMANCE = 'performance',
  USER = 'user'
}
```

---

## Configuration

Configure observability behavior via environment variables:

### Cache Settings
```bash
# Cache TTL in seconds
OBSERVABILITY_CACHE_HEALTH_TTL=30        # Default: 30
OBSERVABILITY_CACHE_METRICS_TTL=60       # Default: 60
OBSERVABILITY_CACHE_STATS_TTL=60         # Default: 60
OBSERVABILITY_CACHE_SERVICES_TTL=30      # Default: 30
```

### Health Monitor Settings
```bash
# Background health monitoring
HEALTH_MONITOR_ENABLED=true              # Default: true
HEALTH_MONITOR_INTERVAL_MS=30000         # Default: 30000 (30s)
HEALTH_MONITOR_STARTUP_DELAY_MS=10000    # Default: 10000 (10s)
```

### HTTP Settings
```bash
# HTTP client configuration
OBSERVABILITY_HTTP_TIMEOUT_MS=5000       # Default: 5000 (5s)
OBSERVABILITY_HTTP_RETRIES=0             # Default: 0
```

### Event Settings
```bash
# Event storage configuration
OBSERVABILITY_MAX_EVENTS=10000           # Default: 10000
OBSERVABILITY_EVENTS_DEFAULT_LIMIT=100   # Default: 100
OBSERVABILITY_EVENTS_MAX_LIMIT=1000      # Default: 1000
```

### Metrics Settings
```bash
# Metrics collection configuration
OBSERVABILITY_METRICS_DEFAULT_RANGE=60   # Default: 60 (minutes)
OBSERVABILITY_METRICS_MAX_RANGE=10080    # Default: 10080 (1 week)
```

---

## Background Services

### Health Monitor Service

The `HealthMonitorService` runs background health checks on all registered services:

- **Interval**: Configurable via `HEALTH_MONITOR_INTERVAL_MS` (default: 30s)
- **Features**:
  - Detects service status changes
  - Generates alerts for degraded/unhealthy services
  - Logs health events automatically
  - Maintains health state history

**Startup Behavior:**
- Delays startup by `HEALTH_MONITOR_STARTUP_DELAY_MS` (default: 10s) to allow services to initialize
- Runs first check immediately after startup delay
- Continues periodic checks based on configured interval

**Alerts:**
- **CRITICAL**: Service becomes unhealthy
- **WARN**: Service becomes degraded
- **INFO**: Service becomes healthy

---

## Caching Strategy

The observability API uses a two-tier caching strategy:

### Primary Cache: Redis
- Shared across multiple admin-ui instances
- Persistent cache for distributed deployments
- Automatic TTL-based expiration

### Fallback Cache: In-Memory
- Used when Redis is unavailable
- Per-instance cache
- Automatic cleanup of expired entries

### Cache Keys
- `observability:services:list` - Services list
- `observability:health:{serviceName}` - Service health
- `metrics:service:{serviceName}:{timeRange}` - Service metrics
- `stats:system:{timeRange}` - System statistics

### Cache Invalidation
- Automatic expiration via TTL
- Manual invalidation via admin endpoints (if implemented)

---

## Error Handling

All endpoints return structured error responses:

```json
{
  "statusCode": 500,
  "message": "Failed to retrieve services list",
  "error": "Internal Server Error",
  "details": "Connection timeout" // Only in development
}
```

### HTTP Status Codes
- `200 OK` - Successful request
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Service not found
- `500 Internal Server Error` - Server error

### Error Messages
- Production: Generic error messages
- Development: Detailed error information in `details` field

---

## Integration Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:20000/api',
  timeout: 5000,
});

// Get all services
const services = await apiClient.get('/services');

// Get specific service details
const authDetails = await apiClient.get('/services/auth', {
  params: { timeRange: 120 }
});

// Query events
const events = await apiClient.get('/events', {
  params: {
    level: 'error',
    serviceName: 'auth',
    limit: 50
  }
});

// Get system overview
const overview = await apiClient.get('/system/overview');
```

### cURL
```bash
# List all services
curl http://localhost:20000/api/services

# Get service health
curl http://localhost:20000/api/services/auth/health

# Query events
curl "http://localhost:20000/api/events?level=error&limit=50"

# Get system stats
curl "http://localhost:20000/api/system/stats?timeRange=120"
```

---

## OpenAPI/Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:20000/api-docs
```

The Swagger UI provides:
- Interactive endpoint testing
- Request/response schemas
- Parameter descriptions
- Example responses

---

## Best Practices

1. **Use appropriate time ranges**: Start with default 60 minutes, adjust as needed
2. **Implement pagination**: Use `limit` and `offset` for large event queries
3. **Cache responses**: Client-side caching recommended for frequently accessed data
4. **Monitor cache stats**: Check `/api/system/cache/stats` to ensure Redis is available
5. **Set up alerts**: Use event webhooks or polling `/api/events/critical` for alerts
6. **Use health summary**: For monitoring tools, use `/api/system/health/summary` for fast checks

---

## Troubleshooting

### Services not appearing
- Check if Redis is running and accessible
- Verify services are registering with PortRegistry
- Check `REDIS_HOST` and `REDIS_PORT` environment variables

### Slow response times
- Verify Redis connection (check `/api/system/cache/stats`)
- Adjust cache TTL values
- Reduce `timeRange` parameter for metrics/stats queries

### Missing metrics
- Services may not implement metrics endpoints
- Synthetic metrics are generated as fallback
- Check service logs for metrics collection errors

### Events not logging
- Verify EventsService is properly initialized
- Check in-memory event buffer size (`OBSERVABILITY_MAX_EVENTS`)
- Events are in-memory only (consider external log aggregation for production)

---

## Future Enhancements

Planned features:
- [ ] Server-Sent Events (SSE) for real-time updates
- [ ] WebSocket support for live monitoring
- [ ] Alerting rules and notifications
- [ ] Metrics export (Prometheus format)
- [ ] Event persistence to database
- [ ] Custom dashboard configurations
- [ ] Service dependency mapping
- [ ] Historical trend analysis
- [ ] Performance profiling endpoints
- [ ] Distributed tracing integration

---

## Support

For issues, questions, or contributions:
- Create an issue in the ORION repository
- Contact the platform team
- Check the main ORION documentation
