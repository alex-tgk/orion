# Analytics Service

Comprehensive analytics and metrics tracking service for the ORION platform.

## Overview

The Analytics Service provides:
- **Event Tracking**: Collect and store user actions and system events
- **Metrics Collection**: Track counters, gauges, histograms, and summaries
- **User Analytics**: Engagement scores, retention metrics, activity patterns
- **Service Performance**: Latency, throughput, error rates
- **Cost Tracking**: Resource usage and cost metrics
- **Dashboard APIs**: Aggregated data for analytics dashboards
- **RabbitMQ Integration**: Automatic event consumption from other services

## Features

### 1. Event Tracking
- Track custom events with rich metadata
- Bulk event tracking
- Event categorization (user actions, system events, errors, performance)
- Tag-based filtering
- Automatic timestamp and processing time tracking

### 2. Metrics System
- **Counter**: Monotonically increasing values (e.g., total requests)
- **Gauge**: Values that can go up or down (e.g., active users)
- **Histogram**: Distribution of values (e.g., request latency)
- **Summary**: Statistical summary with percentiles

### 3. User Analytics
- Total events and sessions per user
- Days active and streak tracking
- Feature usage patterns
- Peak usage time analysis
- Engagement scoring (0-100)
- Retention risk assessment
- Activity timelines

### 4. Aggregations
- Pre-computed metrics by period (hourly, daily, weekly, monthly, yearly)
- Multiple aggregation types (SUM, AVG, MIN, MAX, COUNT, percentiles)
- Optimized for dashboard queries

### 5. Dashboard API
- Comprehensive summary metrics
- Top events with trend analysis
- User activity timelines
- Service performance metrics
- Cost breakdowns

## API Endpoints

### Event Endpoints
```
POST   /api/events             # Track a single event
POST   /api/events/bulk        # Track multiple events
GET    /api/events/top         # Get top events by count
```

### Metric Endpoints
```
GET    /api/metrics            # Query metrics with filters
GET    /api/metrics/:name/stats # Get metric statistics
```

### Aggregation Endpoints
```
GET    /api/aggregations       # Query aggregated metrics
```

### Dashboard Endpoints
```
GET    /api/dashboard          # Get dashboard data
```

### User Analytics Endpoints
```
GET    /api/users/:userId/analytics    # Get user analytics
GET    /api/users/:userId/activity     # Get user activity timeline
GET    /api/users/:userId/engagement   # Get user engagement metrics
POST   /api/users/:userId/analytics/refresh # Refresh user analytics
```

### Health Endpoints
```
GET    /api/health            # Health check
GET    /api/ready             # Readiness check
```

## Database Schema

The service uses **Prisma** with PostgreSQL for data persistence:

### Core Models
- **Event**: Individual event records with metadata
- **Metric**: Metric data points with labels
- **Aggregation**: Pre-computed aggregated metrics
- **UserAnalytics**: User-specific analytics summaries
- **ServiceMetrics**: Service performance metrics
- **CostMetric**: Cost tracking data

### Indexes
Comprehensive indexes on:
- Timestamps for time-range queries
- User IDs for user-specific analytics
- Service IDs for service-specific metrics
- Event names for event-based queries
- Tags for tag-based filtering

## Event Consumers

The service automatically consumes events from RabbitMQ:
- User events (user.created, user.updated, etc.)
- Auth events (login, logout, etc.)
- Performance events (api.request, etc.)
- Error events (error.occurred, etc.)

## Configuration

### Environment Variables

