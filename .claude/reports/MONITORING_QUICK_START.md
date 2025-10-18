# Monitoring & Observability Quick Start Guide

## Installation

```bash
# Install all monitoring dependencies
pnpm add -w winston winston-daily-rotate-file nest-winston colors @sentry/node uuid

# Install dev dependencies
pnpm add -D -w @types/node @types/uuid
```

## Basic Setup (5 Minutes)

### 1. Configure Logger in Any Service

```typescript
// app.module.ts
import { LoggerModule } from '@orion/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      serviceName: 'your-service-name',
      level: 'info',
      pretty: process.env.NODE_ENV !== 'production',
      transports: ['console', 'file'],
      fileOptions: {
        filename: 'logs/app.log',
        errorFilename: 'logs/error.log',
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Add Correlation ID Middleware

```typescript
// main.ts
import { correlationIdMiddleware } from '@orion/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply correlation ID middleware FIRST
  app.use(correlationIdMiddleware);

  await app.listen(3000);
}
```

### 3. Use Logger in Services

```typescript
import { LoggerService } from '@orion/logger';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(dto: CreateUserDto) {
    this.logger.log('Creating user', undefined, { email: dto.email });

    try {
      const user = await this.repository.save(dto);
      this.logger.log('User created', undefined, { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, undefined, {
        email: dto.email,
      });
      throw error;
    }
  }
}
```

## Sentry Setup (Optional, 3 Minutes)

### 1. Get Sentry DSN
Sign up at https://sentry.io and create a project. Copy your DSN.

### 2. Configure Sentry

```typescript
// app.module.ts
import { SentryModule } from '@orion/shared/sentry';

@Module({
  imports: [
    SentryModule.forRoot({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    }),
  ],
})
export class AppModule {}
```

### 3. Add Global Interceptor

```typescript
// main.ts
import { SentryInterceptor, SentryExceptionFilter } from '@orion/shared/sentry';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const sentry = app.get(SentryService);
  app.useGlobalInterceptors(new SentryInterceptor(sentry));
  app.useGlobalFilters(new SentryExceptionFilter(sentry));

  await app.listen(3000);
}
```

### 4. Environment Variables

```env
# Required
SENTRY_DSN=https://xxx@sentry.io/xxx

# Optional
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Logging Best Practices

### ✅ DO

```typescript
// Good: Structured logging with metadata
this.logger.log('Order processed', undefined, {
  orderId: order.id,
  userId: order.userId,
  total: order.total,
});

// Good: Contextual error logging
this.logger.error('Payment failed', error.stack, undefined, {
  orderId: order.id,
  paymentMethod: payment.method,
});

// Good: Use correlation ID (automatic via middleware)
// Every log will include correlationId automatically
```

### ❌ DON'T

```typescript
// Bad: Unstructured logging
console.log('Order processed: ' + order.id);

// Bad: Logging sensitive data
this.logger.log('User login', undefined, {
  password: user.password, // NEVER log passwords
  creditCard: payment.card, // NEVER log payment details
});

// Bad: No context
this.logger.error('Error occurred'); // Too vague
```

## Log Levels Guide

| Level | When to Use | Example |
|-------|-------------|---------|
| `error` | Errors requiring immediate attention | Database connection failed, Payment processing error |
| `warn` | Warnings that might need attention | Rate limit approaching, Deprecated API usage |
| `info` | General informational messages | User logged in, Order created |
| `http` | HTTP request/response logs | Request received, Response sent |
| `debug` | Detailed debugging information | Variable values, Function entry/exit |
| `verbose` | Very detailed logs | Full request/response bodies |

## Testing Your Setup

### 1. Generate Test Logs

```typescript
// In any controller or service
this.logger.log('Test info message');
this.logger.warn('Test warning message');
this.logger.error('Test error message', 'stack trace here');
this.logger.debug('Test debug message', undefined, {
  testData: { foo: 'bar' },
});
```

### 2. Check Log Files

```bash
# View application logs
tail -f logs/app.log

# View error logs only
tail -f logs/error.log

# Search logs by correlation ID
grep "correlation-id-here" logs/app.log
```

### 3. Verify Correlation IDs

```bash
# Make a request with curl
curl -H "x-correlation-id: test-123" http://localhost:3000/api/users

# Check logs for the correlation ID
grep "test-123" logs/app.log
```

### 4. Test Sentry Integration

```typescript
// Throw a test error
throw new Error('Sentry test error');

// Or manually capture
this.sentry.captureMessage('Sentry is working!', 'info');
```

Then check your Sentry dashboard.

## Troubleshooting

### Logs Not Appearing

**Problem**: No logs in console or files

**Solution**:
```bash
# Check log level
echo $LOG_LEVEL  # Should be 'info' or lower

# Check file permissions
ls -la logs/

# Create logs directory if missing
mkdir -p logs
chmod 755 logs
```

### Correlation ID Not in Logs

**Problem**: Logs missing correlationId field

**Solution**:
```typescript
// Ensure middleware is applied BEFORE other middleware
app.use(correlationIdMiddleware);  // First!
app.use(otherMiddleware);           // After
```

### Sentry Not Capturing Errors

**Problem**: Errors not appearing in Sentry dashboard

**Checklist**:
- [ ] SENTRY_DSN is set correctly
- [ ] SENTRY_ENABLED=true (or not set)
- [ ] Network can reach sentry.io
- [ ] SentryInterceptor is applied globally
- [ ] Error is not in ignoreErrors list

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test logger.service.spec.ts

# Run in watch mode
pnpm test -- --watch
```

## Production Checklist

Before deploying to production:

- [ ] Set LOG_LEVEL=info (not debug or verbose)
- [ ] Enable log file rotation (configured by default)
- [ ] Set up log aggregation (ELK/Loki)
- [ ] Configure Sentry DSN
- [ ] Set SENTRY_ENVIRONMENT=production
- [ ] Configure SENTRY_RELEASE with Git SHA
- [ ] Test correlation ID propagation
- [ ] Verify sensitive data is sanitized
- [ ] Set up Sentry alerts
- [ ] Configure log retention policy

## Next Steps

1. ✅ Logger Service - **DONE**
2. ✅ Correlation ID Middleware - **DONE**
3. ✅ Sentry Integration - **DONE**
4. ⏳ OpenTelemetry Tracing - See [telemetry-service.md](../specs/telemetry-service.md)
5. ⏳ Prometheus Metrics - See [metrics-service.md](../specs/metrics-service.md)

## Documentation

- **Full Implementation Guide**: [monitoring-observability-implementation.md](./monitoring-observability-implementation.md)
- **Logger Spec**: [logger-service.md](../specs/logger-service.md)
- **Sentry Spec**: [sentry-integration.md](../specs/sentry-integration.md)
- **Telemetry Spec**: [telemetry-service.md](../specs/telemetry-service.md)
- **Metrics Spec**: [metrics-service.md](../specs/metrics-service.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the full specifications
3. Check test files for usage examples
4. Review Sentry/Winston documentation

---

**Quick Reference Card** - Print and keep handy!

```
LOGGING QUICK REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Basic Usage:
  this.logger.log(msg, context?, metadata?)
  this.logger.error(msg, stack?, context?, metadata?)

Correlation ID:
  Header: x-correlation-id
  Auto-injected in all logs

Log Files:
  App:   logs/app.log
  Error: logs/error.log

Environment:
  LOG_LEVEL=info
  LOG_PRETTY=false
  SENTRY_DSN=https://...

Commands:
  tail -f logs/app.log                    # Watch logs
  grep "correlation-id" logs/app.log      # Find by ID
  pnpm test -- --coverage                 # Test coverage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
