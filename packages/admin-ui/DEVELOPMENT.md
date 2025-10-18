# ORION Admin UI - Development Guide

Complete guide for developing and extending the ORION Admin UI with custom widgets, APIs, and features.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Workflow](#development-workflow)
3. [Creating Widgets](#creating-widgets)
4. [Adding API Endpoints](#adding-api-endpoints)
5. [WebSocket Integration](#websocket-integration)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+
- pnpm
- TypeScript knowledge
- NestJS basics
- React basics

# Optional but recommended
- Docker (for Redis)
- PostgreSQL knowledge
- WebSocket understanding
```

### Initial Setup

```bash
# 1. Install dependencies (from workspace root)
pnpm install

# 2. Start development server
nx serve admin-ui

# 3. Access the application
open http://localhost:3000

# 4. View API documentation
open http://localhost:3000/api/docs
```

### Project Structure

```
packages/admin-ui/
├── src/
│   ├── app/                          # Backend (NestJS)
│   │   ├── controllers/              # REST API endpoints
│   │   ├── services/                 # Business logic
│   │   ├── gateways/                 # WebSocket handlers
│   │   ├── dto/                      # Data transfer objects
│   │   ├── plugins/                  # Plugin system
│   │   │   ├── registry/             # Widget registry
│   │   │   ├── interfaces/           # Plugin contracts
│   │   │   └── decorators/           # Plugin decorators
│   │   └── extensions/               # Custom widgets/features
│   │       └── widgets/              # Your custom widgets
│   │
│   └── frontend/                     # Frontend (React)
│       ├── components/               # Reusable UI components
│       ├── widgets/                  # Widget components
│       ├── services/                 # Frontend services
│       ├── hooks/                    # React hooks
│       └── styles/                   # Global styles
│
├── examples/                         # Example implementations
│   ├── widgets/                      # Example widgets
│   └── api-endpoints/                # Example endpoints
│
├── templates/                        # Widget templates
│   └── widget/                       # Widget starter template
│
├── EXTENDING.md                      # Extension guide
├── DEVELOPMENT.md                    # This file
├── QUICKSTART.md                     # Quick reference
└── README.md                         # Overview
```

---

## Development Workflow

### 1. Start Development Environment

```bash
# Terminal 1: Start backend
nx serve admin-ui

# Terminal 2: Watch frontend changes (if needed)
nx build admin-ui --watch

# Terminal 3: Run tests in watch mode
nx test admin-ui --watch
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/my-new-widget
```

### 3. Develop Your Feature

Follow the guides below based on what you're building:
- **Widget** → See [Creating Widgets](#creating-widgets)
- **API** → See [Adding API Endpoints](#adding-api-endpoints)
- **Real-time** → See [WebSocket Integration](#websocket-integration)

### 4. Test Your Changes

```bash
# Run unit tests
nx test admin-ui

# Run e2e tests
nx e2e admin-ui-e2e

# Manual testing
# - Test in browser
# - Test API endpoints with curl/Postman
# - Check Swagger docs
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: add new widget for X"
git push origin feature/my-new-widget
```

---

## Creating Widgets

### Method 1: Using the Template (Recommended)

```bash
# 1. Copy template
cd packages/admin-ui
cp -r templates/widget src/app/extensions/widgets/my-widget

# 2. Run replacement script
cd src/app/extensions/widgets/my-widget
find . -type f -exec sed -i '' 's/__WIDGET_NAME__/my-widget/g' {} +
find . -type f -exec sed -i '' 's/WidgetName/MyWidget/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_DESCRIPTION/My Custom Widget/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_CATEGORY/analytics/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_ICON/chart-line/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_VERSION/1.0.0/g' {} +

# 3. Rename files
mv __WIDGET_NAME__.module.ts my-widget.module.ts
mv __WIDGET_NAME__.controller.ts my-widget.controller.ts
mv __WIDGET_NAME__.service.ts my-widget.service.ts

# 4. Import in app module
# Edit src/app/app.module.ts and add:
# import { MyWidgetModule } from './extensions/widgets/my-widget/my-widget.module';
```

### Method 2: Manual Creation

#### Step 1: Create Module Structure

```typescript
// src/app/extensions/widgets/my-widget/my-widget.module.ts
import { Module } from '@nestjs/common';
import { MyWidgetController } from './my-widget.controller';
import { MyWidgetService } from './my-widget.service';
import { WidgetRegistry } from '../../plugins/registry/widget.registry';

@Module({
  controllers: [MyWidgetController],
  providers: [MyWidgetService],
})
export class MyWidgetModule {
  constructor(private readonly registry: WidgetRegistry) {
    this.registry.register({
      id: 'my-widget',
      name: 'My Custom Widget',
      version: '1.0.0',
      description: 'A custom widget',
      category: 'analytics',
      icon: 'chart-line',
      defaultSize: { width: 6, height: 4 },
    });
  }
}
```

#### Step 2: Create Service

```typescript
// my-widget.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MyWidgetService {
  private readonly logger = new Logger(MyWidgetService.name);

  async fetchData(config?: any) {
    // Your data fetching logic
    return {
      success: true,
      data: { /* your data */ },
      timestamp: new Date().toISOString(),
    };
  }

  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        refreshInterval: {
          type: 'number',
          default: 5000,
        },
      },
    };
  }
}
```

#### Step 3: Create Controller

```typescript
// my-widget.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MyWidgetService } from './my-widget.service';