```env
# Service
PORT=3004
NODE_ENV=development

# Database
ANALYTICS_DATABASE_URL=postgresql://orion:password@localhost:5432/orion_analytics
DB_POOL_MIN=2
DB_POOL_MAX=20

# RabbitMQ
RABBITMQ_URL=amqp://orion:password@localhost:5672
RABBITMQ_EVENTS_EXCHANGE=orion.events
RABBITMQ_ANALYTICS_QUEUE=analytics.events

# Redis (Caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=2
CACHE_TTL=3600

# Retention
EVENTS_RETENTION_DAYS=90
METRICS_RETENTION_DAYS=365
AGGREGATIONS_RETENTION_DAYS=730

# Aggregation
AGGREGATION_ENABLED=true
AGGREGATION_SCHEDULE=0 0 * * *  # Daily at midnight
```

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate --schema=packages/analytics/prisma/schema.prisma
```

### 3. Run Database Migrations
```bash
npx prisma migrate dev --schema=packages/analytics/prisma/schema.prisma
```

### 4. Run Tests
```bash
npx nx test analytics --coverage
```

### 5. Build the Service
```bash
npx nx build analytics
```

### 6. Run the Service
```bash
npx nx serve analytics
```

## Testing

The service includes comprehensive test coverage (80%+):

### Test Files
- `analytics.controller.spec.ts` - Controller tests
- `event.service.spec.ts` - Event service tests
- `user-analytics.service.spec.ts` - User analytics tests
- `dashboard.service.spec.ts` - Dashboard service tests
- `health.service.spec.ts` - Health service tests
- `event.consumer.spec.ts` - Event consumer tests

### Run Tests
```bash
# Run all tests
npx nx test analytics

# Run tests with coverage
npx nx test analytics --coverage

# Run tests in watch mode
npx nx test analytics --watch
```

## Architecture

### Service Layer
```
┌─────────────────────────────────────────┐
│         Analytics Controller            │
│  (HTTP API Endpoints)                   │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼──────┐    ┌────▼──────────┐
│ Services │    │   Consumers   │
│          │    │  (RabbitMQ)   │
└────┬─────┘    └───────┬───────┘
     │                  │
     └──────────┬───────┘
                │
        ┌───────▼───────┐
        │  Prisma ORM   │
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │  PostgreSQL   │
        └───────────────┘
```

### Services
- **EventService**: Event tracking and retrieval
- **MetricService**: Metric collection and querying
- **AggregationService**: Metric aggregation and pre-computation
- **UserAnalyticsService**: User-specific analytics and engagement
- **DashboardService**: Dashboard data aggregation
- **HealthService**: Health and readiness checks
- **PrismaService**: Database connection management

### Event Consumers
- **EventConsumer**: Generic event processing
- Handles user, auth, performance, and error events
- Automatically updates user analytics
- Records metrics for all events

## Usage Examples

### Track a Custom Event
```typescript
POST /api/events
{
  "eventName": "button.click",
  "eventType": "USER_ACTION",
  "userId": "user-123",
  "properties": {
    "buttonId": "submit-form",
    "page": "/checkout"
  },
  "tags": ["conversion", "checkout"]
}
```

### Query Metrics
```typescript
GET /api/metrics?name=api.requests&serviceId=user-service&startDate=2024-01-01&endDate=2024-01-31
```

### Get User Analytics
```typescript
GET /api/users/user-123/analytics
```

### Get Dashboard Data
```typescript
GET /api/dashboard?startDate=2024-01-01&endDate=2024-01-31
```

## Performance Considerations

1. **Indexing**: All time-based and frequently queried fields are indexed
2. **Aggregations**: Pre-computed aggregations reduce query time
3. **Retention Policies**: Automatic cleanup of old data
4. **Connection Pooling**: Optimized database connection pool
5. **Caching**: Redis caching for frequently accessed data

## Monitoring

### Health Checks
- `/api/health` - Overall service health
- `/api/ready` - Readiness for traffic

### Metrics to Monitor
- Event processing latency
- Database query performance
- RabbitMQ consumer lag
- Memory usage
- Error rates

## Future Enhancements

- [ ] Real-time analytics streaming
- [ ] Machine learning-based anomaly detection
- [ ] Advanced cohort analysis
- [ ] Funnel analytics
- [ ] A/B test analytics integration
- [ ] Data export functionality
- [ ] Custom dashboard builder
- [ ] Alerting system

## License

Part of the ORION platform.
