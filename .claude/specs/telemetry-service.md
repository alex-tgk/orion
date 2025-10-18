# OpenTelemetry Tracing Specification

## Overview
Distributed tracing implementation for ORION microservices using OpenTelemetry with auto-instrumentation, custom spans, and integration with observability backends (Jaeger, Zipkin, Datadog).

## Technical Stack
- **@opentelemetry/sdk-node**: OpenTelemetry Node.js SDK
- **@opentelemetry/auto-instrumentations-node**: Auto-instrumentation
- **@opentelemetry/exporter-jaeger**: Jaeger exporter
- **@opentelemetry/exporter-zipkin**: Zipkin exporter
- **@opentelemetry/api**: Core API for custom instrumentation

## Architecture

### Telemetry Package Structure
```
packages/shared/src/telemetry/
├── telemetry.module.ts           # NestJS module
├── telemetry.service.ts          # Telemetry service wrapper
├── telemetry.config.ts           # Configuration factory
├── instrumentation.ts            # Auto-instrumentation setup
├── exporters/
│   ├── jaeger.exporter.ts
│   ├── zipkin.exporter.ts
│   ├── console.exporter.ts
│   └── otlp.exporter.ts
├── decorators/
│   ├── traced.decorator.ts       # Method tracing decorator
│   └── span.decorator.ts         # Custom span decorator
├── interceptors/
│   └── tracing.interceptor.ts    # NestJS tracing interceptor
├── propagators/
│   └── correlation-id.propagator.ts
├── interfaces/
│   ├── telemetry-config.interface.ts
│   └── span-options.interface.ts
└── __tests__/
    ├── telemetry.service.spec.ts
    ├── traced.decorator.spec.ts
    └── tracing.interceptor.spec.ts
```

## Core Features

### 1. Auto-Instrumentation
- HTTP/HTTPS requests (incoming and outgoing)
- Database queries (PostgreSQL, MongoDB)
- Redis operations
- RabbitMQ message processing
- gRPC calls
- DNS lookups

### 2. Custom Span Creation
**Span Attributes**:
```typescript
{
  // Standard attributes
  'service.name': 'user-service',
  'service.version': '1.0.0',
  'deployment.environment': 'production',

  // Request attributes
  'http.method': 'POST',
  'http.url': '/api/users',
  'http.status_code': 201,
  'http.user_agent': 'Mozilla/5.0...',

  // Custom business attributes
  'user.id': '12345',
  'user.email': 'user@example.com',
  'operation.type': 'user.registration',
  'correlation.id': 'uuid-v4',

  // Performance attributes
  'db.query.duration_ms': 45,
  'cache.hit': true,
}
```

### 3. Context Propagation
- W3C Trace Context (default)
- B3 propagation (Zipkin)
- Jaeger propagation
- Custom correlation ID propagation

### 4. Sampling Strategies
- Always on (development)
- Probability-based (production: 10%)
- Rate limiting
- Parent-based sampling
- Custom sampling rules

## API Design

### TelemetryService Interface
```typescript
export class TelemetryService {
  // Span management
  startSpan(name: string, options?: SpanOptions): Span;
  getCurrentSpan(): Span | undefined;
  endSpan(span: Span): void;

  // Active span operations
  withSpan<T>(name: string, fn: (span: Span) => T, options?: SpanOptions): T;
  recordException(exception: Error): void;
  setAttributes(attributes: Attributes): void;
  addEvent(name: string, attributes?: Attributes): void;

  // Tracer access
  getTracer(name?: string): Tracer;

  // Context management
  getActiveContext(): Context;
  setActiveContext(context: Context): void;
}
```

### TelemetryModule Configuration
```typescript
TelemetryModule.forRoot({
  serviceName: 'user-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  enabled: true,
  exporters: [
    {
      type: 'jaeger',
      endpoint: 'http://jaeger:14268/api/traces',
    },
    {
      type: 'otlp',
      endpoint: 'http://collector:4318/v1/traces',
    },
  ],
  sampling: {
    type: 'probability',
    probability: 0.1, // 10%
  },
  instrumentations: [
    'http',
    'express',
    'pg',
    'mongodb',
    'redis',
  ],
})
```

