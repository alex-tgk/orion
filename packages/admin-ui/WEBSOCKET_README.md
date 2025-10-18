# WebSocket Real-time Updates - ORION Admin UI

This document describes the WebSocket implementation for real-time updates in the ORION Admin UI.

## Overview

The WebSocket implementation provides real-time communication between the admin dashboard and backend services, enabling live monitoring of:

- **Service Health**: Real-time status of all microservices
- **System Events**: Live stream of system activities and events
- **Metrics**: Performance metrics and statistics
- **Alerts**: Critical notifications and warnings

## Architecture

### Backend Components

#### 1. **WebSocket Gateway** (`AdminEventsGateway`)
- Location: `/packages/admin-ui/src/app/gateways/admin-events.gateway.ts`
- Namespace: `/admin`
- Features:
  - JWT authentication for all connections
  - Subscription-based event distribution
  - Room-based broadcasting for efficient message delivery
  - Comprehensive event handlers for all event types

#### 2. **Authentication Guard** (`WsJwtGuard`)
- Location: `/packages/admin-ui/src/app/guards/ws-jwt.guard.ts`
- Validates JWT tokens from:
  - Authorization header (`Bearer <token>`)
  - Connection auth object
  - Query parameters
- Attaches authenticated user to socket connection

#### 3. **Subscription Manager** (`SubscriptionManagerService`)
- Location: `/packages/admin-ui/src/app/services/subscription-manager.service.ts`
- Manages client subscriptions
- Provides efficient filtering and routing
- Tracks subscription statistics

#### 4. **Event Emitter Service** (`AdminEventEmitterService`)
- Location: `/packages/admin-ui/src/app/services/event-emitter.service.ts`
- Bridges application events to WebSocket broadcasts
- Convenience methods for common event types
- Integrates with NestJS EventEmitter2

#### 5. **Event Listener** (`AdminEventListener`)
- Location: `/packages/admin-ui/src/app/listeners/admin-event.listener.ts`
- Listens to internal events and broadcasts via WebSocket
- Connects EventEmitter2 to WebSocket gateway

### Frontend Components

#### React Hooks

All hooks are located in `/packages/admin-ui/src/app/hooks/`

##### 1. **useWebSocket**
Main hook for managing WebSocket connection.

```typescript
const {
  socket,
  connectionState,
  isConnected,
  isAuthenticated,
  error,
  connect,
  disconnect,
  reconnect,
} = useWebSocket({
  url: 'http://localhost:20001',
  namespace: '/admin',
  token: 'your-jwt-token',
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  onError: (error) => console.error(error),
});
```

Features:
- Automatic reconnection with exponential backoff
- Connection state management
- Authentication handling
- Error recovery

##### 2. **useServiceHealth**
Subscribe to service health updates.

```typescript
const {
  services,           // Map<string, ServiceHealth>
  getService,         // Get specific service
  isLoading,
  subscribe,
  unsubscribe,
  refresh,
} = useServiceHealth({
  socket,
  serviceName: 'auth', // Optional: specific service
  autoSubscribe: true,
});
```

##### 3. **useSystemEvents**
Subscribe to system events stream.

```typescript
const {
  events,              // Array of SystemEvent
  latestEvent,         // Most recent event
  isLoading,
  subscribe,
  unsubscribe,
  refresh,
  clearEvents,
  getEventsByService,
  getEventsByType,
} = useSystemEvents({
  socket,
  autoSubscribe: true,
  maxEvents: 1000,     // Max events to keep in memory
  filters: {
    types: [SystemEventType.SERVICE_ERROR],
    severities: ['error', 'critical'],
    serviceNames: ['auth', 'admin-ui'],
  },
});
```

##### 4. **useMetrics**
Subscribe to service metrics.

```typescript
const {
  metrics,            // Map<string, ServiceMetrics>
  getMetrics,         // Get metrics for specific service
  isLoading,
  subscribe,
  unsubscribe,
  refresh,
} = useMetrics({
  socket,
  serviceName: 'auth', // Optional: specific service
  autoSubscribe: true,
});
```

