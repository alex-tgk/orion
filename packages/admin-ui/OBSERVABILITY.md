# ORION Admin UI - Observability & Monitoring System

## Overview

The ORION Admin UI provides a comprehensive observability and monitoring API backend for the entire ORION microservices platform. This system enables real-time health monitoring, metrics collection, event logging, and system statistics aggregation across all services.

## Architecture

### Components

```
packages/admin-ui/src/app/
├── controllers/
│   └── observability.controller.ts    # API endpoints
├── services/
│   ├── observability.service.ts       # Service discovery & health aggregation
│   ├── metrics.service.ts             # Metrics collection & aggregation
│   ├── events.service.ts              # Event logging & activity tracking
│   ├── stats.service.ts               # System statistics aggregation
│   └── cache.service.ts               # Redis/in-memory caching
├── dto/
│   ├── service-health.dto.ts          # Health-related DTOs
│   ├── service-metrics.dto.ts         # Metrics-related DTOs
│   ├── system-events.dto.ts           # Event-related DTOs
│   └── system-stats.dto.ts            # Statistics-related DTOs
└── observability.module.ts            # Module configuration
```

### Design Principles

1. **Graceful Degradation**: Services continue operating even if dependencies (Redis, other services) are unavailable
2. **Caching Strategy**: Automatic Redis fallback to in-memory cache for resilience
3. **Service Discovery**: Automatic detection of available services via Port Registry
4. **Extensibility**: Easy to add new data sources and metrics types
5. **Structured Logging**: Consistent logging patterns across all services
6. **Dependency Injection**: Proper NestJS DI for testability and maintainability

## API Endpoints

### 1. List All Services
```
GET /api/services
```

Returns a list of all registered ORION services with their current health status.

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
  "total": 19,
  "healthy": 15,
  "degraded": 2,
  "unhealthy": 1,
  "unknown": 1,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Caching:** 30 seconds

### 2. Get Service Health
```
GET /api/services/:serviceName/health
```

Returns detailed health information for a specific service.

**Parameters:**
- `serviceName` (path): Name of the service (e.g., "auth", "gateway")

**Response:**
```json
{
  "serviceName": "auth",
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "database": {
      "status": "connected",
      "latency": 15
    },
    "redis": {
      "status": "connected"
    }
  },
  "metrics": {
    "memory": {
      "used": 128,
      "total": 512,
      "percentage": 25
    },
    "cpu": {
      "usage": 350
    }
  },
  "url": "http://localhost:20001"
}
```

**Caching:** 30 seconds

### 3. Get Service Metrics
```
GET /api/services/:serviceName/metrics?timeRange=60
```

Returns detailed metrics for a specific service.

**Parameters:**
- `serviceName` (path): Name of the service
- `timeRange` (query, optional): Time range in minutes (default: 60)

**Response:**
```json
{
  "serviceName": "auth",
  "requests": {
    "total": 5000,
    "success": 4800,
    "clientErrors": 150,
    "serverErrors": 50,
    "avgResponseTime": 45,
    "p95ResponseTime": 120,
    "p99ResponseTime": 250,
    "requestsPerSecond": 1.39
  },
  "resources": {
    "memoryUsage": 256,
    "memoryLimit": 1024,
    "cpuUsage": 35.5,
    "heapUsed": 256,
    "heapTotal": 300,
    "external": 25,
    "eventLoopLag": 5.2
  },
  "database": {
    "activeConnections": 15,
    "idleConnections": 10,
    "queriesExecuted": 25000,
    "avgQueryTime": 12.5,
    "slowQueries": 5
  },
  "cache": {
    "hits": 8000,
    "misses": 2000,
    "hitRate": 80,
    "keys": 3500,
    "memoryUsed": 128
  },
  "topEndpoints": [
    {
      "path": "/api/auth/login",
      "method": "POST",
      "count": 1500,
      "avgResponseTime": 55,
      "errors": 25,
      "errorRate": 1.67
    }
  ],
  "timestamp": "2025-01-15T10:30:00.000Z",
  "timeRange": 60
}
```

**Caching:** 60 seconds

### 4. Get System Events
```
GET /api/events?limit=100&level=error&category=service
```

Returns system events and activity logs with filtering.

**Query Parameters:**
- `limit` (optional): Maximum events to return (1-1000, default: 100)
- `offset` (optional): Pagination offset (default: 0)
- `level` (optional): Filter by level (info, warn, error, critical)
- `category` (optional): Filter by category (system, service, security, deployment, performance, user)
- `serviceName` (optional): Filter by service name
- `startTime` (optional): ISO timestamp for start time
- `endTime` (optional): ISO timestamp for end time