@ApiTags('My Widget')
@Controller('widgets/my-widget')
export class MyWidgetController {
  constructor(private readonly service: MyWidgetService) {}

  @Get('data')
  @ApiOperation({ summary: 'Get widget data' })
  async getData(@Query() config?: any) {
    return this.service.fetchData(config);
  }
}
```

#### Step 4: Create Frontend Component

```typescript
// frontend/MyWidget.tsx
import React, { useState, useEffect } from 'react';

export const MyWidget: React.FC<{ config: any }> = ({ config }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('/api/widgets/my-widget/data');
      const result = await response.json();
      setData(result.data);
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, config.refreshInterval);
    return () => clearInterval(interval);
  }, [config]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="my-widget">
      <h3>My Custom Widget</h3>
      {/* Render your data */}
    </div>
  );
};
```

### Widget Development Checklist

- [ ] Module created and registered
- [ ] Service implements data fetching
- [ ] Controller exposes API endpoints
- [ ] DTOs defined for request/response
- [ ] Frontend component created
- [ ] Styles added
- [ ] Configuration schema defined
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Tests written
- [ ] Documentation updated
- [ ] Widget tested in browser

---

## Adding API Endpoints

### Creating a New Controller

```typescript
// src/app/controllers/custom.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Custom API')
@Controller('api/custom')
export class CustomController {
  @Get('data')
  @ApiOperation({ summary: 'Get custom data' })
  async getData() {
    return { message: 'Custom data' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item by ID' })
  async getById(@Param('id') id: string) {
    return { id, data: 'Item data' };
  }

  @Post('create')
  @ApiOperation({ summary: 'Create new item' })
  async create(@Body() data: any) {
    return { success: true, id: 'new-id' };
  }
}
```

### Adding to Module

```typescript
// app.module.ts
import { CustomController } from './controllers/custom.controller';

@Module({
  controllers: [
    // ... existing controllers
    CustomController,
  ],
})
export class AppModule {}
```

### API Best Practices

1. **Use DTOs for validation**

```typescript
// dto/create-item.dto.ts
import { IsString, IsNumber, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  value: number;
}

// In controller
@Post('create')
async create(@Body() data: CreateItemDto) {
  // data is validated
}
```

2. **Document with Swagger**

```typescript
@ApiOperation({
  summary: 'Create item',
  description: 'Creates a new item with validation',
})
@ApiResponse({
  status: 201,
  description: 'Item created successfully',
  type: ItemDto,
})
@ApiResponse({
  status: 400,
  description: 'Validation failed',
})
@Post('create')
async create(@Body() data: CreateItemDto) {
  // ...
}
```

3. **Implement error handling**

```typescript
@Get(':id')
async getById(@Param('id') id: string) {
  const item = await this.service.findById(id);

  if (!item) {
    throw new NotFoundException(`Item ${id} not found`);
  }

  return item;
}
```

---

## WebSocket Integration

### Creating a Gateway

```typescript
// src/app/gateways/my-events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'my-events',
  cors: { origin: '*' },
})
export class MyEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(MyEventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, data: any) {
    this.logger.log(`Client ${client.id} subscribed`);
    return { event: 'subscribed', data: { success: true } };
  }

  // Broadcast to all clients
  broadcastUpdate(data: any) {
    this.server.emit('update', data);
  }

  // Send to specific client
  sendToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }
}
```

### Frontend WebSocket Client

```typescript
import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

