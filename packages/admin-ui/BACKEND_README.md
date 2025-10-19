# ORION Admin Dashboard - Backend API

> Production-grade NestJS backend API for the ORION Admin Dashboard

## Overview

The Admin Dashboard Backend provides a comprehensive REST API and WebSocket gateway for monitoring and managing all ORION microservices. Built with NestJS, it offers real-time service health monitoring, PM2 process management, log aggregation, queue management, and feature flag controls.

## Features

- **Service Monitoring:** Real-time health checks for all ORION services
- **PM2 Integration:** Full process lifecycle management (start, stop, restart, reload)
- **Log Aggregation:** Query, filter, and stream logs from all services
- **RabbitMQ Management:** Monitor queues, peek messages, purge queues
- **Feature Flags:** Dynamic feature flag management with rollout controls
- **AI Proxy:** Proxy endpoints to AI wrapper service
- **WebSocket Gateway:** Real-time updates for dashboard components
- **Swagger Documentation:** Interactive API documentation

## Architecture

```
src/
├── app/
│   ├── controllers/       # REST API controllers
│   │   ├── health.controller.ts
│   │   ├── services.controller.ts
│   │   ├── pm2.controller.ts
│   │   ├── logs.controller.ts
│   │   ├── queues.controller.ts
│   │   ├── feature-flags.controller.ts
│   │   └── ai.controller.ts
│   ├── services/          # Business logic services
│   │   ├── health.service.ts
│   │   ├── services.service.ts
│   │   ├── pm2.service.ts
│   │   ├── logs.service.ts
│   │   ├── rabbitmq.service.ts
│   │   └── feature-flags.service.ts
│   ├── gateways/          # WebSocket gateways
│   │   └── admin-events.gateway.ts
│   ├── dto/               # Data Transfer Objects
│   │   ├── service.dto.ts
│   │   ├── pm2.dto.ts
│   │   ├── log.dto.ts
│   │   ├── queue.dto.ts
│   │   ├── feature-flag.dto.ts
│   │   └── health.dto.ts
│   ├── config/            # Configuration
│   │   └── app.config.ts
│   └── app.module.ts      # Root module
└── main.ts                # Bootstrap
```

## Quick Start

### Prerequisites

- Node.js 20+
- PM2 installed globally
- RabbitMQ running on `localhost:5672`
- ORION services running (auth, gateway, etc.)

### Installation

```bash
# Install dependencies
cd packages/admin-ui
pnpm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Server
ADMIN_API_PORT=3004
NODE_ENV=development

# Services
AUTH_SERVICE_URL=http://localhost:3001
GATEWAY_SERVICE_URL=http://localhost:3100
AI_WRAPPER_URL=http://localhost:3200
NOTIFICATIONS_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003

# Infrastructure
DATABASE_URL=postgresql://orion:orion@localhost:5432/orion
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Development

```bash
# Start backend in watch mode
pnpm run dev:server

# Build backend
pnpm run build:server

# Start production server
pnpm run start:server
```

## API Endpoints

### Base URL

`http://localhost:3004/api`

### Documentation

- **Swagger UI:** http://localhost:3004/api/docs
- **API Contracts:** See `BACKEND_API_CONTRACTS.md`

### Endpoint Summary

#### Health

- `GET /api/health` - Backend health
- `GET /api/health/all` - All services health

#### Services

- `GET /api/services` - List all services
- `GET /api/services/:id` - Get service details
- `GET /api/services/:id/metrics` - Get service metrics
- `POST /api/services/:id/restart` - Restart service
- `POST /api/services/:id/stop` - Stop service
- `POST /api/services/:id/start` - Start service

#### PM2

- `GET /api/pm2/processes` - List PM2 processes
- `GET /api/pm2/process/:id` - Get process details
- `POST /api/pm2/:id/restart` - Restart process
- `POST /api/pm2/:id/reload` - Reload process (zero-downtime)
- `POST /api/pm2/:id/stop` - Stop process
- `POST /api/pm2/:id/start` - Start process
- `GET /api/pm2/:id/logs` - Get process logs

#### Logs

- `GET /api/logs` - Query logs with filters
- `GET /api/logs/stream` - SSE log stream
- `POST /api/logs/export` - Export logs (JSON/CSV)

#### Queues

- `GET /api/queues` - List all queues
- `GET /api/queues/:name` - Get queue details
- `GET /api/queues/:name/messages` - Peek messages
- `POST /api/queues/:name/purge` - Purge queue

#### Feature Flags

- `GET /api/feature-flags` - List all flags
- `GET /api/feature-flags/:id` - Get flag details
- `GET /api/feature-flags/stats` - Get usage statistics
- `POST /api/feature-flags` - Create flag
- `PUT /api/feature-flags/:id` - Update flag
- `DELETE /api/feature-flags/:id` - Delete flag

#### AI Integration

- `GET /api/ai/providers` - Get AI providers
- `POST /api/ai/chat` - Send chat request

## WebSocket Events

### Connection

Connect to `ws://localhost:3004/admin`

### Client → Server

- `subscribe:service-health` - Subscribe to health updates
- `subscribe:queue-stats` - Subscribe to queue stats
- `subscribe:logs` - Subscribe to log stream
- `ping` - Ping server

### Server → Client

- `service-health` - Service health updates (every 10s)
- `queue-stats` - Queue statistics (every 5s)
- `pm2-update` - PM2 process updates (every 5s)
- `log-stream` - Real-time logs (every 2s)
- `pong` - Pong response

## Development

### Testing Endpoints

