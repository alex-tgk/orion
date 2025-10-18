# Debugging Guide

This guide covers debugging tools, techniques, and common errors for the ORION platform.

## Table of Contents

1. [Debugging Tools](#debugging-tools)
2. [Log Analysis](#log-analysis)
3. [Common Errors](#common-errors)
4. [Performance Profiling](#performance-profiling)
5. [Database Debugging](#database-debugging)
6. [Network Debugging](#network-debugging)
7. [Production Debugging](#production-debugging)

## Debugging Tools

### VS Code Debugger

**Setup launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Auth Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["nx", "serve", "auth", "--inspect"],
      "port": 9229,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${file}", "--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

**Usage:**
1. Set breakpoints in VS Code (click left of line numbers)
2. Press F5 or click Run → Start Debugging
3. Code execution will pause at breakpoints
4. Use Debug Console to evaluate expressions

### Chrome DevTools

**For Node.js debugging:**

```bash
# Start with inspect flag
node --inspect-brk dist/main.js

# Or for NestJS
pnpm nx serve auth --inspect
```

**Access DevTools:**
1. Open Chrome and navigate to: `chrome://inspect`
2. Click "Inspect" under your Node.js process
3. Use Sources tab for breakpoints
4. Use Console tab for REPL
5. Use Profiler tab for performance analysis

### CLI Debugging

**Enable debug logging:**

```bash
# Set DEBUG environment variable
DEBUG=* pnpm dev:service auth

# Or specific namespace
DEBUG=orion:auth:* pnpm dev:service auth

# Multiple namespaces
DEBUG=orion:auth:*,orion:gateway:* pnpm dev
```

**Node.js debugger (built-in):**

```bash
# Start with debugger
node inspect dist/main.js

# Commands:
# c - continue
# n - next (step over)
# s - step into
# o - step out
# repl - enter REPL mode
```

### NestJS Debug Module

**Install:**

```bash
pnpm add @nestjs/devtools-integration
```

**Configure:**

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { DevToolsModule } from '@nestjs/devtools-integration';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true, // Enable devtools snapshot
  });
  await app.listen(3000);
}
bootstrap();

// app.module.ts
@Module({
  imports: [
    DevToolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

## Log Analysis

### Logging Levels

**Use appropriate log levels:**

```typescript
// TRACE - Very detailed information
this.logger.trace('Entering method', { userId, params });

// DEBUG - Diagnostic information
this.logger.debug('Processing user authentication', { email });

// INFO - General information
this.logger.log('User logged in successfully', { userId });

// WARN - Warning conditions
this.logger.warn('Rate limit approaching', { userId, current: 90, limit: 100 });

// ERROR - Error conditions
this.logger.error('Failed to send email', { error: error.message, userId });

// FATAL - System unusable
this.logger.fatal('Database connection lost', { error });
```

### Structured Logging

**Use Winston or Pino for structured logs:**

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log('Creating user', {
      email: createUserDto.email,
      timestamp: new Date().toISOString(),
    });

    try {
      const user = await this.userRepository.create(createUserDto);

      this.logger.log('User created successfully', {
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      this.logger.error('Failed to create user', {
        email: createUserDto.email,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

### Log Aggregation

**View logs across all services:**

```bash
# Docker Compose logs
docker compose logs -f

# Specific service
docker compose logs -f auth

# Last 100 lines
docker compose logs --tail=100

# Follow logs with grep
docker compose logs -f | grep ERROR

# Save logs to file
docker compose logs > logs.txt
```

### Log Filtering

**Using jq for JSON logs:**

```bash
# Filter by level
docker compose logs auth | jq 'select(.level == "error")'

# Filter by message
docker compose logs auth | jq 'select(.message | contains("authentication"))'

# Extract specific fields
docker compose logs auth | jq '{time: .timestamp, msg: .message, user: .userId}'

# Count errors
docker compose logs auth | jq 'select(.level == "error")' | wc -l
```

## Common Errors

### Authentication Errors

**Error: "Unauthorized" / 401**

**Symptoms:**
```
UnauthorizedException: Unauthorized
```

**Causes:**
1. Invalid JWT token
2. Expired token
3. Missing Authorization header
4. Token revoked/blacklisted

**Debug:**
```typescript
// Add logging to JWT strategy
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload) {
    this.logger.debug('Validating JWT payload', { payload });

    const user = await this.userService.findById(payload.sub);

    if (!user) {
      this.logger.warn('User not found for JWT', { userId: payload.sub });
      throw new UnauthorizedException('User not found');
    }

    this.logger.debug('JWT validation successful', { userId: user.id });
    return user;
  }
}
```

**Solutions:**
```bash
# Check token validity
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/auth/profile

# Decode JWT (without validation)
echo "YOUR_TOKEN" | cut -d'.' -f2 | base64 -d | jq

# Check token expiration
node -e "console.log(new Date(JSON.parse(Buffer.from('PAYLOAD'.split('.')[1], 'base64').toString()).exp * 1000))"
```

### Database Errors

**Error: "Connection refused" / ECONNREFUSED**

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causes:**
1. PostgreSQL not running
2. Wrong connection string
3. Network issues
4. Firewall blocking connection

**Debug:**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check connection
psql -h localhost -U orion -d orion_dev

# Test connection from Node
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(console.log).catch(console.error);"

# Check DATABASE_URL
echo $DATABASE_URL
```

**Solutions:**
```bash
# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker compose logs postgres

# Verify connection string format
# postgresql://username:password@host:port/database
```

**Error: "Relation does not exist"**

**Symptoms:**
```
error: relation "users" does not exist
```

**Causes:**
1. Migrations not run
2. Wrong database schema
3. Table name mismatch

**Debug:**
```bash
# Check migrations
npx prisma migrate status

# List tables
psql -U orion -d orion_dev -c "\dt"

# Check schema
npx prisma studio
```

**Solutions:**
```bash
# Run migrations
npx prisma migrate dev

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Redis Errors

**Error: "Redis connection lost"**

**Symptoms:**
```
Error: Redis connection to localhost:6379 failed - connect ECONNREFUSED
```

**Debug:**
```bash
# Check if Redis is running
docker compose ps redis

# Test Redis connection
redis-cli ping

# Check Redis logs
docker compose logs redis

# Monitor Redis commands
redis-cli monitor
```

**Solutions:**
```bash
# Restart Redis
docker compose restart redis

# Clear Redis cache
redis-cli FLUSHALL

# Check memory usage
redis-cli INFO memory
```

### Memory Leaks

**Symptoms:**
- Service crashes with "Out of memory"
- Memory usage continuously increasing
- Performance degradation over time

**Debug:**

```bash
# Monitor memory usage
node --max-old-space-size=4096 --inspect dist/main.js

# Generate heap snapshot
node --inspect dist/main.js
# In Chrome DevTools: Memory → Take snapshot

# Profile memory allocation
node --prof dist/main.js
```

**Common causes:**
1. Event listeners not removed
2. Circular references
3. Large arrays/objects not cleared
4. Database connection leaks
5. Unresolved promises

**Solutions:**

```typescript
// ✅ Clean up event listeners
export class MyService implements OnModuleDestroy {
  private eventListeners = [];

  constructor(private eventEmitter: EventEmitter2) {
    const listener = this.eventEmitter.on('event', this.handler);
    this.eventListeners.push(listener);
  }

  onModuleDestroy() {
    this.eventListeners.forEach((listener) => listener.off());
  }
}

// ✅ Clear large objects
async processLargeDataset(data: any[]) {
  for (const item of data) {
    await this.process(item);
  }
  data = null; // Clear reference
}

// ✅ Close database connections
async onModuleDestroy() {
  await this.prisma.$disconnect();
}
```

## Performance Profiling

### CPU Profiling

**Using Node.js profiler:**

```bash
# Generate profile
node --prof dist/main.js

# Process profile
node --prof-process isolate-0x*.log > profile.txt

# Analyze profile
cat profile.txt | grep -A 10 "Statistical profiling result"
```

**Using clinic.js:**

```bash
# Install
pnpm add -D clinic

# Doctor (detects event loop issues)
clinic doctor -- node dist/main.js

# Flame (CPU profiling)
clinic flame -- node dist/main.js

# Bubbleprof (async operations)
clinic bubbleprof -- node dist/main.js
```

### Application Performance Monitoring

**Using NestJS Metrics:**

```typescript
import { Injectable } from '@nestjs/common';
import * as prometheus from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestDuration = new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
  });

  recordRequest(method: string, route: string, duration: number, status: number) {
    this.httpRequestDuration
      .labels(method, route, status.toString())
      .observe(duration / 1000);
  }

  getMetrics() {
    return prometheus.register.metrics();
  }
}
```

**Track request timing:**

```typescript
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();

        this.metrics.recordRequest(
          request.method,
          request.route.path,
          duration,
          response.statusCode,
        );

        if (duration > 1000) {
          this.logger.warn('Slow request detected', {
            method: request.method,
            path: request.route.path,
            duration,
          });
        }
      }),
    );
  }
}
```

### Database Query Performance

**Enable query logging:**

```typescript
// prisma.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');

  if (e.duration > 100) {
    console.warn('Slow query detected!', e);
  }
});
```

**Analyze query plans:**

```sql
-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'users';

-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY abs(correlation) DESC;
```

## Database Debugging

### Prisma Studio

**Visual database explorer:**

```bash
# Open Prisma Studio
npx prisma studio

# Access at http://localhost:5555
```

### Database Queries

**Useful diagnostic queries:**

```sql
-- Active connections
SELECT * FROM pg_stat_activity WHERE datname = 'orion_dev';

-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
AND state = 'active';

-- Kill long-running query
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Network Debugging

### HTTP Requests

**Using curl:**

```bash
# Basic request
curl -v http://localhost:3000/api/auth/login

# POST with JSON
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123"}'

# With authentication
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/users/profile

# Show timing information
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/users

# curl-format.txt:
# time_namelookup: %{time_namelookup}\n
# time_connect: %{time_connect}\n
# time_appconnect: %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect: %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total: %{time_total}\n
```

### WebSocket Debugging

**Using wscat:**

```bash
# Install
pnpm add -g wscat

# Connect
wscat -c ws://localhost:3000

# With authentication
wscat -c ws://localhost:3000 -H "Authorization: Bearer TOKEN"

# Send messages
> {"event": "subscribe", "data": {"channel": "notifications"}}
```

### Network Traffic

**Using tcpdump:**

```bash
# Capture HTTP traffic
sudo tcpdump -i any -A 'tcp port 3000'

# Save to file
sudo tcpdump -i any -w capture.pcap 'tcp port 3000'

# Analyze with Wireshark
wireshark capture.pcap
```

## Production Debugging

### Health Checks

```bash
# Check service health
curl http://localhost:3000/health

# Check readiness
curl http://localhost:3000/health/ready

# Check liveness
curl http://localhost:3000/health/live
```

### Metrics Endpoint

```bash
# Prometheus metrics
curl http://localhost:3000/metrics

# Parse specific metric
curl http://localhost:3000/metrics | grep http_request_duration
```

### Remote Debugging

**For Kubernetes pods:**

```bash
# Port forward
kubectl port-forward pod/auth-service-xxx 9229:9229

# Attach VS Code debugger to localhost:9229
```

### Error Tracking

**Using Sentry:**

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Capture exceptions
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  throw error;
}

// Add breadcrumbs
Sentry.addBreadcrumb({
  message: 'User action',
  level: 'info',
  data: { userId: user.id },
});
```

## Troubleshooting Workflow

### Step-by-Step Process

1. **Reproduce the issue**
   - Document exact steps to reproduce
   - Note environment (dev/staging/prod)
   - Capture error messages

2. **Check logs**
   - Application logs
   - Database logs
   - System logs

3. **Isolate the problem**
   - Is it service-specific?
   - Is it environment-specific?
   - Is it data-specific?

4. **Form hypothesis**
   - What could cause this?
   - What changed recently?

5. **Test hypothesis**
   - Add debug logging
   - Use debugger
   - Check metrics

6. **Fix and verify**
   - Apply fix
   - Test thoroughly
   - Monitor in production

### Useful Commands

```bash
# System diagnostics
pnpm diagnose

# Health check
pnpm health

# View logs
docker compose logs -f <service>

# Check database
npx prisma studio

# Check Redis
redis-cli monitor

# Network check
curl -v http://localhost:3000/health

# Memory usage
node --max-old-space-size=4096 dist/main.js

# CPU profiling
clinic doctor -- node dist/main.js
```

---

**Remember:** Good debugging is systematic. Don't guess - gather data, form hypotheses, and test them methodically!
