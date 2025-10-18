# Health Dashboard & Metrics Viewer Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    React Application                        │   │
│  │                                                             │   │
│  │  ┌──────────────────┐      ┌──────────────────┐          │   │
│  │  │ HealthDashboard  │      │ MetricsViewer    │          │   │
│  │  │  Page            │      │  Page            │          │   │
│  │  └────────┬─────────┘      └────────┬─────────┘          │   │
│  │           │                          │                     │   │
│  │           │                          │                     │   │
│  │  ┌────────▼──────────────────────────▼─────────┐          │   │
│  │  │         React Query Cache Layer             │          │   │
│  │  │   (useHealthData, useMetrics hooks)         │          │   │
│  │  └────────┬──────────────────────────┬─────────┘          │   │
│  │           │                          │                     │   │
│  │  ┌────────▼─────────┐      ┌────────▼─────────┐          │   │
│  │  │ ServiceHealthCard│      │  MetricChart     │          │   │
│  │  │ DependencyGraph  │      │  QueryBuilder    │          │   │
│  │  │ AlertBadge       │      │  ChartControls   │          │   │
│  │  │ UptimeChart      │      │  AlertRuleEditor │          │   │
│  │  └──────────────────┘      └──────────────────┘          │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────┬─────────────────────────────────┬────────────────────┘
               │                                 │
               │ HTTP/REST                       │ WebSocket
               │ (axios)                         │ (socket.io-client)
               │                                 │
