# Error-to-Issue Pipeline - Usage Examples

## Quick Start

### 1. Import Error Classes

```typescript
import {
  AppError,
  ErrorSeverity,
  ErrorCategory,
  ErrorClassifier,
  DatabaseError,
  AuthenticationError,
  ValidationError,
  NetworkError,
} from '@orion/shared/errors';
```

### 2. Basic Error Creation

```typescript
// Create a classified error
const error = new AppError(
  'Database connection failed',
  503,
  ErrorSeverity.CRITICAL,
  ErrorCategory.DATABASE,
  {
    service: 'user-service',
    correlationId: req.correlationId,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
  }
);

// Error will have:
// - Unique error code (e.g., "DB-C-ABC123")
// - SHA-256 signature for deduplication
// - Rich context
// - Stack trace
```

### 3. Report to Webhook

```typescript
import axios from 'axios';

async function reportError(error: AppError) {
  try {
    await axios.post(
      `${process.env.GATEWAY_URL}/webhooks/errors`,
      error.toJSON(),
      {
        headers: {
          'X-API-Key': process.env.WEBHOOK_API_KEY,
        },
      }
    );
  } catch (err) {
    // Log but don't throw - error reporting shouldn't crash the app
    console.error('Failed to report error to webhook:', err);
  }
}
```

## Common Patterns

### Pattern 1: Database Errors

```typescript
import { DatabaseError } from '@orion/shared/errors';

async function getUserById(id: string) {
  try {
    return await db.user.findUnique({ where: { id } });
  } catch (error) {
    const dbError = new DatabaseError('Failed to fetch user from database', {
      service: 'user-service',
      metadata: {
        userId: id,
        operation: 'findUnique',
        table: 'user',
      },
    });

    await reportError(dbError);
    throw dbError;
  }
}
```

### Pattern 2: Authentication Errors

```typescript
import { AuthenticationError } from '@orion/shared/errors';

async function validateToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const authError = new AuthenticationError('JWT token validation failed', {
      service: 'auth-service',
      metadata: {
        errorType: error.name,
        expired: error.name === 'TokenExpiredError',
      },
    });

    await reportError(authError);
    throw authError;
  }
}
```

### Pattern 3: Validation Errors

```typescript
import { ValidationError } from '@orion/shared/errors';

async function createUser(data: CreateUserDto) {
  const errors: Record<string, string[]> = {};

  if (!isEmail(data.email)) {
    errors.email = ['Must be a valid email address'];
  }

  if (data.password.length < 8) {
    errors.password = ['Must be at least 8 characters'];
  }

  if (Object.keys(errors).length > 0) {
    const validationError = new ValidationError(
      'User validation failed',
      { service: 'user-service' },
      errors
    );

    // Validation errors are LOW severity - won't create GitHub issues by default
    // But will still be tracked
    await reportError(validationError);
    throw validationError;
  }

  return await db.user.create({ data });
}
```

### Pattern 4: Auto-Classification

```typescript
import { ErrorClassifier } from '@orion/shared/errors';

async function fetchExternalAPI() {
  try {
    return await axios.get('https://api.example.com/data');
  } catch (error) {
    // Let the classifier determine severity and category
    const appError = ErrorClassifier.classify(error, {
      service: 'integration-service',
      metadata: {
        url: 'https://api.example.com/data',
        statusCode: error.response?.status,
      },
    });

    await reportError(appError);
    throw appError;
  }
}
```

### Pattern 5: Network Errors

```typescript
import { NetworkError } from '@orion/shared/errors';

async function connectToService(serviceUrl: string) {
  try {
    const response = await axios.get(serviceUrl, { timeout: 5000 });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const networkError = new NetworkError(
        `Failed to connect to ${serviceUrl}`,
        {
          service: 'gateway',
          metadata: {
            targetService: serviceUrl,
            errorCode: error.code,
            timeout: 5000,
          },
        }
      );

      await reportError(networkError);
      throw networkError;
    }
    throw error;
  }
}
```

## NestJS Integration

