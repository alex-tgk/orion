# Admin UI Service - Specification

**Status:** Draft
**Version:** 1.0.0
**Created:** 2025-10-18
**Owner:** Platform Team

---

## Overview

The Admin UI service provides a comprehensive administrative interface for the ORION platform. It combines a REST API for observability data with a real-time WebSocket gateway and a React-based frontend featuring an extensible widget system.

## Goals

1. Provide real-time visibility into all ORION microservices
2. Enable dynamic extension through a plugin-based widget system
3. Deliver comprehensive observability through 13 REST endpoints
4. Support real-time updates via WebSocket connections
5. Maintain 100% test coverage with TDD approach

## Non-Goals

- User-facing customer interfaces (handled by other services)
- Direct database manipulation (uses service APIs)
- Authentication/Authorization implementation (delegates to auth service)

---

## Technical Architecture

### Service Type
**Backend:** NestJS TypeScript service
**Frontend:** React 18+ with TypeScript
**Communication:** REST API + WebSocket (Socket.IO)
**Port:** 3006 (REST), 3007 (WebSocket)

### Key Dependencies
- `@nestjs/platform-express` - REST API
- `@nestjs/websockets` - WebSocket gateway
- `@nestjs/platform-socket.io` - Socket.IO adapter
- `react` & `react-dom` - Frontend framework
- `socket.io-client` - Frontend WebSocket client
- `@orion/shared` - Shared types and utilities

---

## API Specification

### REST Endpoints (13 total)

#### System Endpoints
1. **GET /health** - Health check endpoint
   - Response: `{ status: 'ok', timestamp: string }`

2. **GET /api/system/overview** - System-wide overview
   - Response: `SystemOverviewDto`
   - Includes: service count, uptime, version, environment

3. **GET /api/system/stats** - System statistics
   - Response: `SystemStatsDto`
   - Includes: CPU, memory, request counts, error rates

#### Service Endpoints
4. **GET /api/services** - List all services
   - Response: `ServiceHealthDto[]`
   - Includes: name, status, uptime, version

5. **GET /api/services/:id** - Get service details
   - Response: `ServiceDetailsDto`
   - Includes: health, metrics, configuration, dependencies

6. **GET /api/services/:id/metrics** - Get service metrics
   - Response: `ServiceMetricsDto`
   - Includes: response times, throughput, error rates

7. **GET /api/services/:id/health** - Get service health
   - Response: `ServiceHealthDto`

#### Events Endpoints
8. **GET /api/events** - List recent events
   - Query: `?limit=50&offset=0&severity=info|warn|error`
   - Response: `SystemEventsDto`

9. **GET /api/events/:id** - Get event details
   - Response: `SystemEventDto`

10. **POST /api/events/search** - Search events
    - Body: `{ query: string, filters: object }`
    - Response: `SystemEventsDto`

#### Observability Endpoints
11. **GET /api/observability/alerts** - Active alerts
    - Response: `AlertDto[]`

12. **GET /api/observability/metrics** - Platform-wide metrics
    - Query: `?timeRange=1h|24h|7d&metric=cpu|memory|requests`
    - Response: `MetricsDto`

13. **GET /api/observability/traces** - Distributed traces
    - Query: `?limit=100&service=name`
    - Response: `TracesDto`

### WebSocket Events

#### Server → Client
- `system:update` - System stats update (every 5s)
- `service:health` - Service health change
- `service:metrics` - Service metrics update
- `event:created` - New event created
- `alert:triggered` - New alert triggered
- `alert:resolved` - Alert resolved

#### Client → Server
- `subscribe:system` - Subscribe to system updates
- `subscribe:service` - Subscribe to specific service
- `subscribe:events` - Subscribe to event stream
- `unsubscribe:*` - Unsubscribe from channels

---

## Data Transfer Objects (DTOs)

### SystemOverviewDto
```typescript
{
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  downServices: number;
  platformUptime: number;
  version: string;
  environment: 'development' | 'staging' | 'production';
  timestamp: string;
}
```

### SystemStatsDto
```typescript
{
  cpu: { usage: number; cores: number };
  memory: { used: number; total: number; percentage: number };
  requests: { total: number; perSecond: number };
  errors: { total: number; rate: number };
  timestamp: string;
}
```

### ServiceHealthDto
```typescript
{
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  uptime: number;
  version: string;
  lastCheck: string;
  responseTime: number;
}
```

### ServiceDetailsDto
```typescript
{
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  health: {
    uptime: number;
    responseTime: number;
    lastCheck: string;
  };
  metrics: {
    requestCount: number;
    errorRate: number;
    averageResponseTime: number;
  };
  configuration: Record<string, any>;
  dependencies: string[];
  endpoints: string[];
}
```

### ServiceMetricsDto
```typescript
{
  serviceId: string;
  timeRange: string;
  metrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
  };
  timeSeries: Array<{
    timestamp: string;
    value: number;
  }>;
}
```

### SystemEventsDto
```typescript
{
  events: SystemEventDto[];
  total: number;
  limit: number;
  offset: number;
}
```

### SystemEventDto
```typescript
{
  id: string;
  type: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  source: string;
  timestamp: string;
  metadata: Record<string, any>;
}
```

---

## Widget System

### Widget Interface
```typescript
interface Widget {
  id: string;
  name: string;
  version: string;
  component: React.ComponentType<WidgetProps>;
  dataEndpoint?: string;
  wsEvents?: string[];
  config?: WidgetConfig;
}
```

