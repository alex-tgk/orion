# Logger Service Specification

## Overview
Centralized logging service for ORION microservices platform using Winston with structured JSON logging, correlation ID support, and context injection.

## Technical Stack
- **Winston**: Core logging framework
- **winston-transport**: Custom transport support
- **nest-winston**: NestJS Winston integration
- **AsyncLocalStorage**: Node.js async context for correlation IDs

## Architecture

### Logger Package Structure
```
packages/logger/
├── src/
│   ├── lib/
│   │   ├── logger.service.ts       # Main LoggerService class
│   │   ├── logger.module.ts        # NestJS module configuration
│   │   ├── logger.config.ts        # Winston configuration factory
│   │   ├── transports/             # Custom transports
│   │   │   ├── console.transport.ts
│   │   │   └── file.transport.ts
│   │   ├── formatters/             # Log formatters
│   │   │   ├── json.formatter.ts
│   │   │   └── development.formatter.ts
│   │   └── interfaces/
│   │       ├── logger-options.interface.ts
│   │       └── log-context.interface.ts
│   ├── index.ts
│   └── __tests__/
│       ├── logger.service.spec.ts
│       └── logger.module.spec.ts
└── package.json
```

## Core Features

### 1. Structured JSON Logging
**Format**:
```json
{
  "timestamp": "2025-10-18T10:30:45.123Z",
  "level": "info",
  "correlationId": "uuid-v4",
  "service": "user-service",
  "context": "UserService",
  "message": "User created successfully",
  "metadata": {
    "userId": "123",
    "email": "user@example.com"
  },
  "environment": "production",
  "pid": 12345
}
```

### 2. Log Levels
- **error**: Application errors, exceptions
- **warn**: Warning messages
- **info**: General informational messages
- **http**: HTTP request/response logs
- **debug**: Detailed debugging information
- **verbose**: Very detailed logs

### 3. Correlation ID Support
- Automatic correlation ID injection from AsyncLocalStorage
- Propagated across microservices via headers
- Links all logs for a single request chain

### 4. Context Injection
- Service name
- Environment (development, staging, production)
- Process ID
- Request metadata
- Custom context fields

## API Design

### LoggerService Interface
```typescript
export class LoggerService {
  // Standard logging methods
  log(message: string, context?: string, metadata?: Record<string, any>): void;
  error(message: string, trace?: string, context?: string, metadata?: Record<string, any>): void;
  warn(message: string, context?: string, metadata?: Record<string, any>): void;
  debug(message: string, context?: string, metadata?: Record<string, any>): void;
  verbose(message: string, context?: string, metadata?: Record<string, any>): void;

  // Context management
  setContext(context: string): void;

  // Child logger creation
  child(context: string, metadata?: Record<string, any>): LoggerService;

  // Correlation ID methods
  setCorrelationId(correlationId: string): void;
  getCorrelationId(): string | undefined;
}
```

### LoggerModule Configuration
```typescript
LoggerModule.forRoot({
  serviceName: 'user-service',
  level: 'info',
  pretty: false, // Set to true for development
  transports: ['console', 'file'],
  fileOptions: {
    filename: 'logs/app.log',
    maxSize: '20m',
    maxFiles: '14d'
  }
})
```

## Implementation Requirements

### 1. Winston Configuration
- JSON formatting for production
- Pretty printing for development
- Console and file transports
- Log rotation with size and time-based retention
- Error-only separate log file

### 2. NestJS Integration
- Injectable LoggerService
- Configurable via ConfigService
- Override default NestJS logger
- Module-level logger instances

### 3. Correlation ID Handling
- AsyncLocalStorage for context propagation
- Automatic injection in all logs
- Header extraction middleware integration

### 4. Performance Considerations
- Async logging to prevent blocking
- Log buffering for high-throughput scenarios
- Configurable log levels per environment
- Sampling for verbose logs in production

### 5. Security
- Sanitization of sensitive data (passwords, tokens)
- PII redaction capabilities
- Configurable field masking

## Configuration Options

### Environment Variables
```env
LOG_LEVEL=info
LOG_PRETTY=false
LOG_SERVICE_NAME=user-service
LOG_FILE_ENABLED=true
LOG_FILE_PATH=logs/app.log
LOG_FILE_MAX_SIZE=20m
LOG_FILE_MAX_FILES=14d
LOG_CONSOLE_ENABLED=true
```

### Configuration Interface
```typescript
interface LoggerConfig {
  serviceName: string;
  level: 'error' | 'warn' | 'info' | 'http' | 'debug' | 'verbose';
  pretty: boolean;
  transports: ('console' | 'file')[];
  fileOptions?: {
    filename: string;
    maxSize: string;
    maxFiles: string;
  };
  sanitize?: {
    fields: string[];
    replacement: string;
  };
}
```

## Usage Examples

### Basic Logging
```typescript
@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('UserService');
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    this.logger.log('Creating new user', 'UserService', { email: dto.email });

    try {
      const user = await this.userRepository.save(dto);
      this.logger.log('User created successfully', 'UserService', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, 'UserService', { email: dto.email });
      throw error;
    }
  }
}
```

### Child Logger
```typescript
const childLogger = this.logger.child('UserRegistration', {
  registrationType: 'email'
});

childLogger.log('Starting registration process');
childLogger.debug('Validating email', { email: dto.email });
```

### Correlation ID Usage
```typescript
// Automatically injected from middleware
this.logger.log('Processing request'); // correlationId included automatically

// Manual setting (if needed)
this.logger.setCorrelationId('custom-correlation-id');
```

## Testing Requirements

### Unit Tests
- LoggerService methods (log, error, warn, debug, verbose)
- Correlation ID injection
- Context setting and propagation
- Child logger creation
- Configuration validation

### Integration Tests
- Winston transport configuration
- Log file creation and rotation
- Format validation (JSON structure)
- Environment-based configuration

## Success Criteria
1. ✅ All logs output in structured JSON format
2. ✅ Correlation IDs automatically included in logs
3. ✅ Context properly propagated to child loggers
4. ✅ Log rotation working correctly
5. ✅ Performance impact < 5ms per log entry
6. ✅ Test coverage > 90%

## Dependencies
```json
{
  "winston": "^3.11.0",
  "nest-winston": "^1.9.4",
  "winston-daily-rotate-file": "^4.7.1"
}
```

## Migration Guide
For existing services to adopt the new logger:

1. Install logger package: `pnpm add @orion/logger`
2. Import LoggerModule in AppModule
3. Replace console.log with LoggerService
4. Update exception filters to use LoggerService
5. Configure environment variables

## Future Enhancements
- [ ] Elasticsearch integration for centralized logging
- [ ] Log aggregation and search UI
- [ ] Advanced log sampling strategies
- [ ] Distributed tracing correlation
- [ ] Log-based alerting rules
