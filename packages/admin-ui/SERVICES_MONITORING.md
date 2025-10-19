# ORION Service Monitoring & PM2 Dashboard

Comprehensive service monitoring interface with PM2 process management for the ORION platform.

## Features

### 1. Service Grid (Services Tab)
- **Real-time Service Status**: Live updates via WebSocket
- **Service Cards**: Beautiful Tremor Card components showing:
  - Service name, version, port, and PID
  - Status badges (Online, Offline, Degraded, Starting, Stopping)
  - Health status (Healthy, Unhealthy, Degraded)
  - Response time and uptime
  - Request rate and error rate
  - CPU and Memory usage with progress bars
  - Quick action buttons (Restart, Stop, Start)
- **Summary Stats**: System-wide health metrics
- **Responsive Grid**: Adaptive layout (1-3 columns)

### 2. PM2 Dashboard (PM2 Processes Tab)
- **Process Table**: Comprehensive Tremor Table with:
  - PM2 ID, Name, Namespace
  - Status with color-coded badges
  - Process mode (fork/cluster) with instance count
  - PID and uptime
  - Restart count (with unstable restart warnings)
  - CPU/Memory usage with progress bars
  - Action controls
- **Process Controls**:
  - Start/Stop/Restart with confirmations
  - Reload (zero-downtime for cluster mode)
  - View logs button
- **Summary Stats**: Total processes, online count, restart stats
- **Log Viewer**: Full-featured modal with:
  - Real-time log streaming
  - Auto-refresh every 5s
  - Color-coded log types (stdout/stderr)
  - Download logs feature
  - Timestamp formatting

### 3. Health Status (Health Checks Tab)
- **Overall System Health**: Status badge and metrics
- **Infrastructure Monitoring**:
  - Database (PostgreSQL): Status, response time, connections
  - Redis: Status, response time, memory usage
  - RabbitMQ: Status, response time, queue count
- **Service Health Checks Table**:
  - Per-service health status
  - Individual check results (pass/warn/fail)
  - Dependency status
  - Response time tracking
- **Visual Indicators**: Color-coded cards and badges

## Tech Stack

- **React 18** with TypeScript
- **Tremor UI**: Card, Table, Badge, Button, ProgressBar, TabGroup
- **TanStack Query v5**: Data fetching, caching, real-time updates
- **Socket.io Client**: WebSocket real-time updates
- **Recharts**: Mini charts for metrics (optional)
- **Lucide React**: Icon system
- **date-fns**: Date formatting

## Architecture

### Data Flow
```
Backend API (localhost:3004)
    ↓
TanStack Query (HTTP polling + caching)
    ↓
WebSocket (Real-time updates)
    ↓
React Components
```

### Hooks
- **useServices**: Fetch services, real-time updates, actions
- **usePM2**: Fetch PM2 processes, real-time updates, actions
- **useHealth**: System and service health checks
- **WebSocket Service**: Centralized WebSocket management

### Components
```
Services.tsx (Page)
├── ServiceGrid
│   └── ServiceCard (×N)
├── PM2Dashboard
│   ├── ProcessControls (×N)
│   └── Table
└── HealthStatus
    ├── Infrastructure Cards
    └── Health Checks Table
```

## API Endpoints

### Services
```
GET  /api/services              - List all services
GET  /api/services/:id/metrics  - Service metrics
POST /api/services/:id/restart  - Restart service
POST /api/services/:id/stop     - Stop service
POST /api/services/:id/start    - Start service
GET  /api/health                - System health
GET  /api/services/:id/health   - Service health
```

### PM2
```
GET  /api/pm2/processes         - List PM2 processes
POST /api/pm2/:id/restart       - Restart process
POST /api/pm2/:id/reload        - Reload process (zero-downtime)
POST /api/pm2/:id/stop          - Stop process
POST /api/pm2/:id/start         - Start process
GET  /api/pm2/:id/logs          - Get process logs
```

