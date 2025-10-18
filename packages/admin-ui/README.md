# Admin UI Service

**Status:** 🚧 Under Reconstruction
**Version:** 2.0.0 (Rebuild)
**Spec:** See [.specs/admin-ui.spec.md](../../.specs/admin-ui.spec.md)

## Overview

The Admin UI service provides a comprehensive administrative interface for the ORION platform with:

- **REST API**: 13 observability endpoints for system monitoring
- **WebSocket Gateway**: Real-time updates via Socket.IO
- **React Frontend**: Modern dashboard with extensible widget system
- **Plugin Architecture**: Dynamic widget registration and extension

## Current Status

This package is being rebuilt from scratch following GitHub Spec Kit methodology and TDD practices.

### Completed
- ✅ Specification defined
- ✅ Directory structure created
- ✅ Test infrastructure prepared

### In Progress
- 🚧 Core API endpoints (Phase 1)
- 🚧 WebSocket gateway (Phase 1)
- 🚧 DTO definitions (Phase 1)

### Upcoming
- ⏳ Frontend foundation (Phase 2)
- ⏳ Widget system (Phase 3)
- ⏳ Documentation & polish (Phase 4)

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker (for development dependencies)

### Development
```bash
# Install dependencies (from monorepo root)
pnpm install

# Run in development mode
pnpm nx serve admin-ui

# Run tests
pnpm nx test admin-ui

# Run tests in watch mode
pnpm nx test admin-ui --watch

# Run e2e tests
pnpm nx e2e admin-ui-e2e
```

### Building
```bash
# Build for production
pnpm nx build admin-ui

# Build Docker image
docker build -f Dockerfile -t orion/admin-ui:latest .
```

## Architecture

### Backend (NestJS)
```
src/app/
├── controllers/     # REST API endpoints
├── services/        # Business logic
├── gateways/        # WebSocket handlers
├── dto/             # Data transfer objects
├── guards/          # Auth guards
├── config/          # Configuration
├── plugins/         # Widget plugin system
└── types/           # TypeScript types
```

### Frontend (React)
```
src/frontend/
├── components/      # Reusable UI components
├── widgets/         # Dashboard widgets
├── hooks/           # Custom React hooks
├── services/        # API clients
├── styles/          # Global styles
└── types/           # TypeScript types
```

## API Endpoints

See [API Reference](../../.specs/admin-ui.spec.md#api-specification) for complete documentation.

### System
- `GET /health` - Health check
- `GET /api/system/overview` - System overview
- `GET /api/system/stats` - System statistics

### Services
- `GET /api/services` - List all services
- `GET /api/services/:id` - Service details
- `GET /api/services/:id/metrics` - Service metrics
- `GET /api/services/:id/health` - Service health

### Events
- `GET /api/events` - List events
- `GET /api/events/:id` - Event details
- `POST /api/events/search` - Search events

### Observability
- `GET /api/observability/alerts` - Active alerts
- `GET /api/observability/metrics` - Platform metrics
- `GET /api/observability/traces` - Distributed traces

## WebSocket Events

### Subscribe
- `subscribe:system` - System updates
- `subscribe:service` - Service updates
- `subscribe:events` - Event stream

### Receive
- `system:update` - System stats (every 5s)
- `service:health` - Service health changes
- `event:created` - New events
- `alert:triggered` - New alerts

## Testing

This project follows TDD (Test-Driven Development) practices with 100% coverage target.

```bash
# Run all tests
pnpm nx test admin-ui

# Run specific test suite
pnpm nx test admin-ui --testFile=system.controller.spec.ts

# Coverage report
pnpm nx test admin-ui --coverage
```

## Contributing

See [GitHub Spec Kit Specification](../../.specs/admin-ui.spec.md) for:
- Acceptance criteria
- API contracts
- Widget development guide
- Testing requirements

## License

Proprietary - ORION Platform