```bash
# Test health endpoint
curl http://localhost:3004/api/health

# Get all services
curl http://localhost:3004/api/services

# Get PM2 processes
curl http://localhost:3004/api/pm2/processes

# Query logs
curl "http://localhost:3004/api/logs?service=auth&level=error&limit=10"
```

### Testing WebSocket

```javascript
const io = require('socket.io-client');

const socket = io('ws://localhost:3004/admin');

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('subscribe:service-health');
});

socket.on('service-health', (data) => {
  console.log('Health update:', data);
});
```

## Services

### HealthService

Manages health checks for all ORION services and infrastructure dependencies.

**Key Methods:**

- `checkServiceHealth(serviceName)` - Check individual service
- `checkAllServices()` - Aggregated health check
- `getBackendHealth()` - This service's health

### PM2Service

Integrates with PM2 for process management.

**Key Methods:**

- `listProcesses()` - Get all PM2 processes
- `getProcess(id)` - Get process details
- `restartProcess(id)` - Restart process
- `reloadProcess(id)` - Zero-downtime reload
- `stopProcess(id)` - Stop process
- `startProcess(id)` - Start process

### RabbitMQService

Manages RabbitMQ queue operations.

**Key Methods:**

- `listQueues()` - List all queues
- `getQueue(name)` - Get queue details
- `peekMessages(name, limit)` - Peek without consuming
- `purgeQueue(name)` - Purge all messages

### LogsService

In-memory log aggregation with circular buffer (10k entries).

**Key Methods:**

- `addLog(log)` - Add log entry
- `queryLogs(query)` - Filter and query logs
- `exportLogs(exportDto)` - Export to JSON/CSV
- `getRecentLogs(since, limit)` - For streaming

### FeatureFlagsService

Manages feature flags with rollout controls.

**Key Methods:**

- `createFlag(createDto)` - Create new flag
- `updateFlag(id, updateDto)` - Update flag
- `deleteFlag(id)` - Delete flag
- `isEnabled(key, userId, env)` - Evaluate flag
- `getAllStats()` - Get usage statistics

### ServicesService

Aggregates service health, metrics, and PM2 data.

**Key Methods:**

- `getAllServices()` - List all ORION services
- `getService(id)` - Get service details
- `restartService(id)` - Restart via PM2
- `stopService(id)` - Stop via PM2
- `startService(id)` - Start via PM2

## WebSocket Gateway

The `AdminEventsGateway` provides real-time updates:

- **Health Checks:** Every 10 seconds
- **Queue Stats:** Every 5 seconds
- **PM2 Updates:** Every 5 seconds
- **Log Streaming:** Every 2 seconds

Clients can subscribe to specific events or receive all updates.

## Error Handling

All endpoints use NestJS exception filters with standardized error responses:

```typescript
{
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
}
```

## Security Considerations

**Current Status (MVP):**

- No authentication required
- CORS enabled for configured origin
- Input validation via class-validator

**Production Requirements:**

- [ ] JWT authentication on all endpoints
- [ ] Role-based access control (RBAC)
- [ ] Rate limiting
- [ ] API key authentication for service-to-service
- [ ] Audit logging for destructive operations
- [ ] Input sanitization
- [ ] Helmet.js security headers

## Performance

- **Log Buffer:** Circular buffer (10k entries) for memory efficiency
- **Health Cache:** 5-second cache to reduce health check overhead
- **WebSocket:** Event-driven updates reduce polling overhead
- **Async Operations:** All I/O operations are async

## Monitoring

The backend exposes its own health endpoint at `/api/health`:

```json
{
  "status": "healthy",
  "service": "admin-api",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

## Integration with Frontend

Frontend agents should configure:

```typescript
// .env
VITE_API_URL=http://localhost:3004
VITE_WS_URL=ws://localhost:3004

// API Client
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
});

// WebSocket Client
const socket = io(import.meta.env.VITE_WS_URL + '/admin');
```

## Troubleshooting

### PM2 Connection Issues

```bash
# Verify PM2 is running
pm2 list

# Check PM2 home directory
echo $PM2_HOME

# Update .env if needed
PM2_HOME=/path/to/.pm2
```

### RabbitMQ Connection Issues

```bash
# Verify RabbitMQ is running
docker ps | grep rabbitmq
# or
rabbitmqctl status

# Check connection URL
RABBITMQ_URL=amqp://localhost:5672
```

### Service Health Check Failures

- Ensure all ORION services are running
- Check service URLs in `.env`
- Verify network connectivity
- Check service health endpoints directly

## Future Enhancements

- [ ] Persistent log storage (Elasticsearch integration)
- [ ] Advanced filtering and search
- [ ] Alerting and notifications
- [ ] Custom dashboard widgets
- [ ] Performance metrics collection
- [ ] Distributed tracing integration
- [ ] Multi-environment support
- [ ] Backup and restore functionality

## API Versioning

Current version: `v1`

All endpoints are under `/api` prefix. Future versions will use `/api/v2`, etc.

## Contributing

1. Follow NestJS best practices
2. Add DTOs for all endpoints
3. Use class-validator for validation
4. Update Swagger documentation
5. Update `BACKEND_API_CONTRACTS.md`
6. Write unit tests for services
7. Test WebSocket events

## Support

- **Documentation:** `BACKEND_API_CONTRACTS.md`
- **Swagger UI:** http://localhost:3004/api/docs
- **Issues:** GitHub Issues
- **Contact:** support@orion.com

---

**Version:** 1.0.0
**Last Updated:** 2025-10-19
**Maintainer:** ORION Team
