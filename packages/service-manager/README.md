# ORION Service Manager

A GUI-based service manager with PM2 integration for managing all ORION microservices.

## Features

- **Real-time Monitoring**: Live updates of service status, CPU, and memory usage
- **Service Control**: Start, stop, and restart services with a click
- **Process Management**: Powered by PM2 for robust process management
- **WebSocket Updates**: Real-time service metrics via Socket.io
- **Modern UI**: Built with React + TypeScript + Tailwind CSS

## Architecture

```
service-manager/
├── server/                 # Express + PM2 backend
│   └── index.ts           # REST API + WebSocket server
├── client/                # React frontend
│   ├── src/
│   │   ├── App.tsx        # Main dashboard component
│   │   ├── main.tsx       # React entry point
│   │   └── index.css      # Tailwind styles
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.js
└── ecosystem.config.js    # PM2 process configuration (project root)
```

## Prerequisites

- Node.js 18+
- PM2 installed globally: `npm install -g pm2`
- pnpm (recommended) or npm

## Installation

```bash
cd packages/service-manager
pnpm install
```

## Usage

### 1. Start PM2 Processes

From the project root:

```bash
pm2 start ecosystem.config.js
```

This starts all ORION services:
- auth (port 3010)
- ai-wrapper (port 3200)
- gateway (port 3100)
- admin-ui (port 3000)
- document-intelligence (port 3001)

### 2. Run the Service Manager

```bash
cd packages/service-manager
pnpm dev
```

This starts:
- **Backend Server**: http://localhost:3300 (Express + PM2 API)
- **Frontend GUI**: http://localhost:3301 (React + Vite)

### 3. Access the Dashboard

Open http://localhost:3301 in your browser.

## API Endpoints

### GET /api/services
Get list of all PM2 processes

**Response:**
```json
{
  "services": [
    {
      "name": "auth",
      "pid": 12345,
      "status": "online",
      "cpu": 2.5,
      "memory": 52428800,
      "uptime": 3600000,
      "restarts": 0
    }
  ]
}
```

### POST /api/services/:name/start
Start a service

**Response:**
```json
{
  "message": "Service auth started successfully"
}
```

### POST /api/services/:name/stop
Stop a service

**Response:**
```json
{
  "message": "Service auth stopped successfully"
}
```

### POST /api/services/:name/restart
Restart a service

**Response:**
```json
{
  "message": "Service auth restarted successfully"
}
```

## WebSocket Events

### Client → Server
- `connect`: Establish connection

### Server → Client
- `services-update`: Real-time service metrics (emitted every 2 seconds)

**Event Data:**
```typescript
interface Service {
  name: string;
  pid: number;
  status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored';
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}
```

## PM2 Commands

### List all processes
```bash
pm2 list
```

### Monitor processes
```bash
pm2 monit
```

### View logs
```bash
pm2 logs
pm2 logs auth
```

### Stop all processes
```bash
pm2 stop all
```

### Delete all processes
```bash
pm2 delete all
```

### Restart all processes
```bash
pm2 restart all
```

### Save PM2 configuration
```bash
pm2 save
```

### Auto-start on system boot
```bash
pm2 startup
```

## Development

### Backend Only
```bash
pnpm run server
```

### Frontend Only
```bash
pnpm run client
```

### Build for Production
```bash
pnpm run build
```

## Configuration

Edit `ecosystem.config.js` at the project root to:
- Add/remove services
- Configure environment variables
- Set memory limits
- Configure instance count
- Set auto-restart policies

**Example:**
```javascript
module.exports = {
  apps: [
    {
      name: 'my-service',
      script: 'dist/main.js',
      cwd: './packages/my-service',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        PORT: 3050,
        NODE_ENV: 'production'
      }
    }
  ]
};
```

## Troubleshooting

### PM2 not found
```bash
npm install -g pm2
```

### Services not showing up
Make sure PM2 processes are running:
```bash
pm2 list
```

### WebSocket disconnection
Check that the backend server is running on port 3300:
```bash
curl http://localhost:3300/api/services
```

### Port already in use
Change ports in:
- `server/index.ts` (backend)
- `client/vite.config.ts` (frontend)

## Integration with ORION Platform

The Service Manager integrates with:
- **Admin Dashboard** (`@orion/admin-ui`) - Link to service manager from admin UI
- **All Microservices** - Manage auth, gateway, AI wrapper, etc.
- **PM2 Ecosystem** - Centralized process configuration

## Tech Stack

**Backend:**
- Express.js - Web server
- PM2 - Process manager
- Socket.io - WebSocket server

**Frontend:**
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool
- Tailwind CSS - Styling
- Socket.io Client - Real-time updates

## License

MIT