export const useWebSocket = (namespace: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(`http://localhost:3000/${namespace}`, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('subscribe');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [namespace]);

  return { socket, connected };
};

// Usage in component
const { socket, connected } = useWebSocket('my-events');

useEffect(() => {
  if (!socket) return;

  socket.on('update', (data) => {
    console.log('Update received:', data);
  });
}, [socket]);
```

---

## Testing

### Unit Tests

```typescript
// my-widget.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MyWidgetService } from './my-widget.service';

describe('MyWidgetService', () => {
  let service: MyWidgetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyWidgetService],
    }).compile();

    service = module.get<MyWidgetService>(MyWidgetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch data successfully', async () => {
    const result = await service.fetchData({});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// my-widget.controller.spec.ts
import { Test } from '@nestjs/testing';
import { MyWidgetController } from './my-widget.controller';
import { MyWidgetService } from './my-widget.service';

describe('MyWidgetController', () => {
  let controller: MyWidgetController;
  let service: MyWidgetService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MyWidgetController],
      providers: [MyWidgetService],
    }).compile();

    controller = module.get(MyWidgetController);
    service = module.get(MyWidgetService);
  });

  it('should return widget data', async () => {
    const result = await controller.getData({});

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('data');
  });
});
```

### Running Tests

```bash
# Run all tests
nx test admin-ui

# Run with coverage
nx test admin-ui --coverage

# Run specific file
nx test admin-ui --testFile=my-widget.service.spec.ts

# Watch mode
nx test admin-ui --watch
```

---

## Deployment

### Production Build

```bash
# Build the application
nx build admin-ui --configuration=production

# Output will be in dist/packages/admin-ui/
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY dist/packages/admin-ui ./

# Install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "main.js"]
```

### Environment Variables

```bash
# Production .env
NODE_ENV=production
PORT=3000
REDIS_HOST=redis
REDIS_PORT=6379
CORS_ORIGIN=https://yourdomain.com
```

---

## Best Practices

### Code Organization

1. **One widget per directory**
```
widgets/
  my-widget/
    my-widget.module.ts
    my-widget.controller.ts
    my-widget.service.ts
    my-widget.gateway.ts
    dto/
    frontend/
    tests/
```

2. **Use DTOs for all data transfer**
3. **Keep services focused** - Single responsibility
4. **Document all public APIs** - Use Swagger decorators

### Performance

1. **Implement caching** - Use Redis or in-memory cache
2. **Paginate large datasets** - Don't return all records
3. **Use WebSockets wisely** - Only for real-time data
4. **Optimize frontend** - React.memo, useMemo, useCallback

### Security

1. **Validate all inputs** - Use class-validator
2. **Sanitize error messages** - Don't leak sensitive info
3. **Implement authentication** - Use JWT guards
4. **Set CORS properly** - Don't use '*' in production

### Monitoring

1. **Add logging** - Use NestJS Logger
2. **Track metrics** - Response times, error rates
3. **Health checks** - Implement /health endpoints
4. **Error tracking** - Integrate Sentry or similar

---

## Common Issues

### Widget Not Loading

**Problem**: Widget appears in registry but doesn't load
**Solution**: Check browser console, verify:
- Module is imported in app.module.ts
- Widget ID matches registration
- API endpoints are accessible
- No TypeScript errors

### WebSocket Not Connecting

**Problem**: WebSocket connection fails
**Solution**:
- Check CORS configuration
- Verify port is correct
- Ensure Socket.IO versions match
- Check firewall/proxy settings

### Styles Not Applied

**Problem**: Widget looks unstyled
**Solution**:
- Verify CSS file is imported
- Check Tailwind is processing styles
- Clear browser cache
- Ensure class names match

---

## Additional Resources

- [EXTENDING.md](./EXTENDING.md) - Comprehensive extension guide
- [QUICKSTART.md](./QUICKSTART.md) - Quick reference guide
- [examples/widgets/](./examples/widgets/) - Example implementations
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)

---

## Getting Help

1. Check existing documentation
2. Review example widgets
3. Search issues on GitHub
4. Ask in developer Discord
5. Create a GitHub issue

Happy developing! 🚀