**Response:**
```json
{
  "events": [
    {
      "id": "uuid-v4",
      "level": "error",
      "category": "service",
      "serviceName": "cache",
      "message": "Redis connection failed, falling back to in-memory cache",
      "timestamp": "2025-01-15T10:25:00.000Z",
      "metadata": {
        "error": "ECONNREFUSED"
      }
    }
  ],
  "total": 1500,
  "count": 100,
  "offset": 0,
  "limit": 100,
  "hasMore": true
}
```

### 5. Get System Statistics
```
GET /api/stats?timeRange=60
```

Returns aggregate statistics across all services.

**Query Parameters:**
- `timeRange` (optional): Time range in minutes (default: 60)

**Response:**
```json
{
  "services": {
    "total": 19,
    "running": 18,
    "healthy": 15,
    "degraded": 2,
    "unhealthy": 1,
    "unknown": 1
  },
  "requests": {
    "total": 50000,
    "requestsPerSecond": 13.89,
    "avgResponseTime": 65,
    "successRate": 96.5,
    "errorRate": 3.5
  },
  "resources": {
    "totalMemoryUsed": 4096,
    "avgMemoryPerService": 227.56,
    "avgCpuUsage": 42.3,
    "totalDatabaseConnections": 150,
    "cacheHitRate": 82.5
  },
  "errors": {
    "total": 1750,
    "critical": 5,
    "serverErrors": 525,
    "clientErrors": 1225,
    "errorRate": 0.49
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

**Caching:** 60 seconds

### 6. Get Health Summary
```
GET /api/health/summary
```

Returns a quick overview of system health.

**Response:**
```json
{
  "overall": "healthy",
  "services": {
    "total": 19,
    "running": 18,
    "healthy": 15,
    "degraded": 2,
    "unhealthy": 1,
    "unknown": 1
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Extending the Observability System

### Adding New Metrics

To add a new metric type to service metrics:

1. **Update the DTO** (`dto/service-metrics.dto.ts`):
```typescript
export class CustomMetricsDto {
  @ApiProperty({ description: 'Your metric description' })
  myMetric: number;
}

export class ServiceMetricsDto {
  // ... existing fields
  
  @ApiProperty({ type: CustomMetricsDto, required: false })
  custom?: CustomMetricsDto;
}
```

2. **Update MetricsService** (`services/metrics.service.ts`):
```typescript
private generateSyntheticMetrics(serviceName: string, timeRange: number): ServiceMetricsDto {
  // ... existing code
  
  const custom: CustomMetricsDto = {
    myMetric: calculateMyMetric(),
  };
  
  return {
    // ... existing fields
    custom,
  };
}
```

### Adding New Event Categories

1. **Update the enum** (`dto/system-events.dto.ts`):
```typescript
export enum EventCategory {
  // ... existing categories
  CUSTOM = 'custom',
}
```

2. **Log events** from any service:
```typescript
@Injectable()
export class MyService {
  constructor(private readonly eventsService: EventsService) {}
  
  someMethod() {
    this.eventsService.logEvent(
      EventLevel.INFO,
      EventCategory.CUSTOM,
      'my-service',
      'Custom event occurred',
      { customData: 'value' },
    );
  }
}
```

### Adding New Data Sources

To integrate a new data source (e.g., external monitoring system):

1. **Create a new service**:
```typescript
// services/external-monitor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ExternalMonitorService {
  private readonly logger = new Logger(ExternalMonitorService.name);
  
  async fetchExternalMetrics(serviceName: string): Promise<any> {
    try {
      const response = await axios.get(`https://monitor.example.com/metrics/${serviceName}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch external metrics', error);
      return null;
    }
  }
}
```

2. **Register in module**:
```typescript
@Module({
  providers: [
    // ... existing providers
    ExternalMonitorService,
  ],
  exports: [
    // ... existing exports
    ExternalMonitorService,
  ],
})
export class ObservabilityModule {}
```

3. **Use in existing services**:
```typescript
@Injectable()
export class MetricsService {
  constructor(
    private readonly externalMonitor: ExternalMonitorService,
  ) {}
  
