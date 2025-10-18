# ORION Admin UI - Quick Start Guide

## Overview

The Admin UI service provides a comprehensive observability and monitoring API for the entire ORION platform.

## Running the Service

```bash
# Start the admin-ui service
nx serve admin-ui

# Or run all services
pnpm dev
```

The service will:
1. Automatically allocate a port from the range 20000-29999
2. Register itself in the ORION service registry
3. Start serving API endpoints
4. Expose Swagger documentation

## API Documentation

Once running, access the interactive API documentation:

```
http://localhost:{PORT}/api/docs
```

Replace `{PORT}` with the allocated port shown in the startup logs.

## Quick API Reference

### Get All Services Status
```bash
curl http://localhost:{PORT}/api/services
```

### Get Specific Service Health
```bash
curl http://localhost:{PORT}/api/services/auth/health
```

### Get Service Metrics
```bash
curl http://localhost:{PORT}/api/services/auth/metrics?timeRange=60
```

### Get System Events
```bash
# Get all recent events
curl http://localhost:{PORT}/api/events

# Get only errors
curl http://localhost:{PORT}/api/events?level=error

# Get events from specific service
curl http://localhost:{PORT}/api/events?serviceName=auth
```

### Get System Statistics
```bash
curl http://localhost:{PORT}/api/stats?timeRange=60
```

### Get Health Summary
```bash
curl http://localhost:{PORT}/api/health/summary
```

## Key Features

### 1. Service Discovery
Automatically discovers all running ORION services via the Port Registry.

### 2. Health Monitoring
- Polls service health endpoints every 30 seconds
- Caches results for performance
- Gracefully handles unavailable services

### 3. Metrics Collection
- Collects metrics from service endpoints
- Generates synthetic metrics if service doesn't provide them
- Aggregates metrics across all services

### 4. Event Logging
- Maintains in-memory event log (last 10,000 events)
- Supports filtering by level, category, service, and time
- Real-time event tracking

### 5. System Statistics
- Aggregates data across all services
- Provides high-level system overview
- Tracks uptime, errors, and resource usage

### 6. Caching Strategy
- Automatic Redis fallback to in-memory cache
- Configurable TTL per data type
- Pattern-based cache invalidation

## Environment Variables

```bash
# Redis configuration (optional, falls back to in-memory)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1

# Service configuration
NODE_ENV=development
PORT=20000  # Optional, auto-allocated if not set

# CORS
CORS_ORIGIN=http://localhost:4200
```

## Testing

```bash
# Run unit tests
nx test admin-ui

# Run with coverage
nx test admin-ui --coverage

# Run in watch mode
nx test admin-ui --watch
```

## File Structure

```
packages/admin-ui/src/app/
├── controllers/
│   └── observability.controller.ts    # API endpoints
├── services/
│   ├── observability.service.ts       # Service discovery & health
│   ├── metrics.service.ts             # Metrics collection
│   ├── events.service.ts              # Event logging
│   ├── stats.service.ts               # Statistics aggregation
│   └── cache.service.ts               # Caching layer
├── dto/
│   ├── service-health.dto.ts          # Health DTOs
│   ├── service-metrics.dto.ts         # Metrics DTOs
│   ├── system-events.dto.ts           # Events DTOs
│   └── system-stats.dto.ts            # Stats DTOs
├── observability.module.ts            # Module configuration
└── app.module.ts                      # Main module
```

## Common Tasks

### Adding a New Metric Type

1. Update the DTO in `dto/service-metrics.dto.ts`
2. Update the MetricsService to collect/generate the metric
3. Update API documentation

### Adding a New Event Category

1. Add category to enum in `dto/system-events.dto.ts`
2. Use the EventsService to log events with the new category

### Customizing Cache Duration

```typescript
// In any service
await this.cacheService.set(key, value, { ttl: 300 }); // 5 minutes
```

### Clearing Cache

```typescript
// Clear all observability cache
await this.observabilityService.clearHealthCache();
await this.metricsService.clearMetricsCache();
await this.statsService.clearStatsCache();

// Or clear specific pattern
await this.cacheService.clear('metrics:*');
```

## Integration Examples

### Fetching Data in Frontend

```typescript
// TypeScript/React example
async function fetchServices() {
  const response = await fetch('http://localhost:20000/api/services');
  const data: ServicesListDto = await response.json();
  return data;
}

async function fetchServiceHealth(serviceName: string) {
  const response = await fetch(
    `http://localhost:20000/api/services/${serviceName}/health`
  );
  const data: ServiceHealthDto = await response.json();
  return data;
}
```

### Using WebSocket for Real-Time Updates

```typescript
// Example implementation (requires WebSocket gateway)
const socket = io('http://localhost:20000');

socket.on('system-event', (event: SystemEventDto) => {
  console.log('New event:', event);
});
```

## Troubleshooting

### Port Allocation Fails
- Check if Redis is running (optional but recommended)
- Verify port range 20000-29999 is not blocked
- Check logs for specific error messages

### Services Not Appearing
- Ensure services are running
- Verify services are registered in Port Registry
- Check service health endpoints are accessible

### High Response Times
- Check Redis connection status
- Verify cache hit rates
- Review service health and network latency

### Missing Metrics
- Verify service implements `/api/metrics` endpoint
- Check service logs for errors
- Ensure service is registered and healthy

## Next Steps

- Read the full [OBSERVABILITY.md](./OBSERVABILITY.md) documentation
- Explore the Swagger API docs
- Integrate with your frontend application
- Customize metrics and events for your use case

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Review the Swagger documentation
3. Consult the OBSERVABILITY.md guide
4. Check service health endpoints