### Global Exception Filter

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorClassifier } from '@orion/shared/errors';
import axios from 'axios';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Get status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Classify error
    const error =
      exception instanceof Error
        ? exception
        : new Error('Unknown error');

    const appError = ErrorClassifier.classify(error, {
      service: process.env.SERVICE_NAME || 'unknown',
      correlationId: request.correlationId,
      userId: request.user?.id,
      path: request.url,
      method: request.method,
    });

    // Report to webhook (async, don't await)
    this.reportError(appError).catch(console.error);

    // Send response
    response.status(status).json(appError.toJSON());
  }

  private async reportError(error: AppError) {
    try {
      await axios.post(
        `${process.env.GATEWAY_URL}/webhooks/errors`,
        error.toJSON(),
        {
          headers: { 'X-API-Key': process.env.WEBHOOK_API_KEY },
          timeout: 2000,
        }
      );
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  }
}
```

### Service-Level Error Handling

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AppError, ErrorSeverity, ErrorCategory } from '@orion/shared/errors';
import axios from 'axios';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async findById(id: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });

      if (!user) {
        throw new AppError(
          'User not found',
          404,
          ErrorSeverity.LOW,
          ErrorCategory.BUSINESS_LOGIC,
          {
            service: 'user-service',
            metadata: { userId: id },
          }
        );
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        await this.reportError(error);
        throw error;
      }

      const appError = new AppError(
        'Failed to fetch user',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        {
          service: 'user-service',
          metadata: { userId: id, originalError: error.message },
        }
      );

      await this.reportError(appError);
      throw appError;
    }
  }

  private async reportError(error: AppError) {
    try {
      await axios.post(
        `${process.env.GATEWAY_URL}/webhooks/errors`,
        error.toJSON(),
        {
          headers: { 'X-API-Key': process.env.WEBHOOK_API_KEY },
          timeout: 2000,
        }
      );

      this.logger.debug(`Error reported: ${error.code}`);
    } catch (err) {
      this.logger.error('Failed to report error to webhook', err);
    }
  }
}
```

## Testing

### Testing Error Creation

```typescript
import { AppError, ErrorSeverity, ErrorCategory } from '@orion/shared/errors';

describe('Error Handling', () => {
  it('should create error with proper signature', () => {
    const error = new AppError(
      'Test error',
      500,
      ErrorSeverity.HIGH,
      ErrorCategory.INTERNAL,
      { service: 'test-service' }
    );

    expect(error.code).toBeDefined();
    expect(error.signature).toHaveLength(64);
    expect(error.shouldCreateIssue()).toBe(true);
  });

  it('should generate same signature for similar errors', () => {
    const error1 = new AppError(
      'Database connection failed with ID 123',
      503,
      ErrorSeverity.CRITICAL,
      ErrorCategory.DATABASE,
      { service: 'test-service' }
    );

    const error2 = new AppError(
      'Database connection failed with ID 456',
      503,
      ErrorSeverity.CRITICAL,
      ErrorCategory.DATABASE,
      { service: 'test-service' }
    );

    // Numbers are normalized, so signatures should match
    expect(error1.signature).toBe(error2.signature);
  });
});
```

### Mocking Error Reporting

```typescript
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Service with Error Reporting', () => {
  it('should report errors to webhook', async () => {
    mockedAxios.post.mockResolvedValue({ status: 202 });

    const service = new UserService();

    try {
      await service.findById('non-existent');
    } catch (error) {
      // Error should be thrown
    }

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/webhooks/errors'),
      expect.objectContaining({
        message: 'User not found',
        severity: ErrorSeverity.LOW,
      }),
      expect.objectContaining({
        headers: { 'X-API-Key': expect.any(String) },
      })
    );
  });
});
```

## Best Practices

### DO:
- ✅ Use specific error classes (DatabaseError, AuthenticationError, etc.)
- ✅ Include correlation IDs for tracing
- ✅ Add relevant metadata
- ✅ Report errors asynchronously (don't await)
- ✅ Handle error reporting failures gracefully
- ✅ Use appropriate severity levels
- ✅ Include user ID when available

### DON'T:
- ❌ Don't await error reporting (it can slow down responses)
- ❌ Don't throw if error reporting fails
- ❌ Don't include sensitive data in error messages
- ❌ Don't create HIGH/CRITICAL errors for validation failures
- ❌ Don't report the same error multiple times
- ❌ Don't block request handling for error reporting

## Environment Setup

```bash
# .env
GATEWAY_URL=http://localhost:3000
WEBHOOK_API_KEY=your-secure-api-key
SERVICE_NAME=user-service

# For testing
GITHUB_TOKEN=ghp_test_token
GITHUB_REPO=test-org/test-repo
ERROR_TO_ISSUE_ENABLED=false  # Disable in tests
```

## Troubleshooting

### Error Not Creating GitHub Issue

Check if error meets criteria:
```typescript
// Only CRITICAL and HIGH operational errors create issues
const shouldCreate = error.shouldCreateIssue();

// Requirements:
// 1. error.isOperational === true
// 2. error.severity === CRITICAL || HIGH
```

### Duplicate Issues Being Created

Verify signature generation:
```typescript
// Same errors should have same signature
console.log(error.signature);

// Check deduplication window
// Default: 1 hour (3600000 ms)
```

### Webhook Not Responding

Verify configuration:
```typescript
// Check API key
headers: { 'X-API-Key': process.env.WEBHOOK_API_KEY }

// Check gateway URL
const url = `${process.env.GATEWAY_URL}/webhooks/errors`;

// Check timeout
timeout: 2000  // 2 seconds
```