##### 5. **useAlerts**
Subscribe to alerts and manage alert resolution.

```typescript
const {
  alerts,              // All alerts
  unresolvedAlerts,    // Only unresolved
  latestAlert,         // Most recent alert
  isLoading,
  subscribe,
  unsubscribe,
  refresh,
  resolveAlert,
  getAlertsByService,
  getAlertsBySeverity,
} = useAlerts({
  socket,
  autoSubscribe: true,
  filters: {
    resolved: false,
    severities: [AlertSeverity.HIGH, AlertSeverity.CRITICAL],
  },
});
```

## Event Types

### Client-to-Server Events

```typescript
interface ClientToServerEvents {
  // Subscriptions
  'subscribe:service-health': (serviceName?: string) => void;
  'unsubscribe:service-health': (serviceName?: string) => void;
  'subscribe:system-events': (filters?: EventFilters) => void;
  'unsubscribe:system-events': () => void;
  'subscribe:metrics': (serviceName?: string) => void;
  'unsubscribe:metrics': (serviceName?: string) => void;
  'subscribe:alerts': (filters?: AlertFilters) => void;
  'unsubscribe:alerts': () => void;

  // Requests
  'request:service-health': (serviceName?: string) => void;
  'request:system-events': (filters?: EventFilters) => void;
  'request:metrics': (serviceName: string, timeRange?: TimeRange) => void;
  'request:alerts': (filters?: AlertFilters) => void;

  // Actions
  'resolve-alert': (alertId: string) => void;
}
```

### Server-to-Client Events

```typescript
interface ServerToClientEvents {
  // Health
  'service-health:update': (data: ServiceHealth) => void;
  'service-health:list': (data: ServiceHealth[]) => void;

  // Events
  'system-event': (event: SystemEvent) => void;
  'system-events:list': (events: SystemEvent[]) => void;

  // Metrics
  'metrics:update': (metrics: ServiceMetrics) => void;

  // Alerts
  'alert:new': (alert: Alert) => void;
  'alert:updated': (alert: Alert) => void;
  'alert:resolved': (alertId: string) => void;
  'alerts:list': (alerts: Alert[]) => void;

  // Connection
  'connection:authenticated': (userId: string) => void;
  'connection:error': (error: WebSocketError) => void;

  // Subscriptions
  'subscription:confirmed': (subscription: SubscriptionInfo) => void;
  'subscription:removed': (subscription: SubscriptionInfo) => void;
}
```

## Type Definitions

### ServiceHealth

```typescript
interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'down';
  port: number;
  lastHeartbeat: Date;
  uptime: number;
  responseTime?: number;
  metadata?: Record<string, unknown>;
}
```

### SystemEvent

```typescript
interface SystemEvent {
  id: string;
  type: SystemEventType;
  serviceName: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
}
```

### Alert

```typescript
interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  serviceName: string;
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}
```

## Usage Examples

### Basic Dashboard

```typescript
import React from 'react';
import { useWebSocket, useServiceHealth, useSystemEvents } from '../hooks';

function Dashboard() {
  const token = localStorage.getItem('access_token');

  // Connect to WebSocket
  const { socket, isAuthenticated } = useWebSocket({
    url: 'http://localhost:20001',
    token,
  });

  // Subscribe to service health
  const { services } = useServiceHealth({ socket });

  // Subscribe to events
  const { events } = useSystemEvents({ socket, maxEvents: 50 });

  if (!isAuthenticated) return <div>Connecting...</div>;

  return (
    <div>
      <h1>Services: {services.size}</h1>
      <h2>Recent Events: {events.length}</h2>
    </div>
  );
}
```

### Monitoring Specific Service

```typescript
function AuthServiceMonitor() {
  const { socket } = useWebSocket({ url: 'http://localhost:20001', token });

  const { getService } = useServiceHealth({
    socket,
    serviceName: 'auth',
  });

  const authService = getService('auth');

  return (
    <div>
      <h2>Auth Service</h2>
      <p>Status: {authService?.status}</p>
      <p>Uptime: {authService?.uptime}s</p>
    </div>
  );
}
```

