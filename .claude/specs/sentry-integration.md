# Sentry Integration Specification

## Overview
Enterprise-grade error tracking and monitoring for ORION microservices using Sentry with NestJS integration, automatic error capture, and performance monitoring.

## Technical Stack
- **@sentry/node**: Sentry SDK for Node.js
- **@sentry/integrations**: Additional integrations
- **@sentry/tracing**: Performance monitoring
- **NestJS Interceptors**: Automatic error capture

## Architecture

### Sentry Package Structure
```
packages/shared/src/sentry/
├── sentry.module.ts              # NestJS module
├── sentry.service.ts             # Sentry service wrapper
├── interceptors/
│   ├── sentry.interceptor.ts     # Global error interceptor
│   └── sentry-performance.interceptor.ts
├── filters/
│   └── sentry-exception.filter.ts
├── decorators/
│   ├── sentry-transaction.decorator.ts
│   └── capture-exception.decorator.ts
├── interfaces/
│   ├── sentry-config.interface.ts
│   └── sentry-context.interface.ts
└── __tests__/
    ├── sentry.service.spec.ts
    ├── sentry.interceptor.spec.ts
    └── sentry-exception.filter.spec.ts
```

## Core Features

### 1. Automatic Error Capture
- Uncaught exceptions
- Unhandled promise rejections
- HTTP errors (4xx, 5xx)
- Business logic errors
- Database errors

### 2. Error Context Enrichment
**Standard Context**:
```typescript
{
  user: {
    id: string;
    email: string;
    username: string;
  },
  tags: {
    service: string;
    environment: string;
    correlationId: string;
    endpoint: string;
    method: string;
  },
  extra: {
    requestBody: any;
    queryParams: any;
    headers: Record<string, string>;
    responseStatus: number;
  },
  breadcrumbs: [
    {
      timestamp: number;
      message: string;
      category: string;
      level: 'info' | 'warning' | 'error';
      data: any;
    }
  ]
}
```

### 3. Performance Monitoring
- Transaction tracking
- Database query performance
- HTTP request duration
- Custom performance metrics
- Slow query detection

### 4. Release Tracking
- Git commit SHA
- Semantic versioning
- Deploy environment
- Release notes integration

## API Design

### SentryService Interface
```typescript
export class SentryService {
  // Error capture
  captureException(exception: Error, context?: SentryContext): string;
  captureMessage(message: string, level?: SeverityLevel, context?: SentryContext): string;

  // Context management
  setUser(user: { id: string; email?: string; username?: string }): void;
  setTag(key: string, value: string): void;
  setTags(tags: Record<string, string>): void;
  setExtra(key: string, value: any): void;
  setContext(name: string, context: Record<string, any>): void;

  // Breadcrumbs
  addBreadcrumb(breadcrumb: Breadcrumb): void;

  // Performance monitoring
  startTransaction(name: string, op: string): Transaction;

  // Scope management
  withScope(callback: (scope: Scope) => void): void;

  // Manual flushing
  flush(timeout?: number): Promise<boolean>;
}
```

### SentryModule Configuration
```typescript
SentryModule.forRoot({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_COMMIT_SHA,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express(),
  ],
  beforeSend: (event) => {
    // Sanitize sensitive data
    return sanitizeEvent(event);
  },
  ignoreErrors: [
    'NotFoundException',
    'BadRequestException',
  ],
})
```

## Implementation Requirements

### 1. Sentry Initialization
- Environment-based DSN configuration
- Release tracking with Git SHA
- Custom integrations setup
- Before-send hooks for data sanitization

### 2. NestJS Integration
- Global exception filter
- Request/response interceptors
- User context from JWT tokens
- Correlation ID tagging

### 3. Performance Monitoring
- Automatic HTTP transaction tracking
- Database query instrumentation
- Custom transaction decorators
- Performance budget alerts

### 4. Error Filtering
- Ignore expected errors (404, validation)
- Rate limiting for repeated errors
- Sampling for high-volume errors
- PII redaction

### 5. Context Enrichment
- Request metadata (method, URL, headers)
- User information from authentication
- Service name and version
- Environment and deployment info

## Configuration Options

### Environment Variables
```env
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0-abc123
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_DEBUG=false
SENTRY_ENABLED=true
```

### Configuration Interface
```typescript
interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  serverName?: string;
  tracesSampleRate: number;
  profilesSampleRate?: number;
  debug?: boolean;
  enabled?: boolean;
  integrations?: Integration[];
  beforeSend?: (event: Event) => Event | null;
  ignoreErrors?: (string | RegExp)[];
  denyUrls?: (string | RegExp)[];
  maxBreadcrumbs?: number;
  attachStacktrace?: boolean;
}
```

## Usage Examples

