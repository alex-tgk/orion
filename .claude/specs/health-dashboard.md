# Health Dashboard Specification

## Overview
Real-time health monitoring dashboard for the ORION microservices platform providing comprehensive visibility into service health, dependencies, uptime metrics, and alert status.

## Features

### 1. Real-time Service Health Display
- Live status indicators for all microservices
- Color-coded health states (healthy, degraded, unhealthy, unknown)
- Service uptime percentage and availability metrics
- Last health check timestamp
- Auto-refresh with configurable intervals (5s, 10s, 30s, 60s)

### 2. Service Dependency Graph Visualization
- Visual representation of service dependencies using react-flow
- Interactive node-based graph showing service relationships
- Color-coded nodes based on health status
- Click-to-expand service details
- Zoom and pan capabilities
- Auto-layout with hierarchical or force-directed algorithms

### 3. Historical Uptime Metrics
- 24-hour, 7-day, 30-day uptime charts
- Service availability percentage over time
- Incident history and downtime periods
- SLA compliance tracking
- Comparative uptime across services

### 4. Alert Status Display
- Active alerts count and severity
- Alert timeline and history
- Filtering by service, severity, and time range
- Alert acknowledgment and resolution tracking
- Integration with notification system

## Technical Architecture

### Frontend Components

#### Pages
- **HealthDashboardPage** (`packages/admin-ui/src/frontend/pages/HealthDashboard/`)
  - Main dashboard layout with grid system
  - Real-time data fetching using React Query
  - WebSocket integration for live updates
  - Responsive design with Tailwind CSS

#### Components
- **ServiceHealthCard** - Individual service health display
- **DependencyGraph** - Interactive service dependency visualization
- **UptimeChart** - Time-series uptime visualization
- **AlertBadge** - Alert status indicator
- **HealthSummary** - Overall system health overview
- **ServiceDetailsModal** - Detailed service information

### Backend Endpoints

#### Health Controller (`packages/admin-ui/src/app/controllers/health.controller.ts`)

```typescript
GET /api/health/overview
- Returns: SystemHealthOverview
- Description: Aggregated health status of all services

GET /api/health/services
- Returns: ServiceHealth[]
- Description: Individual health status for each service

GET /api/health/history/:serviceName
- Query: timeRange (24h, 7d, 30d)
- Returns: HealthHistoryData[]
- Description: Historical health data for a service

GET /api/health/dependencies
- Returns: ServiceDependencyGraph
- Description: Service dependency relationships

GET /api/health/alerts
- Query: severity, status, timeRange
- Returns: Alert[]
- Description: Active and historical alerts
```

#### WebSocket Events (Gateway)

```typescript
// Client subscribes to health updates
socket.emit('health:subscribe', { services: ['gateway', 'auth', 'user'] })

// Server broadcasts health changes
socket.on('health:update', (data: ServiceHealthUpdate) => {})

// Server broadcasts new alerts
socket.on('health:alert', (alert: Alert) => {})
```

## Data Models

### ServiceHealth
```typescript
interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: number; // percentage
  lastCheckTimestamp: string;
  responseTime: number; // ms
  version: string;
  dependencies: string[];
  checks: HealthCheck[];
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  timestamp: string;
}
```

### SystemHealthOverview
```typescript
interface SystemHealthOverview {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  activeAlerts: number;
  criticalAlerts: number;
  timestamp: string;
}
```

### ServiceDependencyGraph
```typescript
interface ServiceDependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

interface DependencyNode {
  id: string;
  serviceName: string;
  status: ServiceStatus;
  type: 'service' | 'database' | 'external';
  position?: { x: number; y: number };
}

interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  type: 'sync' | 'async' | 'data';
}
```

### Alert
```typescript
interface Alert {
  id: string;
  serviceName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  resolvedAt?: string;
}
```

## UI/UX Requirements

### Layout
- Grid-based dashboard with configurable widgets
- Responsive breakpoints: mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
- Dark mode support
- Accessibility: WCAG 2.1 AA compliance

### Color Scheme
- Healthy: Green (#10B981)
- Degraded: Yellow (#F59E0B)
- Unhealthy: Red (#EF4444)
- Unknown: Gray (#6B7280)

### Interactions
- Hover states on service cards show detailed metrics
- Click on service opens detailed modal
- Drag-and-drop to rearrange dashboard widgets
- Keyboard navigation support

### Performance
- Lazy loading for historical data
- Virtual scrolling for large service lists
- Optimized re-renders with React.memo
- Debounced real-time updates (max 1 update per second)

## Testing Requirements

### Unit Tests
- Component rendering with different health states
- Hook functionality (useHealthData, useWebSocket)
- Utility functions (health aggregation, status calculation)

### Integration Tests
- WebSocket connection and message handling
- API endpoint integration
- Real-time update flow

### E2E Tests (Playwright)
- Dashboard loads with service data
- Alert notifications appear
- Service filtering and search
- Dependency graph interaction

## Storybook Stories

### ServiceHealthCard
- All health states (healthy, degraded, unhealthy, unknown)
- With and without alerts
- Loading state
- Error state

### DependencyGraph
- Small graph (3-5 services)
- Medium graph (10-15 services)
- Large graph (30+ services)
- Different layout algorithms

### UptimeChart
- 24-hour view
- 7-day view
- 30-day view
- With downtime periods

## Implementation Phases

### Phase 1: Barebone (Functional)
- Basic dashboard layout
- Service health cards with real data
- API integration
- WebSocket connection
- Basic dependency graph

### Phase 2: Pretty (Styled)
- Tailwind CSS styling
- Color scheme implementation
- Consistent spacing and typography
- Loading and error states
- Responsive layout

### Phase 3: Polish (Optimized)
- Animations and transitions
- Advanced dependency graph features
- Performance optimizations
- Accessibility enhancements
- Comprehensive error handling

## Dependencies

```json
{
  "react-flow-renderer": "^10.3.17",
  "recharts": "^2.10.3",
  "@tanstack/react-query": "^5.62.16",
  "socket.io-client": "^4.8.1",
  "date-fns": "^3.0.0",
  "clsx": "^2.1.0"
}
```

## Monitoring and Metrics

### Dashboard Metrics
- Dashboard load time
- WebSocket connection stability
- Data refresh rate
- User interactions (clicks, filters)

### Health Check Metrics
- Check frequency
- Response time distribution
- Failure rate by service
- Alert generation rate

## Security Considerations

- Authentication required for dashboard access
- Role-based access control for sensitive operations
- Rate limiting on health check endpoints
- Secure WebSocket connections (WSS)
- XSS prevention in alert messages

## Future Enhancements

- Custom dashboard layouts (save user preferences)
- Advanced alerting rules and thresholds
- Integration with PagerDuty/OpsGenie
- Mobile app for on-call monitoring
- AI-powered anomaly detection
- Multi-region health aggregation
