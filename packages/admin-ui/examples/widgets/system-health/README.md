# System Health Widget Example

A complete, production-ready widget for monitoring system health metrics in real-time.

## Features

- Real-time CPU, Memory, and Disk monitoring
- WebSocket-based live updates (every 5 seconds)
- Configurable alert thresholds
- Visual indicators for normal/warning/critical states
- System uptime display
- Active alerts panel
- Responsive design
- Error handling and reconnection logic

## Installation

### 1. Copy the Widget Module

```bash
cp -r examples/widgets/system-health src/app/extensions/widgets/
```

### 2. Import in App Module

```typescript
// src/app/app.module.ts
import { Module } from '@nestjs/common';
import { PluginModule } from './plugins/plugin.module';
import { SystemHealthWidgetModule } from './extensions/widgets/system-health/system-health.module';

@Module({
  imports: [
    PluginModule,
    SystemHealthWidgetModule, // Add this
    // ... other imports
  ],
})
export class AppModule {}
```

### 3. Add Frontend Widget

```bash
# Copy frontend component to your widgets directory
cp examples/widgets/system-health/frontend/* src/public/widgets/system-health/
```

## Usage

### Backend API Endpoints

```
GET /api/widgets/system-health/data
    - Get current system health metrics
    - Query params: ?includeHistory=true

GET /api/widgets/system-health/config
    - Get widget configuration schema

GET /api/widgets/system-health/history?duration=60
    - Get historical data (duration in minutes)

GET /api/widgets/system-health/alerts
    - Get active health alerts
```

### WebSocket Events

```javascript
// Connect to namespace
const socket = io('http://localhost:3000/widgets/system-health');

// Subscribe to updates
socket.emit('subscribe');

// Listen for health updates
socket.on('health-update', (data) => {
  console.log('Metrics:', data.metrics);
});

// Listen for alerts
socket.on('health-alert', (data) => {
  console.log('Alert:', data.alert);
});

// Unsubscribe
socket.emit('unsubscribe');
```

### Frontend Integration

```typescript
import SystemHealthWidget from './widgets/system-health/SystemHealthWidget';

function Dashboard() {
  const config = {
    refreshInterval: 5000,
    cpuThreshold: 80,
    memoryThreshold: 85,
    diskThreshold: 90,
    showAlerts: true,
  };

  return (
    <SystemHealthWidget
      config={config}
      onConfigChange={(newConfig) => {
        console.log('Config changed:', newConfig);
      }}
      onError={(error) => {
        console.error('Widget error:', error);
      }}
    />
  );
}
```

## Configuration

Default configuration:

```json
{
  "refreshInterval": 5000,
  "cpuThreshold": 80,
  "memoryThreshold": 85,
  "diskThreshold": 90,
  "showAlerts": true
}
```

## Widget Metadata

```typescript
{
  id: 'system-health',
  name: 'System Health Monitor',
  version: '1.0.0',
  category: 'monitoring',
  icon: 'heartbeat',
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 3, height: 2 },
  maxSize: { width: 12, height: 6 },
  resizable: true,
  fullscreenCapable: true,
  exportable: true,
  exportFormats: ['json', 'csv'],
  permissions: ['view:system-health'],
}
```

## Customization

### Change Alert Thresholds

```typescript
// Update in service
systemHealthService.updateThresholds({
  cpuThreshold: 90,
  memoryThreshold: 90,
  diskThreshold: 95,
});
```

### Add Custom Metrics

```typescript
// In system-health.service.ts
private async getCustomMetrics() {
  return {
    networkUsage: await this.getNetworkUsage(),
    activeConnections: await this.getActiveConnections(),
  };
}
```

### Modify Update Interval

Change the `@Interval()` decorator value in `system-health.service.ts`:

```typescript
@Interval(10000) // Update every 10 seconds instead of 5
async collectMetrics() {
  // ...
}
```

## Testing

```bash
# Run unit tests
npm test system-health

# Test WebSocket connection
npm run test:integration system-health
```

## Troubleshooting

### WebSocket Connection Issues

1. Check CORS configuration in gateway
2. Verify Socket.IO version compatibility
3. Check firewall/proxy settings

### High CPU/Memory Usage

The widget itself uses minimal resources. If you see high usage:
- Increase the refresh interval
- Limit historical data points
- Reduce number of concurrent clients

### Alerts Not Showing

1. Check `showAlerts` config is `true`
2. Verify thresholds are being exceeded
3. Check console for WebSocket errors

## Performance

- Memory usage: ~5-10MB per connected client
- Network bandwidth: ~1KB/update (every 5 seconds)
- CPU overhead: <1% on modern systems

## License

MIT
