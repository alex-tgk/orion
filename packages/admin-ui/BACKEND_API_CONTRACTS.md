# ORION Admin Dashboard - Backend API Contracts

> **Version:** 1.0.0
> **Base URL:** `http://localhost:3004/api`
> **WebSocket URL:** `ws://localhost:3004/admin`
> **Swagger Docs:** `http://localhost:3004/api/docs`

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [REST API Endpoints](#rest-api-endpoints)
  - [Health](#health-endpoints)
  - [Services](#services-endpoints)
  - [PM2](#pm2-endpoints)
  - [Logs](#logs-endpoints)
  - [RabbitMQ Queues](#rabbitmq-queues-endpoints)
  - [Feature Flags](#feature-flags-endpoints)
  - [AI Integration](#ai-integration-endpoints)
- [WebSocket Events](#websocket-events)
- [TypeScript Interfaces](#typescript-interfaces)
- [Error Handling](#error-handling)

---

## Overview

The ORION Admin Dashboard Backend API provides comprehensive management and monitoring capabilities for the ORION microservices platform.

### Features

- **Service Monitoring:** Real-time health checks and metrics for all ORION services
- **PM2 Management:** Process control via PM2 (start, stop, restart, reload)
- **Log Aggregation:** Query and stream logs from all services
- **Queue Management:** Monitor and manage RabbitMQ queues
- **Feature Flags:** Dynamic feature flag management with rollout controls
- **AI Integration:** Proxy endpoints to AI wrapper service
- **Real-time Updates:** WebSocket gateway for live dashboard updates

---

## Authentication

**Current Status:** No authentication required (MVP)

**Future:** JWT-based authentication will be added. All endpoints will require:

```typescript
headers: {
  'Authorization': 'Bearer <jwt-token>'
}
```

---

## REST API Endpoints

### Health Endpoints

#### `GET /api/health`

Get backend API health status.

**Response:**

```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptime?: number;
  timestamp: string;
}
```

**Example:**

```json
{
  "status": "healthy",
  "service": "admin-api",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

---

#### `GET /api/health/all`

Get aggregated health status of all ORION services.

**Response:**

```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: Record<string, HealthCheckDto>;
  infrastructure: {
    database: DependencyHealthDto;
    redis: DependencyHealthDto;
    rabbitmq: DependencyHealthDto;
  };
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
}
```

**Example:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "services": {
    "auth": {
      "status": "healthy",
      "service": "auth",
      "version": "1.0.0",
      "uptime": 7200,
      "timestamp": "2025-10-19T12:00:00.000Z"
    },
    "gateway": {
      "status": "healthy",
      "service": "gateway",
      "version": "1.0.0",
      "uptime": 7200,
      "timestamp": "2025-10-19T12:00:00.000Z"
    }
  },
  "infrastructure": {
    "database": {
      "name": "PostgreSQL",
      "status": "healthy",
      "available": true
    },
    "redis": {
      "name": "Redis",
      "status": "healthy",
      "available": true
    },
    "rabbitmq": {
      "name": "RabbitMQ",
      "status": "healthy",
      "available": true
    }
  },
  "total": 6,
  "healthy": 6,
  "degraded": 0,
  "unhealthy": 0
}
```

---

### Services Endpoints

#### `GET /api/services`

List all ORION services with health status.

**Response:**

```typescript
{
  services: ServiceDto[];
  total: number;
  online: number;
  offline: number;
}
```

**Example:**

```json
{
  "services": [
    {
      "id": "auth",
      "name": "Authentication Service",
      "version": "1.0.0",
      "port": 3001,
      "url": "http://localhost:3001",
      "status": "online",
      "pm2Id": 0,
      "health": {
        "status": "healthy",
        "service": "auth",
        "version": "1.0.0",
        "timestamp": "2025-10-19T12:00:00.000Z"
      },
      "metrics": {
        "cpu": 2.5,
        "memory": 120,
        "uptime": 7200
      }
    }
  ],
  "total": 6,
  "online": 5,
  "offline": 1
}
```

---

#### `GET /api/services/:id`

Get service details by ID.

**Parameters:**

- `id` (path): Service ID (e.g., `auth`, `gateway`, `ai-wrapper`)

**Response:** `ServiceDto`

---

#### `GET /api/services/:id/metrics`

Get service metrics (CPU, memory, uptime).

**Parameters:**

- `id` (path): Service ID

**Response:**

```typescript
{
  cpu: number;        // CPU usage percentage
  memory: number;     // Memory usage in MB
  uptime: number;     // Uptime in seconds
  requestCount?: number;
  errorRate?: number;
  avgResponseTime?: number;
}
```

---

#### `POST /api/services/:id/restart`

Restart a service via PM2.

**Parameters:**

- `id` (path): Service ID

**Response:**

```typescript
{
  action: string;
  serviceId: string;
  success: boolean;
  message: string;
  timestamp: string;
}
```

---

#### `POST /api/services/:id/stop`

Stop a service via PM2.

**Parameters:**

- `id` (path): Service ID

**Response:** `ServiceActionDto`

---

#### `POST /api/services/:id/start`

Start a service via PM2.

**Parameters:**

- `id` (path): Service ID

**Response:** `ServiceActionDto`

---

### PM2 Endpoints

#### `GET /api/pm2/processes`

Get all PM2 processes.

**Response:**

```typescript
{
  processes: PM2ProcessDto[];
  total: number;
  running: number;
  stopped: number;
}
```

**Example:**

```json
{
  "processes": [
    {
      "pm_id": 0,
      "name": "orion-auth",
      "status": "online",
      "pid": 12345,
      "restarts": 2,
      "uptime": 7200000,
      "monit": {
        "memory": 125829120,
        "cpu": 2.5
      },
      "script": "/path/to/main.js",
      "interpreter": "node",
      "nodeVersion": "20.11.0"
    }
  ],
  "total": 6,
  "running": 5,
  "stopped": 1
}
```

---

#### `GET /api/pm2/process/:id`

Get PM2 process details by ID.

**Parameters:**

- `id` (path, number): PM2 process ID

**Response:** `PM2ProcessDto`

---

#### `POST /api/pm2/:id/restart`

Restart a PM2 process.

**Parameters:**

- `id` (path, number): PM2 process ID

**Response:**

```typescript
{
  action: string;
  processId: number;
  processName: string;
  success: boolean;
  message: string;
}
```

---

#### `POST /api/pm2/:id/reload`

Reload a PM2 process with zero-downtime.

**Parameters:**

- `id` (path, number): PM2 process ID

**Response:** `PM2ActionResponseDto`

---

#### `POST /api/pm2/:id/stop`

Stop a PM2 process.

**Parameters:**

- `id` (path, number): PM2 process ID

**Response:** `PM2ActionResponseDto`

---

#### `POST /api/pm2/:id/start`

Start a PM2 process.

**Parameters:**

- `id` (path, number): PM2 process ID

**Response:** `PM2ActionResponseDto`

---

#### `GET /api/pm2/:id/logs`

Get PM2 process logs.

**Parameters:**

- `id` (path, number): PM2 process ID
- `lines` (query, optional, number): Number of log lines to retrieve (default: 100)

**Response:**

```typescript
{
  processId: number;
  processName: string;
  logs: string[];
  count: number;
  timestamp: string;
}
```

---

### Logs Endpoints

#### `GET /api/logs`

Query logs with filters.

**Query Parameters:**

```typescript
{
  service?: string;           // Filter by service name
  level?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  startTime?: string;         // ISO 8601 timestamp
  endTime?: string;           // ISO 8601 timestamp
  search?: string;            // Search in message content
  limit?: number;             // Results limit (1-1000, default: 100)
  offset?: number;            // Pagination offset (default: 0)
}
```

**Response:**

```typescript
{
  logs: LogEntryDto[];
  total: number;
  count: number;
  offset: number;
  timestamp: string;
}
```

**Example:**

```json
{
  "logs": [
    {
      "id": "log-123",
      "service": "auth",
      "level": "info",
      "message": "User login successful",
      "timestamp": "2025-10-19T12:00:00.000Z",
      "context": {
        "userId": "user-456"
      }
    }
  ],
  "total": 150,
  "count": 1,
  "offset": 0,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

---

#### `GET /api/logs/stream` (SSE)

Server-Sent Events endpoint for real-time log streaming.

**Response:** Server-Sent Events stream

**Event Data:**

```typescript
{
  logs: LogEntryDto[];
  timestamp: string;
}
```

---

#### `POST /api/logs/export`

Export logs as JSON or CSV.

**Query Parameters:**

```typescript
{
  format?: 'json' | 'csv';    // Export format (default: json)
  service?: string;
  level?: LogLevel;
  startTime?: string;
  endTime?: string;
}
```

**Response:**

```typescript
{
  format: string;
  count: number;
  data: string;               // File content
  filename: string;           // Suggested filename
  timestamp: string;
}
```

---

### RabbitMQ Queues Endpoints

#### `GET /api/queues`

List all RabbitMQ queues.

**Response:**

```typescript
{
  queues: QueueDto[];
  total: number;
  totalMessages: number;
  timestamp: string;
}
```

**Example:**

```json
{
  "queues": [
    {
      "name": "analytics.events",
      "vhost": "/",
      "durable": true,
      "autoDelete": false,
      "stats": {
        "messageCount": 145,
        "consumerCount": 2,
        "messagesReady": 145,
        "messagesUnacknowledged": 0
      },
      "state": "running"
    }
  ],
  "total": 6,
  "totalMessages": 345,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

---

#### `GET /api/queues/:name`

Get queue details and statistics.

**Parameters:**

- `name` (path): Queue name

**Response:** `QueueDto`

---

#### `GET /api/queues/:name/messages`

Peek messages from queue without consuming them.

**Parameters:**

- `name` (path): Queue name
- `limit` (query, optional, number): Maximum messages to peek (default: 10)

**Response:**

```typescript
{
  queueName: string;
  messages: QueueMessageDto[];
  count: number;
  totalInQueue: number;
  timestamp: string;
}
```

---

#### `POST /api/queues/:name/purge`

Purge all messages from a queue.

**Parameters:**

- `name` (path): Queue name

**Response:**

```typescript
{
  queueName: string;
  messagesPurged: number;
  success: boolean;
  message: string;
  timestamp: string;
}
```

---

### Feature Flags Endpoints

#### `GET /api/feature-flags`

List all feature flags.

**Response:**

```typescript
{
  flags: FeatureFlagDto[];
  total: number;
  enabled: number;
  disabled: number;
}
```

---

#### `GET /api/feature-flags/:id`

Get feature flag details by ID.

**Parameters:**

- `id` (path): Feature flag ID

**Response:** `FeatureFlagDto`

---

#### `GET /api/feature-flags/stats`

Get usage analytics for all feature flags.

**Response:**

```typescript
{
  stats: FeatureFlagStatsDto[];
  totalEvaluations: number;
  timestamp: string;
}
```

---

#### `POST /api/feature-flags`

Create a new feature flag.

**Request Body:**

```typescript
{
  name: string;
  description: string;
  key: string;
  enabled?: boolean;
  rollout?: {
    percentage: number;
    segments?: string[];
    userIds?: string[];
    environments?: string[];
  };
  metadata?: Record<string, any>;
}
```

**Response:** `FeatureFlagDto` (201 Created)

---

#### `PUT /api/feature-flags/:id`

Update a feature flag.

**Parameters:**

- `id` (path): Feature flag ID

**Request Body:**

```typescript
{
  name?: string;
  description?: string;
  enabled?: boolean;
  rollout?: FeatureFlagRolloutDto;
  metadata?: Record<string, any>;
}
```

**Response:** `FeatureFlagDto`

---

#### `DELETE /api/feature-flags/:id`

Delete a feature flag.

**Parameters:**

- `id` (path): Feature flag ID

**Response:** 204 No Content

---

### AI Integration Endpoints

#### `GET /api/ai/providers`

Get available AI providers (proxied from AI wrapper service).

**Response:**

```json
{
  "providers": [
    {
      "name": "openai",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "available": true
    },
    {
      "name": "anthropic",
      "models": ["claude-3-opus", "claude-3-sonnet"],
      "available": true
    }
  ]
}
```

---

#### `POST /api/ai/chat`

Send chat request to AI (proxied from AI wrapper service).

**Request Body:**

```typescript
{
  provider: string;           // e.g., 'openai', 'anthropic'
  model: string;              // e.g., 'gpt-4', 'claude-3-opus'
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;       // 0-2, default: 0.7
  maxTokens?: number;         // default: 1000
}
```

**Response:**

```json
{
  "response": {
    "content": "AI generated response...",
    "model": "gpt-4",
    "usage": {
      "promptTokens": 50,
      "completionTokens": 100,
      "totalTokens": 150
    }
  }
}
```

---

## WebSocket Events

Connect to `ws://localhost:3004/admin` for real-time updates.

### Client → Server Events

#### `subscribe:service-health`

Subscribe to service health updates.

```typescript
socket.emit('subscribe:service-health');
```

---

#### `subscribe:queue-stats`

Subscribe to queue statistics updates.

```typescript
socket.emit('subscribe:queue-stats');
```

---

#### `subscribe:logs`

Subscribe to log stream.

```typescript
socket.emit('subscribe:logs');
```

---

#### `ping`

Ping the server.

```typescript
socket.emit('ping');
```

**Response:**

```typescript
socket.on('pong', (data) => {
  console.log(data.timestamp);
});
```

---

### Server → Client Events

#### `service-health`

Emitted every 10 seconds with aggregated service health.

```typescript
socket.on('service-health', (data: AggregatedHealthDto) => {
  // Handle health update
});
```

---

#### `queue-stats`

Emitted every 5 seconds with queue statistics.

```typescript
socket.on('queue-stats', (data: QueueListResponseDto) => {
  // Handle queue stats
});
```

---

#### `pm2-update`

Emitted every 5 seconds with PM2 process updates.

```typescript
socket.on('pm2-update', (data: PM2ProcessListDto) => {
  // Handle PM2 update
});
```

---

#### `log-stream`

Emitted every 2 seconds with recent logs.

```typescript
socket.on('log-stream', (data: { logs: LogEntryDto[]; count: number; timestamp: string }) => {
  // Handle log entries
});
```

---

## TypeScript Interfaces

### ServiceDto

```typescript
interface ServiceDto {
  id: string;
  name: string;
  version: string;
  port: number;
  url: string;
  status: 'online' | 'degraded' | 'offline' | 'unknown';
  pm2Id?: number;
  health?: HealthCheckDto;
  metrics?: ServiceMetricsDto;
}
```

---

### PM2ProcessDto

```typescript
interface PM2ProcessDto {
  pm_id: number;
  name: string;
  status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored';
  pid: number;
  restarts: number;
  uptime: number;
  monit: {
    memory: number;
    cpu: number;
  };
  script?: string;
  interpreter?: string;
  nodeVersion?: string;
}
```

---

### LogEntryDto

```typescript
interface LogEntryDto {
  id: string;
  service: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}
```

---

### QueueDto

```typescript
interface QueueDto {
  name: string;
  vhost: string;
  durable: boolean;
  autoDelete: boolean;
  arguments?: Record<string, any>;
  stats: {
    messageCount: number;
    consumerCount: number;
    messagesReady?: number;
    messagesUnacknowledged?: number;
    publishRate?: number;
    deliveryRate?: number;
  };
  state?: string;
}
```

---

### FeatureFlagDto

```typescript
interface FeatureFlagDto {
  id: string;
  name: string;
  description: string;
  key: string;
  status: 'enabled' | 'disabled' | 'conditional';
  enabled: boolean;
  rollout?: {
    percentage: number;
    segments?: string[];
    userIds?: string[];
    environments?: string[];
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}
```

---

## Error Handling

All endpoints follow standard HTTP status codes:

### Success Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Resource deleted successfully

### Error Codes

- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Dependent service unavailable

### Error Response Format

```typescript
{
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
}
```

**Example:**

```json
{
  "statusCode": 404,
  "message": "Service with ID 'unknown-service' not found",
  "error": "Not Found",
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

---

## Example Client Usage

### REST API (Axios)

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3004/api',
  timeout: 10000,
});

// Get all services
const services = await apiClient.get('/services');

// Restart a service
const result = await apiClient.post('/services/auth/restart');

// Query logs
const logs = await apiClient.get('/logs', {
  params: {
    service: 'auth',
    level: 'error',
    limit: 50,
  },
});
```

---

### WebSocket (Socket.IO)

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3004/admin', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected to admin dashboard');

  // Subscribe to updates
  socket.emit('subscribe:service-health');
  socket.emit('subscribe:queue-stats');
});

socket.on('service-health', (data) => {
  console.log('Service health update:', data);
});

socket.on('queue-stats', (data) => {
  console.log('Queue stats update:', data);
});

socket.on('pm2-update', (data) => {
  console.log('PM2 update:', data);
});

socket.on('log-stream', (data) => {
  console.log('New logs:', data.logs);
});
```

---

## Notes for Frontend Development

1. **Base URL:** Configure `VITE_API_URL=http://localhost:3004` in frontend `.env`
2. **WebSocket URL:** Configure `VITE_WS_URL=ws://localhost:3004` in frontend `.env`
3. **CORS:** Backend is configured to allow `http://localhost:3000` by default
4. **Real-time Updates:** Use WebSocket events for dashboard real-time features
5. **Error Handling:** Implement proper error boundaries for API failures
6. **Loading States:** All API calls are asynchronous - handle loading states properly
7. **Polling Fallback:** If WebSocket fails, implement HTTP polling as fallback

---

**Last Updated:** 2025-10-19
**API Version:** 1.0.0
**Contact:** ORION Team - support@orion.com
