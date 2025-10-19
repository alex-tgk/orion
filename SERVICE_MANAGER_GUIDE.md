# ORION Service Manager - Quick Start Guide

The Service Manager provides a GUI-based dashboard for managing all ORION microservices using PM2.

## Quick Start

### 1. Install PM2 globally (if not already installed)

```bash
npm install -g pm2
```

### 2. Install Service Manager dependencies

```bash
cd packages/service-manager
pnpm install
```

### 3. Start all ORION services with PM2

From the project root:

```bash
pm2 start ecosystem.config.js
```

This starts:
- **auth** - Authentication service (port 3010)
- **ai-wrapper** - AI CLI wrapper service (port 3200)
- **gateway** - API gateway (port 3100)
- **admin-ui** - Admin dashboard (port 3000)
- **document-intelligence** - Document intelligence demo (port 3001)

### 4. Launch the Service Manager

```bash
cd packages/service-manager
pnpm dev
```

This starts:
- **Backend**: http://localhost:3300 (PM2 API + WebSocket server)
- **Frontend**: http://localhost:3301 (React dashboard)

### 5. Access the Dashboard

Open http://localhost:3301 in your browser.

## Dashboard Features

### Summary Statistics
- Total services count
- Online services count
- Stopped services count
- Errored services count

### Real-Time Service Monitoring
- Service name and status
- Process ID (PID)
- CPU usage percentage
- Memory usage (formatted in KB/MB/GB)
- Uptime duration
- Restart count

### Service Control Actions
- **Start** - Launch a stopped service
- **Stop** - Gracefully stop a running service
- **Restart** - Restart a service

### Live Updates
- WebSocket connection for real-time metrics
- Updates every 2 seconds
- Connection status indicator

## PM2 Useful Commands

### View all processes
```bash
pm2 list
```

### Monitor in terminal
```bash
pm2 monit
```

### View logs
```bash
pm2 logs              # All services
pm2 logs auth         # Specific service
pm2 logs --lines 100  # Last 100 lines
```

### Stop services
```bash
pm2 stop auth         # Stop specific service
pm2 stop all          # Stop all services
```

### Restart services
```bash
pm2 restart auth      # Restart specific service
pm2 restart all       # Restart all services
```

### Delete processes
```bash
pm2 delete auth       # Remove specific service
pm2 delete all        # Remove all services
```

### Save configuration
```bash
pm2 save              # Save current process list
```

### Auto-start on boot
```bash
pm2 startup           # Generate startup script
pm2 save              # Save current processes
```

## Architecture

```
┌─────────────────────────────────────┐
│     Service Manager GUI             │
│     (React + Vite)                  │
│     http://localhost:3301           │
└──────────────┬──────────────────────┘
               │
               │ WebSocket + REST API
               │
┌──────────────▼──────────────────────┐
│     Service Manager Backend         │
│     (Express + Socket.io)           │
│     http://localhost:3300           │
└──────────────┬──────────────────────┘
               │
               │ PM2 API
               │
┌──────────────▼──────────────────────┐
│           PM2 Daemon                │
│     (Process Manager)               │
└──────────────┬──────────────────────┘
               │
      ┌────────┼────────┬─────────┬──────────┐
      │        │        │         │          │
   ┌──▼──┐  ┌─▼──┐  ┌──▼──┐  ┌──▼───┐  ┌───▼────┐
   │Auth │  │ AI │  │Gate │  │Admin │  │  Doc   │
   │3010 │  │3200│  │3100 │  │ 3000 │  │  3001  │
   └─────┘  └────┘  └─────┘  └──────┘  └────────┘
```

## Configuration

### Adding a New Service

Edit `ecosystem.config.js` at the project root:

```javascript
module.exports = {
  apps: [
    // ... existing services
    {
      name: 'my-new-service',
      script: 'dist/main.js',
      cwd: './packages/my-new-service',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        PORT: 3050,
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Then reload:
```bash
pm2 reload ecosystem.config.js
```

### Changing Ports

**Backend (PM2 API server):**
Edit `packages/service-manager/server/index.ts`:
```typescript
const PORT = 3300; // Change this
```

**Frontend (React GUI):**
Edit `packages/service-manager/client/vite.config.ts`:
```typescript
server: {
  port: 3301, // Change this
}
```

## Integration with Admin Dashboard

You can link to the Service Manager from the Admin UI:

```tsx
// In packages/admin-ui/src/components/Navigation.tsx
<Link to="/services" className="nav-link">
  Services
</Link>

// Create route in App.tsx
<Route path="/services" element={
  <iframe
    src="http://localhost:3301"
    className="w-full h-full"
    title="Service Manager"
  />
} />
```

## Troubleshooting

### Services not appearing in dashboard

1. Check PM2 is running:
   ```bash
   pm2 list
   ```

2. If empty, start services:
   ```bash
   pm2 start ecosystem.config.js
   ```

### WebSocket disconnected

1. Check backend is running:
   ```bash
   curl http://localhost:3300/api/services
   ```

2. Restart backend:
   ```bash
   cd packages/service-manager
   pnpm run server
   ```

### Port conflicts

Kill processes using the ports:
```bash
lsof -ti:3300 | xargs kill -9  # Backend
lsof -ti:3301 | xargs kill -9  # Frontend
```

### PM2 out of sync

Reset PM2:
```bash
pm2 kill
pm2 start ecosystem.config.js
```

## Production Deployment

### 1. Build the frontend
```bash
cd packages/service-manager/client
pnpm run build
```

### 2. Serve static files
Configure Express to serve the built files:

```typescript
app.use(express.static(path.join(__dirname, '../client/dist')));
```

### 3. Run backend with PM2
Add Service Manager to ecosystem.config.js:

```javascript
{
  name: 'service-manager',
  script: 'server/index.js',
  cwd: './packages/service-manager',
  env: { PORT: 3300 }
}
```

### 4. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
```

## Security Considerations

- **Authentication**: Add authentication middleware to protect API endpoints
- **CORS**: Configure CORS properly for production
- **Rate Limiting**: Add rate limiting to prevent abuse
- **HTTPS**: Use HTTPS in production
- **API Keys**: Protect PM2 API access with API keys

## Next Steps

1. Add authentication to Service Manager
2. Implement log viewing in GUI
3. Add service metrics charts (CPU/Memory over time)
4. Implement service health checks
5. Add notification system for service failures
6. Create service dependency graph
7. Add deployment controls (build, deploy)

## Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
