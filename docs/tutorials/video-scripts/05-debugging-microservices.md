# Tutorial 05: Debugging Distributed Microservices

**Duration**: 22 minutes
**Level**: Intermediate to Advanced
**Prerequisites**: Tutorials 01-04 completed

## Learning Objectives

- Debug Node.js microservices with VS Code
- Use distributed tracing for request flows
- Analyze logs effectively with aggregation
- Debug race conditions and timing issues
- Profile performance bottlenecks
- Use debugging tools specific to NestJS

## Tutorial Outline

### Part 1: Local Debugging with VS Code (6 minutes)
### Part 2: Distributed Tracing (6 minutes)
### Part 3: Log Aggregation & Analysis (4 minutes)
### Part 4: Advanced Debugging Techniques (4 minutes)
### Part 5: Performance Profiling (2 minutes)

---

## Part 1: Local Debugging with VS Code

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Task Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:service", "task"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Setting Breakpoints

```typescript
// packages/task/src/app/app.service.ts

async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
  // Set breakpoint here (F9)
  debugger; // Or use explicit debugger statement
  
  if (createTaskDto.dueDate && new Date(createTaskDto.dueDate) < new Date()) {
    throw new ForbiddenException('Due date must be in the future');
  }

  return this.prisma.task.create({
    data: {
      ...createTaskDto,
      userId,
    },
  });
}
```

### Conditional Breakpoints

Right-click breakpoint → Edit Breakpoint:
- **Expression**: `userId === 'specific-user-id'`
- **Hit Count**: `> 5`
- **Log Message**: `Task created for user {userId}`

---

## Part 2: Distributed Tracing

### Installing OpenTelemetry

```bash
pnpm add @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-jaeger
```

### Tracing Configuration

```typescript
// packages/shared/src/tracing/tracer.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const initTracing = (serviceName: string) => {
  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new JaegerExporter({
      endpoint: 'http://localhost:14268/api/traces',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  
  process.on('SIGTERM', () => {
    sdk.shutdown().then(() => console.log('Tracing terminated'));
  });
};
```

### Using Spans

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('task-service');

async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
  const span = tracer.startSpan('create-task');
  
  try {
    span.setAttribute('user.id', userId);
    span.setAttribute('task.title', createTaskDto.title);
    
    const task = await this.prisma.task.create({
      data: { ...createTaskDto, userId },
    });
    
    span.setStatus({ code: 0 }); // Success
    return task;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

### Viewing Traces in Jaeger

```bash
# Start Jaeger
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 14250:14250 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest

# Open UI
open http://localhost:16686
```

---

## Part 3: Log Aggregation

### Structured Logging

```typescript
// packages/shared/src/logger/logger.service.ts

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class StructuredLogger implements LoggerService {
  private logger: winston.Logger;

  constructor(private serviceName: string) {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }
}
```

### Log Correlation

```typescript
// Add correlation ID middleware
import { v4 as uuidv4 } from 'uuid';

export function correlationMiddleware(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  
  // Add to logger context
  req.logger = logger.child({ correlationId: req.correlationId });
  
  next();
}
```

---

## Part 4: Advanced Debugging

### Debugging Race Conditions

```typescript
// Use Promise.race for timeout detection
async findTaskWithTimeout(id: string, timeoutMs = 5000) {
  const taskPromise = this.prisma.task.findUnique({ where: { id } });
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs);
  });
  
  return Promise.race([taskPromise, timeoutPromise]);
}
```

### Memory Leak Detection

```bash
# Run with heap snapshot
node --expose-gc --inspect dist/main.js

# Take heap snapshots during debugging
# In Chrome DevTools: Memory → Take Snapshot
```

### Debugging Async Issues

```typescript
// Enable async stack traces
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

// Trace async operations
asyncLocalStorage.run(new Map(), () => {
  const store = asyncLocalStorage.getStore();
  store.set('requestId', req.id);
  // ... rest of request handling
});
```

---

## Part 5: Performance Profiling

### CPU Profiling

```bash
# Start with profiling enabled
node --prof dist/main.js

# Generate human-readable output
node --prof-process isolate-0x*.log > profile.txt
```

### Using Clinic.js

```bash
pnpm add -D clinic

# Profile CPU
clinic doctor -- node dist/main.js

# Profile event loop
clinic bubbleprof -- node dist/main.js

# Flame graphs
clinic flame -- node dist/main.js
```

---

## Common Debugging Scenarios

### 1. Service Not Receiving Messages

**Check:**
- Message queue connection
- Topic/queue names
- Message serialization
- Consumer registration

```bash
# Check Redis connection
redis-cli ping

# Monitor queue
redis-cli MONITOR
```

### 2. Slow Database Queries

**Debug:**
```typescript
// Enable query logging
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### 3. Memory Leaks

**Tools:**
- Chrome DevTools Memory Profiler
- `process.memoryUsage()`
- Heap snapshots comparison

```typescript
// Log memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
  });
}, 30000);
```

---

## Commands Reference

```bash
# Debug with VS Code
# Press F5 or use Debug panel

# Attach to running process
node --inspect dist/main.js

# Remote debugging
node --inspect=0.0.0.0:9229 dist/main.js

# CPU profiling
node --prof dist/main.js
node --prof-process isolate-*.log > profile.txt

# Heap snapshot
node --inspect dist/main.js
# Chrome DevTools → Memory → Take Snapshot

# Trace async
node --trace-warnings dist/main.js

# GC logging
node --trace-gc dist/main.js
```

---

**Script Version**: 1.0
**Last Updated**: October 2025
