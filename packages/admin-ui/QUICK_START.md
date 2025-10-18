# Quick Start Guide - ORION Admin-UI Frontend

## Running Tests

```bash
# Navigate to admin-ui
cd packages/admin-ui

# Run all frontend tests
npx jest --config=jest.frontend.config.js

# Run with coverage report
npx jest --config=jest.frontend.config.js --coverage

# Run in watch mode (for development)
npx jest --config=jest.frontend.config.js --watch

# Run specific test file
npx jest --config=jest.frontend.config.js widget-registry.test
```

## Creating a New Widget (3 Steps)

### Step 1: Create Widget Component

```typescript
// src/frontend/widgets/MyWidget.tsx
import React from 'react';
import { WidgetProps } from '../types';
import { useMetrics } from '../hooks';

export const MyWidget: React.FC<WidgetProps> = ({ config, onRefresh }) => {
  const { metrics } = useMetrics({ metricNames: ['cpu'] });
  
  return (
    <div className="widget-card">
      <h3 className="widget-header">My Widget</h3>
      <div className="stat-value">
        {metrics[0]?.dataPoints[0]?.value ?? 'Loading...'}
      </div>
    </div>
  );
};
```

### Step 2: Register Widget

```typescript
// In src/frontend/App.tsx (or separate registration file)
import { MyWidget } from './widgets/MyWidget';

WidgetRegistry.register({
  id: 'my-widget',
  name: 'My Custom Widget',
  description: 'Displays CPU metrics',
  component: MyWidget,
  category: 'monitoring',
  defaultSize: { cols: 4, rows: 2 },
  lifecycle: {
    onMount: async (id, config) => {
      console.log('Widget mounted:', id);
    },
    onRefresh: async (id) => {
      console.log('Widget refreshed:', id);
    }
  }
});
```

### Step 3: Add to Dashboard

```typescript
// Add to defaultWidgets array in App.tsx
const defaultWidgets: WidgetInstance[] = [
  // ... existing widgets
  {
    id: 'my-widget-1',
    widgetId: 'my-widget',
    position: { x: 0, y: 4, width: 4, height: 2 },
    config: { /* optional config */ }
  }
];
```

## Using WebSocket Hooks

### Service Health Monitoring

```typescript
import { useServiceHealth } from './hooks';

function ServiceMonitor() {
  const { services, loading, error, isConnected } = useServiceHealth();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <div>Connected: {isConnected ? '✓' : '✗'}</div>
      {services.map(service => (
        <div key={service.id}>
          {service.name}: {service.health}
        </div>
      ))}
    </div>
  );
}
```

### System Events

```typescript
import { useSystemEvents } from './hooks';

function EventLog() {
  const { events, clearEvents } = useSystemEvents({
    filterTypes: ['service.error'],
    maxEvents: 50
  });
  
  return (
    <div>
      <button onClick={clearEvents}>Clear</button>
      {events.map(event => (
        <div key={event.id}>
          [{event.severity}] {event.message}
        </div>
      ))}
    </div>
  );
}
```

### Metrics

```typescript
import { useMetrics } from './hooks';

function MetricsChart() {
  const { metrics, getMetric } = useMetrics({
    metricNames: ['requests', 'errors'],
    maxDataPoints: 100
  });
  
  const requestMetric = getMetric('requests');
  
  return (
    <div>
      {requestMetric?.dataPoints.map((point, i) => (
        <div key={i}>{point.value}</div>
      ))}
    </div>
  );
}
```

### Alerts

```typescript
import { useAlerts } from './hooks';

function AlertPanel() {
  const { 
    criticalAlerts, 
    acknowledgeAlert, 
    resolveAlert 
  } = useAlerts({
    filterSeverity: ['critical'],
    filterStatus: ['active']
  });
  
  return (
    <div>
      {criticalAlerts.map(alert => (
        <div key={alert.id}>
          <h4>{alert.title}</h4>
          <p>{alert.message}</p>
          <button onClick={() => acknowledgeAlert(alert.id)}>
            Acknowledge
          </button>
          <button onClick={() => resolveAlert(alert.id)}>
            Resolve
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Testing Your Widget

```typescript
// src/frontend/widgets/__tests__/MyWidget.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyWidget } from '../MyWidget';

describe('MyWidget', () => {
  it('should render', () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <MyWidget />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('My Widget')).toBeInTheDocument();
  });
});
```

## File Locations

```
packages/admin-ui/src/frontend/
├── types/index.ts              # TypeScript types
├── services/
│   ├── websocket.ts            # WebSocket service
│   ├── widget-registry.ts      # Widget registry
│   └── api.ts                  # API client
├── hooks/
│   ├── useWebSocket.tsx        # WebSocket hook
│   ├── useServiceHealth.tsx    # Service monitoring
│   ├── useSystemEvents.tsx     # Event streaming
│   ├── useMetrics.tsx          # Metrics collection
│   └── useAlerts.tsx           # Alert management
├── widgets/
│   └── YourWidget.tsx          # Your widgets here
└── components/
    └── YourComponent.tsx       # Your components here
```

## Common Patterns

### Loading States

```typescript
const { data, loading, error } = useServiceHealth();

if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

### Real-time Updates

```typescript
// Automatically receives WebSocket updates
const { services } = useServiceHealth();

// services array updates automatically when events arrive
```

### Widget Configuration

```typescript
const MyWidget: React.FC<WidgetProps> = ({ config }) => {
  const refreshInterval = config?.refreshInterval ?? 5000;
  const showDetails = config?.showDetails ?? true;
  
  // Use config to customize behavior
};
```

## Troubleshooting

### Tests not running
- Ensure you're using `jest.frontend.config.js`
- Check that `jest.frontend.setup.ts` exists
- Verify dependencies are installed: `pnpm install`

### WebSocket not connecting
- Check WebSocket service URL configuration
- Verify backend Socket.io server is running
- Check browser console for connection errors

### Type errors
- All types are in `src/frontend/types/index.ts`
- Import from `'../types'` or `'../../types'`
- TypeScript strict mode is enabled

## Resources

- Full documentation: `FRONTEND_BUILD_SUMMARY.md`
- Implementation details: `IMPLEMENTATION_COMPLETE.md`
- Example widgets: `src/frontend/widgets/`
- Test examples: `src/frontend/**/__tests__/`