┌──────────────▼─────────────────────────────────▼────────────────────┐
│                     ADMIN-UI BACKEND (NestJS)                        │
│                          Port 3100                                   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                      Controllers                            │   │
│  │  ┌──────────────────┐      ┌──────────────────┐          │   │
│  │  │ HealthController │      │ MetricsController│          │   │
│  │  │  /api/health/*   │      │  /api/metrics/*  │          │   │
│  │  └────────┬─────────┘      └────────┬─────────┘          │   │
│  └───────────┼──────────────────────────┼─────────────────────┘   │
│              │                          │                           │
│  ┌───────────▼──────────────────────────▼─────────────────────┐   │
│  │                       Services Layer                        │   │
│  │  ┌─────────────────┐  ┌─────────────┐  ┌──────────────┐  │   │
│  │  │HealthAggregation│  │MetricsService│  │AlertService  │  │   │
│  │  │    Service      │  │             │  │              │  │   │
│  │  └────────┬────────┘  └──────┬──────┘  └──────┬───────┘  │   │
│  │           │                  │                 │           │   │
│  │  ┌────────▼────────┐  ┌──────▼──────┐  ┌──────▼───────┐  │   │
│  │  │ServiceDiscovery │  │CacheService │  │StatsService  │  │   │
│  │  │    Service      │  │             │  │              │  │   │
│  │  └─────────────────┘  └─────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              WebSocket Gateway (/health namespace)          │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │         HealthEventsGateway                          │ │   │
│  │  │  • health:subscribe                                  │ │   │
│  │  │  • health:update                                     │ │   │
│  │  │  • health:alert                                      │ │   │
│  │  │  • alerts:counts                                     │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────┬────────────────────────────────┬─────────────────────────┘
           │                                │
           │ HTTP Health Checks             │ Prometheus Queries
           │                                │ (Future)
           │                                │
┌──────────▼────────────────────────────────▼─────────────────────────┐
│                    ORION MICROSERVICES                               │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Gateway  │  │   Auth   │  │   User   │  │  Notifications   │  │
│  │ :3000    │  │  :3001   │  │  :3002   │  │      :3003       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────────────┘  │
│       │             │             │             │                   │
│       │   /health   │   /health   │   /health   │   /health        │
│       │   /metrics  │   /metrics  │   /metrics  │   /metrics       │
│       │             │             │             │                   │
│  ┌────▼─────────────▼─────────────▼─────────────▼─────────────┐  │
│  │              Shared Infrastructure                           │  │
│  │  • PostgreSQL Database                                       │  │
│  │  • Redis Cache                                               │  │
│  │  • RabbitMQ Message Queue                                    │  │
│  │  • Prometheus (Metrics Storage)                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### Health Dashboard Real-time Updates

```
┌──────────┐     1. Connect      ┌───────────────────┐
│  Client  │─────────────────────▶│ HealthEventsGW    │
│ (Browser)│                      │ (WebSocket)       │
└────┬─────┘                      └─────────┬─────────┘
     │                                      │
     │ 2. Subscribe to health updates       │
     │ { services: ['gateway', 'auth'] }    │
     ├──────────────────────────────────────▶
     │                                      │
     │                            3. Start interval
     │                            Query services every 5s
     │                                      │
     │                              ┌───────▼────────┐
     │                              │HealthAggregation│
     │                              │   Service      │
     │                              └───────┬────────┘
     │                                      │
     │                            4. Check service health
     │                                      │
     │                              ┌───────▼────────┐
     │                              │ServiceDiscovery│
     │                              └───────┬────────┘
     │                                      │
     │                              5. HTTP GET /health
     │                                      │
┌────▼─────┐                        ┌───────▼────────┐
│ Gateway  │◀───────────────────────│  HTTP Request  │
│ Service  │                        └────────────────┘
└──────────┘                                │
     │                                      │
     │ 6. Health response                   │
     │ { status: 'healthy', ... }           │
     └──────────────────────────────────────▶
                                            │
                                 7. Aggregate results
                                            │
     ┌──────────────────────────────────────┘
     │ 8. Emit health:update:batch
     │ { services: [...], timestamp }
     │
┌────▼─────┐
│  Client  │  9. Update UI
│ (Browser)│     React Query invalidates cache
└──────────┘     Components re-render
```

### Metrics Query Flow

```
┌──────────┐  1. User selects      ┌─────────────┐
│  Client  │     metric query      │MetricsViewer│
│          │  'Request Rate'       │    Page     │
└────┬─────┘                       └──────┬──────┘
     │                                    │
     │ 2. Execute query via React Query   │
     │    useQuery(['metrics', 'query'])  │
     ├────────────────────────────────────▶
     │                                    │
     │               3. GET /api/metrics/query
     │               ?promql=rate(http_requests_total[5m])
     │                                    │
     │                            ┌───────▼────────┐
     │                            │MetricsController│
     │                            └───────┬────────┘
     │                                    │
     │                            4. Parse PromQL
     │                                    │
     │                            ┌───────▼────────┐
     │                            │MetricsService  │
     │                            └───────┬────────┘
     │                                    │
     │                            5. Query Prometheus
     │                               (or mock)
     │                                    │
     │                            ┌───────▼────────┐
     │                            │  Prometheus    │
     │                            │    Server      │
     │                            └───────┬────────┘
     │                                    │
     │ 6. Return time-series data         │
     │    { resultType: 'matrix',         │
     │      result: [...] }               │
     ◀────────────────────────────────────┘
     │
     │ 7. Transform to chart format
     │    { timestamp, value }[]
     │
┌────▼─────┐
│MetricChart│  8. Render chart
│ Component │     using recharts
└───────────┘
```

## Data Models

### Health Check Data Model

```
ServiceHealth {
  serviceName: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  uptime: number (percentage)
  lastCheckTimestamp: ISO 8601 string
  responseTime: number (milliseconds)
  version: string
  dependencies: string[]
  checks: HealthCheck[] {
    name: string
    status: 'pass' | 'warn' | 'fail'
    message?: string
    timestamp: ISO 8601 string
    responseTime?: number
  }
  error?: string
}
```

### Metrics Data Model

```
MetricQueryResult {
  status: 'success' | 'error'
  data: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string'
    result: MetricResult[] {
      metric: Record<string, string> (labels)
      values?: [timestamp, value][] (time-series)
      value?: [timestamp, value] (instant)
    }
  }
  error?: string
  warnings?: string[]
}
```

### Alert Data Model

```
Alert {
  id: string
  serviceName: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: ISO 8601 string
  status: 'active' | 'acknowledged' | 'resolved'
  acknowledgedBy?: string
  resolvedAt?: ISO 8601 string
  metadata?: Record<string, any>
}
```

## Technology Stack Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│ React 19 │ TypeScript │ Tailwind CSS │ React Query         │
│ Recharts │ React Flow │ Socket.io Client │ date-fns       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
├─────────────────────────────────────────────────────────────┤
│            NestJS Controllers & WebSocket Gateway            │
│   /api/health/*  │  /api/metrics/*  │  /health (WS)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│ HealthAggregationService │ MetricsService │ AlertService    │
│ ServiceDiscoveryService  │ CacheService   │ StatsService    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
├─────────────────────────────────────────────────────────────┤
│ In-Memory Cache │ Service Registry │ HTTP Client (Axios)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services Layer                   │
├─────────────────────────────────────────────────────────────┤
│ Microservices (/health, /metrics) │ Prometheus (Future)     │
└─────────────────────────────────────────────────────────────┘
```

## File Organization

```
admin-ui/
├── src/
│   ├── app/ (Backend - NestJS)
│   │   ├── dto/                    # Data Transfer Objects
│   │   ├── services/               # Business Logic
│   │   ├── controllers/            # HTTP Endpoints
│   │   └── gateways/               # WebSocket Handlers
│   │
│   └── frontend/ (Frontend - React)
│       ├── types/                  # TypeScript Definitions
│       ├── hooks/                  # Custom React Hooks
│       ├── components/             # Reusable Components
│       │   ├── health/
│       │   └── metrics/
│       └── pages/                  # Page Components
│           ├── HealthDashboard/
│           └── MetricsViewer/
│
├── .claude/specs/                  # Technical Specifications
├── __tests__/                      # Test Files
└── .storybook/                     # Storybook Configuration
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Production                           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   Admin-UI  │  │   Gateway   │  │    Auth     │
    │   :3100     │  │   :3000     │  │   :3001     │
    └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
           │                │                │
           └────────────────┼────────────────┘
                           │
                ┌──────────▼──────────┐
                │   Load Balancer     │
                │   (Nginx/Traefik)   │
                └─────────────────────┘
```

This architecture provides:
- ✅ Real-time monitoring
- ✅ Scalable microservices
- ✅ Efficient caching
- ✅ WebSocket communication
- ✅ Clean separation of concerns
- ✅ Type-safe APIs
- ✅ Comprehensive testing