## Implementation Requirements

### 1. SDK Initialization
- Register instrumentation providers
- Configure trace exporters
- Set up context propagation
- Initialize samplers

### 2. Auto-Instrumentation
- HTTP server and client
- Database connections
- Message queue operations
- External API calls

### 3. Custom Instrumentation
- Business operation tracing
- Method-level tracing decorators
- Manual span creation utilities
- Span attribute helpers

### 4. Context Propagation
- Extract trace context from headers
- Inject trace context into outgoing requests
- Correlation ID integration
- Baggage propagation

### 5. Performance Optimization
- Async span export
- Batch span processing
- Memory-efficient span storage
- Configurable export intervals

## Configuration Options

### Environment Variables
```env
OTEL_SERVICE_NAME=user-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger:14268/api/traces
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318/v1/traces
OTEL_TRACES_SAMPLER=probabilistic
OTEL_TRACES_SAMPLER_ARG=0.1
OTEL_LOG_LEVEL=info
OTEL_ENABLED=true
```

### Configuration Interface
```typescript
interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  enabled?: boolean;
  exporters: ExporterConfig[];
  sampling?: SamplingConfig;
  instrumentations?: string[];
  spanLimits?: {
    attributeCountLimit?: number;
    eventCountLimit?: number;
    linkCountLimit?: number;
  };
  resource?: {
    attributes: Record<string, string | number | boolean>;
  };
}

interface ExporterConfig {
  type: 'jaeger' | 'zipkin' | 'otlp' | 'console';
  endpoint?: string;
  headers?: Record<string, string>;
}

interface SamplingConfig {
  type: 'always_on' | 'always_off' | 'probability' | 'rate_limiting';
  probability?: number; // 0-1
  rateLimit?: number; // spans per second
}
```

## Usage Examples

### Automatic Tracing (HTTP)
```typescript
// Automatically instrumented
@Controller('users')
export class UsersController {
  @Get(':id')
  async getUser(@Param('id') id: string): Promise<User> {
    // Span automatically created for this HTTP request
    return this.usersService.findOne(id);
  }
}
```

### Manual Span Creation
```typescript
@Injectable()
export class UserService {
  constructor(private readonly telemetry: TelemetryService) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const span = this.telemetry.startSpan('user.create', {
      attributes: {
        'user.email': dto.email,
        'user.role': dto.role,
      },
    });

    try {
      const user = await this.userRepository.save(dto);

      span.setAttributes({
        'user.id': user.id,
        'operation.success': true,
      });

      span.addEvent('user_created', {
        'user.id': user.id,
        'timestamp': Date.now(),
      });

      return user;
    } catch (error) {
      span.recordException(error);
      span.setAttributes({ 'operation.success': false });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

### Decorator-Based Tracing
```typescript
@Injectable()
export class PaymentService {
  @Traced('payment.process', {
    captureArgs: true,
    captureResult: false, // Sensitive data
  })
  async processPayment(payment: PaymentDto): Promise<PaymentResult> {
    // Span automatically created and managed
    return this.paymentGateway.charge(payment);
  }

  @Traced('payment.refund')
  async refundPayment(paymentId: string): Promise<void> {
    const span = this.telemetry.getCurrentSpan();
    span?.setAttributes({
      'payment.id': paymentId,
      'operation.type': 'refund',
    });

    await this.paymentGateway.refund(paymentId);
  }
}
```

### Nested Spans
```typescript
async registerUser(dto: RegisterUserDto): Promise<User> {
  return await this.telemetry.withSpan('user.registration', async (parentSpan) => {
    parentSpan.setAttributes({
      'registration.type': 'email',
      'user.email': dto.email,
    });

    // Child span for validation
    const user = await this.telemetry.withSpan('user.validation', async () => {
      return this.validateUser(dto);
    });

    // Child span for database operation
    await this.telemetry.withSpan('user.database.save', async (dbSpan) => {
      dbSpan.setAttributes({ 'db.operation': 'insert' });
      return this.userRepository.save(user);
    });

    // Child span for email
    await this.telemetry.withSpan('user.email.welcome', async () => {
      return this.emailService.sendWelcome(user.email);
    });

    return user;
  });
}
```

### Context Propagation (Microservices)
```typescript
// Service A - Initiating request
async callServiceB(data: any): Promise<any> {
  const span = this.telemetry.getCurrentSpan();
  const context = this.telemetry.getActiveContext();

  // Context automatically propagated via HTTP headers
  return this.httpService.post('http://service-b/endpoint', data, {
    headers: {
      // Trace context automatically injected
    },
  });
}