### Global Setup (main.ts)
```typescript
import { SentryModule } from '@orion/shared/sentry';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply Sentry interceptor globally
  app.useGlobalInterceptors(new SentryInterceptor());

  // Apply Sentry exception filter
  app.useGlobalFilters(new SentryExceptionFilter());

  await app.listen(3000);
}
```

### Manual Error Capture
```typescript
@Injectable()
export class PaymentService {
  constructor(private readonly sentry: SentryService) {}

  async processPayment(payment: PaymentDto): Promise<Payment> {
    try {
      return await this.paymentGateway.charge(payment);
    } catch (error) {
      this.sentry.captureException(error, {
        tags: {
          paymentMethod: payment.method,
          amount: payment.amount.toString(),
        },
        extra: {
          paymentId: payment.id,
          customerId: payment.customerId,
        },
      });
      throw new PaymentFailedException();
    }
  }
}
```

### Performance Monitoring
```typescript
@Injectable()
export class UserService {
  constructor(private readonly sentry: SentryService) {}

  @SentryTransaction('user.registration')
  async registerUser(dto: RegisterUserDto): Promise<User> {
    const transaction = this.sentry.startTransaction(
      'user.registration',
      'user.operation'
    );

    try {
      // Span for database operation
      const dbSpan = transaction.startChild({
        op: 'db.query',
        description: 'Create user in database',
      });

      const user = await this.userRepository.save(dto);
      dbSpan.finish();

      // Span for email sending
      const emailSpan = transaction.startChild({
        op: 'email.send',
        description: 'Send welcome email',
      });

      await this.emailService.sendWelcome(user.email);
      emailSpan.finish();

      transaction.setStatus('ok');
      return user;
    } catch (error) {
      transaction.setStatus('internal_error');
      throw error;
    } finally {
      transaction.finish();
    }
  }
}
```

### Breadcrumb Tracking
```typescript
this.sentry.addBreadcrumb({
  message: 'User login attempt',
  category: 'auth',
  level: 'info',
  data: {
    email: user.email,
    ip: request.ip,
  },
});
```

### User Context
```typescript
// In authentication guard
this.sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// In logout
this.sentry.setUser(null);
```

## Testing Requirements

### Unit Tests
- SentryService error capture
- Exception filter integration
- Interceptor error handling
- Context enrichment
- Breadcrumb creation

### Integration Tests
- End-to-end error capture
- Performance transaction tracking
- User context propagation
- Release tracking validation

### Mock Sentry in Tests
```typescript
const mockSentryService = {
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: jest.fn(),
};
```

## Error Handling Strategy

### Error Classification
1. **Critical Errors** (always capture):
   - Unhandled exceptions
   - Database connection failures
   - External service failures
   - Payment processing errors

2. **Warning Errors** (capture with context):
   - Validation failures
   - Business rule violations
   - Rate limit exceeded

3. **Ignored Errors** (do not capture):
   - 404 Not Found
   - 400 Bad Request (validation)
   - 401 Unauthorized (expected)

### Sampling Strategy
```typescript
beforeSend: (event, hint) => {
  // Sample based on error type
  if (event.exception?.values?.[0]?.type === 'ValidationError') {
    return Math.random() < 0.1 ? event : null; // 10% sampling
  }

  // Always capture critical errors
  if (event.level === 'fatal' || event.level === 'error') {
    return event;
  }

  return event;
}
```

## Data Sanitization

### PII Redaction
```typescript
beforeSend: (event) => {
  // Remove sensitive headers
  if (event.request?.headers) {
    delete event.request.headers['authorization'];
    delete event.request.headers['cookie'];
  }

  // Sanitize request body
  if (event.request?.data) {
    const sanitized = { ...event.request.data };
    ['password', 'token', 'secret', 'apiKey'].forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    event.request.data = sanitized;
  }

  return event;
}
```

## Success Criteria
1. ✅ All unhandled errors captured in Sentry
2. ✅ User context properly associated with errors
3. ✅ Performance transactions tracked for key operations
4. ✅ Sensitive data sanitized before sending
5. ✅ Release tracking working correctly
6. ✅ Test coverage > 85%

## Dependencies
```json
{
  "@sentry/node": "^7.99.0",
  "@sentry/integrations": "^7.99.0",
  "@sentry/tracing": "^7.99.0"
}
```

## Sentry Dashboard Setup
1. Create project for each microservice
2. Configure alerts for error rate spikes
3. Set up performance budgets
4. Configure release tracking webhook
5. Create custom dashboards for business metrics

## Future Enhancements
- [ ] Session replay integration
- [ ] Source map upload automation
- [ ] Custom error grouping rules
- [ ] Slack/PagerDuty integration
- [ ] Error trend analysis
- [ ] Automated issue assignment