### Alert Dashboard

```typescript
function AlertsDashboard() {
  const { socket } = useWebSocket({ url: 'http://localhost:20001', token });

  const { unresolvedAlerts, resolveAlert } = useAlerts({
    socket,
    filters: { resolved: false },
  });

  return (
    <div>
      <h2>Active Alerts ({unresolvedAlerts.length})</h2>
      {unresolvedAlerts.map(alert => (
        <div key={alert.id}>
          <h3>{alert.title}</h3>
          <p>{alert.description}</p>
          <button onClick={() => resolveAlert(alert.id)}>
            Resolve
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Emitting Events from Services

Other services can emit events that will be broadcast to the admin dashboard:

```typescript
import { AdminEventEmitterService } from '@orion/admin-ui';

@Injectable()
class MyService {
  constructor(
    private readonly eventEmitter: AdminEventEmitterService,
  ) {}

  async doSomething() {
    // Emit service started event
    this.eventEmitter.serviceStarted('my-service', 20002);

    // Emit custom system event
    this.eventEmitter.emitSystemEvent({
      type: SystemEventType.SERVICE_ERROR,
      serviceName: 'my-service',
      severity: 'error',
      message: 'Something went wrong',
    });

    // Emit an alert
    this.eventEmitter.emitAlert({
      type: AlertType.HIGH_ERROR_RATE,
      severity: AlertSeverity.HIGH,
      serviceName: 'my-service',
      title: 'High Error Rate Detected',
      description: 'Error rate exceeded 5%',
      resolved: false,
    });

    // Emit service health update
    this.eventEmitter.emitServiceHealthUpdate({
      serviceName: 'my-service',
      status: ServiceStatus.DEGRADED,
      port: 20002,
      lastHeartbeat: new Date(),
      uptime: 3600,
      responseTime: 250,
    });
  }
}
```

## Connection Flow

1. **Client connects** with JWT token
2. **Server authenticates** using WsJwtGuard
3. **Client receives** `connection:authenticated` event
4. **Client subscribes** to desired event types
5. **Server confirms** subscriptions
6. **Server broadcasts** events to subscribed clients
7. **Client receives** real-time updates
8. **On disconnect**, server cleans up subscriptions

## Error Handling

All hooks include built-in error handling:

- Connection errors trigger reconnection attempts
- Invalid tokens are rejected at connection time
- Subscription errors are logged
- Network issues trigger automatic reconnection

## Performance Considerations

### Efficient Broadcasting

- Uses Socket.IO rooms for targeted message delivery
- Only sends events to subscribed clients
- Filters are applied server-side to reduce bandwidth

### Memory Management

- Events are limited to configurable maximum
- Older events are automatically purged
- Metrics use rolling windows

### Scalability

- Supports multiple concurrent connections
- Subscription-based filtering reduces overhead
- Event batching for high-frequency updates

## Security

- All connections require JWT authentication
- User context is attached to socket
- Authorization can be enforced per-subscription
- Tokens are validated on connection and periodically

## Configuration

Environment variables:

```bash
# WebSocket configuration
CORS_ORIGIN=http://localhost:4200
JWT_SECRET=your-secret-key

# Frontend
REACT_APP_WS_URL=http://localhost:20001
```

## Testing

See `/packages/admin-ui/src/app/examples/DashboardExample.tsx` for comprehensive examples.

## Troubleshooting

### Connection Issues

1. Verify JWT token is valid
2. Check CORS configuration
3. Ensure admin-ui service is running
4. Check firewall/network settings

### Missing Events

1. Verify subscription is active
2. Check event filters
3. Ensure events are being emitted
4. Check subscription manager stats

### High Memory Usage

1. Reduce `maxEvents` in useSystemEvents
2. Clear old events periodically
3. Unsubscribe from unused channels

## Future Enhancements

- [ ] Event persistence and replay
- [ ] Historical data queries
- [ ] Custom event aggregations
- [ ] WebSocket compression
- [ ] Redis adapter for horizontal scaling
- [ ] Event rate limiting
- [ ] Custom alert rules engine