### WebSocket
```
ws://localhost:3004/admin

Events:
- service-health: Real-time service updates
- pm2-update: Real-time PM2 process updates
```

## Environment Variables

Create `.env` file in admin-ui package:

```bash
# Admin API URL (backend)
VITE_ADMIN_API_URL=http://localhost:3004/api

# WebSocket URL
VITE_WS_URL=http://localhost:3004
```

## File Structure

```
packages/admin-ui/
├── src/
│   ├── components/
│   │   └── features/
│   │       └── services/
│   │           ├── ServiceCard.tsx
│   │           ├── ServiceGrid.tsx
│   │           ├── PM2Dashboard.tsx
│   │           ├── ProcessControls.tsx
│   │           ├── HealthStatus.tsx
│   │           ├── LogViewer.tsx
│   │           └── index.ts
│   ├── hooks/
│   │   ├── useServices.ts
│   │   ├── usePM2.ts
│   │   └── useHealth.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── websocket.service.ts
│   ├── types/
│   │   └── services.types.ts
│   └── pages/
│       └── Services.tsx
```

## Usage

### Starting the Application

1. **Start Backend API** (in admin-ui package):
```bash
npm run dev:server
```

2. **Start Frontend** (in admin-ui package):
```bash
npm run dev
```

3. **Navigate** to Services page:
```
http://localhost:5173/services
```

### Features in Action

#### Restart a Service
1. Go to Services tab
2. Find service card
3. Click "Restart" button
4. Service status updates in real-time via WebSocket

#### View PM2 Process Logs
1. Go to PM2 Processes tab
2. Click "Logs" button on any process
3. Log viewer modal opens
4. Logs auto-refresh every 5s
5. Download logs with "Download" button

#### Monitor System Health
1. Go to Health Checks tab
2. View overall system status
3. Check infrastructure (Database, Redis, RabbitMQ)
4. Review service health checks
5. Inspect individual check results

## Real-time Updates

The dashboard uses WebSocket for real-time updates:

- **Service status changes**: Instant badge updates
- **CPU/Memory metrics**: Live progress bar updates
- **PM2 process state**: Real-time process table updates
- **Fallback polling**: 30s interval if WebSocket fails

## Responsive Design

- **Mobile**: Single column layout
- **Tablet**: 2 columns for services, stacked cards
- **Desktop**: 3 columns for services, full-width tables
- **Accessibility**: WCAG 2.1 AA compliant

## Error Handling

- **Network errors**: Graceful fallback to polling
- **WebSocket disconnect**: Auto-reconnect (max 5 attempts)
- **API errors**: User-friendly error messages
- **Loading states**: Skeleton loaders and spinners

## Performance Optimizations

- **TanStack Query caching**: Reduces API calls
- **Optimistic updates**: Instant UI feedback
- **WebSocket batching**: Efficient real-time updates
- **Code splitting**: Lazy-loaded components
- **Memoization**: Prevents unnecessary re-renders

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Testing

Run tests:
```bash
npm test
```

## Troubleshooting

### WebSocket not connecting
- Check backend is running on port 3004
- Verify CORS settings allow WebSocket
- Check browser console for connection errors

### Services not loading
- Ensure backend API is accessible
- Check network tab for failed requests
- Verify API_BASE_URL environment variable

### PM2 processes not showing
- Confirm PM2 is installed and running
- Check backend has PM2 integration
- Verify PM2 list command works

## Future Enhancements

- [ ] Metrics charts (CPU/Memory over time)
- [ ] Service dependency graph
- [ ] Alert configuration
- [ ] Automated health checks
- [ ] Service scaling controls
- [ ] Container orchestration integration
- [ ] Custom dashboards
- [ ] Export/import configurations

## Contributing

When adding new features:
1. Update TypeScript types in `services.types.ts`
2. Create hooks for data fetching
3. Build components with Tremor UI
4. Add real-time WebSocket support
5. Update this documentation

## License

MIT