### Core Widgets (Phase 1)
1. **System Overview Widget** - High-level platform status
2. **Services Status Widget** - Grid of service health cards
3. **Recent Activity Widget** - Event stream
4. **Quick Stats Widget** - Key metrics dashboard

### Widget Extension Points
- Custom data sources (REST endpoints)
- WebSocket event subscriptions
- Configuration schemas
- Styling/theming
- Refresh intervals

---

## Testing Requirements

### Unit Tests (Target: 80%+ coverage)
- All services must have unit tests
- All controllers must have unit tests
- All DTOs must have validation tests
- All utilities must have unit tests

### Integration Tests (Target: 70%+ coverage)
- REST API endpoint tests
- WebSocket gateway tests
- Widget data flow tests
- Error handling tests

### E2E Tests (Critical Paths)
- Complete user journeys
- Real-time update flows
- Widget loading and rendering
- Error scenarios

### Test Structure
```
src/
  app/
    controllers/
      __tests__/
        system.controller.spec.ts
        services.controller.spec.ts
        events.controller.spec.ts
    services/
      __tests__/
        observability.service.spec.ts
        metrics.service.spec.ts
    gateways/
      __tests__/
        admin-events.gateway.spec.ts
  frontend/
    components/
      __tests__/
        DashboardLayout.test.tsx
    widgets/
      __tests__/
        SystemOverviewWidget.test.tsx
```

---

## Acceptance Criteria

### Phase 1: Core API & WebSocket (Week 1)
- [ ] All 13 REST endpoints implemented and documented
- [ ] WebSocket gateway with all defined events
- [ ] All DTOs defined with class-validator decorators
- [ ] Health check endpoint operational
- [ ] Unit tests for all services and controllers
- [ ] Integration tests for API endpoints
- [ ] OpenAPI/Swagger documentation generated

### Phase 2: Frontend Foundation (Week 2)
- [ ] React application builds successfully
- [ ] Webpack configuration for dev and prod
- [ ] Basic dashboard layout with routing
- [ ] WebSocket client connection established
- [ ] API client service implemented
- [ ] Error boundary and loading states

### Phase 3: Widget System (Week 3)
- [ ] Widget registry and plugin system
- [ ] All 4 core widgets implemented
- [ ] Widget configuration system
- [ ] Real-time data updates via WebSocket
- [ ] Widget tests (unit and integration)
- [ ] Documentation for widget development

### Phase 4: Polish & Documentation (Week 4)
- [ ] 100% test coverage achieved
- [ ] E2E tests for critical paths
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Complete API documentation
- [ ] Widget development guide
- [ ] Deployment documentation

---

## Security Considerations

1. **Authentication**
   - JWT validation on all endpoints
   - WebSocket connection authentication
   - Delegate to @orion/auth service

2. **Authorization**
   - Role-based access control (RBAC)
   - Admin-only access enforcement
   - Audit logging of admin actions

3. **Data Protection**
   - Sensitive data masking in logs
   - Rate limiting on API endpoints
   - CORS configuration
   - Input validation and sanitization

---

## Performance Requirements

1. **API Response Times**
   - Health check: < 50ms
   - System overview: < 200ms
   - Service details: < 300ms
   - Events list: < 500ms

2. **WebSocket**
   - Connection establishment: < 1s
   - Event delivery: < 100ms
   - Maximum concurrent connections: 1000

3. **Frontend**
   - First Contentful Paint: < 1.5s
   - Time to Interactive: < 3s
   - Widget load time: < 500ms

---

## Deployment

### Environment Variables
```
NODE_ENV=production
PORT=3006
WS_PORT=3007
AUTH_SERVICE_URL=http://auth:3001
GATEWAY_URL=http://gateway:3000
LOG_LEVEL=info
CORS_ORIGIN=https://admin.orion.io
```

### Health Checks
- REST: `GET /health`
- Liveness: Service responds to requests
- Readiness: Dependencies accessible

### Monitoring
- Prometheus metrics endpoint
- Structured JSON logging
- Distributed tracing with OpenTelemetry

---

## Migration & Rollout

### Phase 1: Development
- Build in feature branch
- Deploy to dev environment
- Internal testing and validation

### Phase 2: Staging
- Deploy to staging environment
- Load testing and performance validation
- Security scanning

### Phase 3: Production
- Gradual rollout with feature flags
- Monitor metrics and error rates
- Rollback plan documented

---

## Open Questions

1. Should we support custom themes/branding?
2. Do we need user preferences persistence?
3. What's the retention policy for events and metrics?
4. Should we implement export functionality (CSV/JSON)?
5. Do we need mobile responsive design?

---

## Success Metrics

1. **Reliability**
   - 99.9% uptime
   - < 0.1% error rate
   - Zero data loss

2. **Performance**
   - All endpoints meet response time SLAs
   - Real-time updates delivered within 100ms
   - Frontend meets Core Web Vitals

3. **Quality**
   - 100% test coverage
   - Zero critical security vulnerabilities
   - Accessibility score > 90

4. **Developer Experience**
   - Widget development time < 4 hours
   - Documentation completeness score > 95%
   - Onboarding time < 1 day

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [ORION Architecture Overview](../docs/architecture.md)
- [Widget Development Guide](./admin-ui-widgets.md)