// Service B - Receiving request
@Controller('endpoint')
export class ServiceBController {
  @Post()
  async handleRequest(@Body() data: any) {
    // Trace context automatically extracted from headers
    // New span created as child of Service A's span
    return this.process(data);
  }
}
```

## Testing Requirements

### Unit Tests
- TelemetryService span creation
- Decorator functionality
- Attribute setting and validation
- Exception recording
- Context propagation

### Integration Tests
- End-to-end tracing across services
- Exporter connectivity
- Auto-instrumentation verification
- Sampling strategy validation

### Mock Telemetry in Tests
```typescript
const mockTelemetryService = {
  startSpan: jest.fn().mockReturnValue({
    setAttributes: jest.fn(),
    addEvent: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
  }),
  getCurrentSpan: jest.fn(),
  withSpan: jest.fn((name, fn) => fn(mockSpan)),
};
```

## Span Naming Conventions

### Standard Patterns
```typescript
// HTTP operations
'HTTP GET /api/users/:id'
'HTTP POST /api/orders'

// Database operations
'db.query.users.select'
'db.query.orders.insert'
'db.transaction.checkout'

// Business operations
'user.registration'
'order.checkout'
'payment.process'

// External calls
'external.stripe.charge'
'external.sendgrid.email'

// Cache operations
'cache.get.user:123'
'cache.set.session:abc'
```

## Performance Considerations

### Span Limits
```typescript
{
  attributeCountLimit: 128,      // Max attributes per span
  eventCountLimit: 128,          // Max events per span
  linkCountLimit: 128,           // Max links per span
  attributeValueLengthLimit: 1024, // Max attribute value length
}
```

### Export Configuration
```typescript
{
  maxQueueSize: 2048,            // Max spans in queue
  maxExportBatchSize: 512,       // Spans per export batch
  scheduledDelayMillis: 5000,    // Export interval
  exportTimeoutMillis: 30000,    // Export timeout
}
```

## Success Criteria
1. ✅ Distributed traces visible across all microservices
2. ✅ Auto-instrumentation capturing 95%+ of operations
3. ✅ Context properly propagated between services
4. ✅ Custom spans created for business operations
5. ✅ Performance overhead < 1% of request time
6. ✅ Test coverage > 85%

## Dependencies
```json
{
  "@opentelemetry/sdk-node": "^0.48.0",
  "@opentelemetry/auto-instrumentations-node": "^0.41.0",
  "@opentelemetry/exporter-jaeger": "^1.21.0",
  "@opentelemetry/exporter-zipkin": "^1.21.0",
  "@opentelemetry/exporter-trace-otlp-http": "^0.48.0",
  "@opentelemetry/api": "^1.7.0"
}
```

## Observability Backend Setup

### Jaeger (Recommended for Development)
```yaml
# docker-compose.yml
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"  # UI
    - "14268:14268"  # HTTP collector
  environment:
    - COLLECTOR_OTLP_ENABLED=true
```

### OpenTelemetry Collector (Production)
```yaml
otel-collector:
  image: otel/opentelemetry-collector:latest
  command: ["--config=/etc/otel-collector-config.yaml"]
  volumes:
    - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
  ports:
    - "4318:4318"  # OTLP HTTP
    - "4317:4317"  # OTLP gRPC
```

## Future Enhancements
- [ ] Metrics collection (RED metrics)
- [ ] Log correlation with traces
- [ ] Exemplar support (link metrics to traces)
- [ ] Continuous profiling integration
- [ ] Custom sampling rules per endpoint
- [ ] Cost-based sampling
- [ ] Trace-based testing