  async getServiceMetrics(serviceName: string): Promise<ServiceMetricsDto> {
    const externalData = await this.externalMonitor.fetchExternalMetrics(serviceName);
    // Merge with existing metrics
  }
}
```

### Customizing Cache Strategy

The cache service automatically falls back from Redis to in-memory storage. You can customize:

1. **Cache TTL** (Time To Live):
```typescript
// Set custom TTL for specific data
await this.cacheService.set(key, value, { ttl: 300 }); // 5 minutes
```

2. **Cache invalidation patterns**:
```typescript
// Clear specific pattern
await this.cacheService.clear('metrics:*');

// Clear all cache
await this.cacheService.clear();
```

3. **Custom cache key strategy**:
```typescript
// Use consistent key naming
const cacheKey = `namespace:type:identifier:${params}`;
```

### Implementing Service-Specific Health Checks

Services should implement their own `/api/health` endpoint. The observability service will automatically discover and aggregate them.

**Example service health endpoint:**
```typescript
@Controller('api')
export class MyServiceController {
  @Get('health')
  async getHealth(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: { status: 'connected', latency: 15 },
        redis: { status: 'connected' },
      },
      metrics: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: 25,
        },
      },
    };
  }
}
```

### Real-Time Event Streaming

For real-time event updates, you can extend the EventsService with WebSocket support:

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer()
  server: Server;
  
  emitEvent(event: SystemEventDto) {
    this.server.emit('system-event', event);
  }
}
```

## Integration with Services

### Service Discovery

The observability service uses the ORION Port Registry for automatic service discovery:

1. Services register themselves on startup
2. Admin UI polls the registry to discover available services
3. Health checks are performed against registered services
4. Unavailable services are marked as "unknown"

### Known Services

The system is aware of all ORION services:
- auth
- gateway
- orchestrator
- ai-interface
- mcp-server
- cache
- config
- logger
- analytics
- notifications
- webhooks
- search
- storage
- audit
- scheduler
- secrets
- vector-db
- migrations
- admin-ui

## Production Considerations

### Event Storage

The current implementation stores events in memory (circular buffer of 10,000 events). For production:

1. **Integrate with time-series database:**
   - InfluxDB
   - TimescaleDB
   - Prometheus

2. **Use log aggregation:**
   - ELK Stack (Elasticsearch, Logstash, Kibana)
   - Grafana Loki
   - Splunk

3. **Message queue for events:**
   - RabbitMQ
   - Apache Kafka
   - Redis Streams

### Metrics Collection

Current metrics are either:
- Fetched from service `/api/metrics` endpoints
- Generated synthetically if unavailable

For production:
- Implement Prometheus exporters in each service
- Use OpenTelemetry for distributed tracing
- Collect metrics in dedicated time-series database

### Scaling Considerations

1. **Caching:** Redis cluster for distributed caching
2. **Rate limiting:** Add rate limiting to prevent metric collection overload
3. **Batch processing:** Aggregate metrics in batches rather than real-time
4. **Async processing:** Use message queues for async metric collection

## API Documentation

Interactive API documentation is available via Swagger UI:

```
http://localhost:{port}/api/docs
```

The documentation includes:
- Complete API reference
- Request/response schemas
- Try-it-out functionality
- Example requests and responses

## Testing

### Running Tests
```bash
# Unit tests
nx test admin-ui

# E2E tests
nx e2e admin-ui-e2e

# Test coverage
nx test admin-ui --coverage
```

### Example Test
```typescript
describe('ObservabilityService', () => {
  let service: ObservabilityService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ObservabilityService, /* mock providers */],
    }).compile();
    
    service = module.get<ObservabilityService>(ObservabilityService);
  });
  
  it('should discover services', async () => {
    const services = await service.discoverServices();
    expect(services).toBeDefined();
    expect(Array.isArray(services)).toBe(true);
  });
});
```

## Troubleshooting

### Services Not Appearing

1. Check if service is registered in Port Registry
2. Verify service health endpoint is accessible
3. Check network connectivity
4. Review service logs

### High Response Times

1. Check cache hit rates
2. Verify Redis connection
3. Review service health
4. Check network latency

### Missing Metrics

1. Verify service implements `/api/metrics` endpoint
2. Check metric collection errors in logs
3. Verify timeRange parameter
4. Check cache expiration

## Future Enhancements

- [ ] Real-time WebSocket event streaming
- [ ] Custom alerting rules and notifications
- [ ] Historical data visualization
- [ ] Distributed tracing integration
- [ ] Custom dashboard builder
- [ ] Advanced analytics and ML-based anomaly detection
- [ ] Service dependency graph visualization
- [ ] Performance benchmarking and comparison
