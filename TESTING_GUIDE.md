# Comprehensive Testing Guide - ORION Platform

## Overview

This guide covers the complete testing infrastructure for the ORION microservices platform, including unit tests, integration tests, and end-to-end (E2E) tests.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Testing Tools](#testing-tools)
3. [Test Utilities](#test-utilities)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [E2E Testing](#e2e-testing)
7. [Running Tests](#running-tests)
8. [Coverage Requirements](#coverage-requirements)
9. [Best Practices](#best-practices)

## Test Structure

```
orion/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       └── testing/           # Shared test utilities
│   │           ├── mocks/         # Mock factories
│   │           ├── fixtures/      # Test fixtures
│   │           ├── database/      # Test database utilities
│   │           └── websocket/     # WebSocket test client
│   │
│   ├── auth/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── services/
│   │       │   │   └── *.spec.ts  # Unit tests
│   │       │   └── integration/   # Integration tests
│   │       └── jest.config.ts
│   │
│   ├── gateway/
│   │   └── src/
│   │       └── app/
│   │           └── services/
│   │               └── *.spec.ts
│   │
│   └── e2e/
│       └── tests/                 # E2E test suites
│           ├── auth.e2e.spec.ts
│           ├── user.e2e.spec.ts
│           └── notification.e2e.spec.ts
│
└── .env.test                      # Test environment variables
```

## Testing Tools

### Primary Testing Framework

- **Jest**: Unit and integration testing framework
- **Playwright**: E2E testing framework
- **Supertest**: HTTP assertion library for API testing
- **@nestjs/testing**: NestJS testing utilities

### Additional Tools

- **@testing-library/react**: React component testing
- **@testing-library/user-event**: User interaction simulation
- **jest-environment-jsdom**: DOM testing environment

## Test Utilities

### Shared Testing Module

Located in `packages/shared/src/testing/`, provides:

#### 1. Mock Factories

**JWT Token Factory** (`mocks/jwt-token.factory.ts`):
```typescript
import { JwtTokenFactory } from '@orion/shared/testing';

// Generate test tokens
const adminToken = JwtTokenFactory.generateAdmin();
const userToken = JwtTokenFactory.generateUser('user-123');
const expiredToken = JwtTokenFactory.generateExpired(payload);
```

**Repository Mock** (`mocks/repository.mock.ts`):
```typescript
import { MockRepository } from '@orion/shared/testing';

const userRepository = new MockRepository();
await userRepository.create({ email: 'test@orion.com' });
const user = await userRepository.findOne({ email: 'test@orion.com' });
```

**Redis Mock** (`mocks/redis.mock.ts`):
```typescript
import { MockRedis } from '@orion/shared/testing';

const redis = new MockRedis();
await redis.set('key', 'value', 'EX', 3600);
const value = await redis.get('key');
```

**Queue Mock** (`mocks/queue.mock.ts`):
```typescript
import { MockQueue } from '@orion/shared/testing';

const queue = new MockQueue('notifications');
await queue.add({ type: 'email', recipient: 'user@test.com' });
```

#### 2. Test Fixtures

**User Fixture** (`fixtures/user.fixture.ts`):
```typescript
import { UserFixture } from '@orion/shared/testing';

const user = UserFixture.createUser();
const admin = UserFixture.createAdmin();
const unverified = UserFixture.createUnverifiedUser();
const users = UserFixture.createBulkUsers(10);
```

**Notification Fixture** (`fixtures/notification.fixture.ts`):
```typescript
import { NotificationFixture } from '@orion/shared/testing';

const email = NotificationFixture.createEmailNotification();
const sms = NotificationFixture.createSmsNotification();
const push = NotificationFixture.createPushNotification();
```

#### 3. Test Database

**Database Utilities** (`database/test-database.ts`):
```typescript
import { TestDatabase } from '@orion/shared/testing';

// Initialize test database
await TestDatabase.initialize();

// Clean all tables
await TestDatabase.cleanup();

// Seed test data
await TestDatabase.seed({
  user: [user1, user2],
  notification: [notif1, notif2],
});

// Close connection
await TestDatabase.close();
```

#### 4. WebSocket Test Client

**WebSocket Client** (`websocket/test-websocket-client.ts`):
```typescript
import { WebSocketTestClient } from '@orion/shared/testing';

const client = new WebSocketTestClient({ port: 3000 });
await client.connect();

client.emit('subscribe', { channel: 'notifications' });
const data = await client.waitForEvent('notification:created');

client.disconnect();
```

## Unit Testing

### Naming Convention

- File: `*.spec.ts`
- Pattern: `<service-name>.spec.ts`
- Location: Next to the source file

### Test Structure (AAA Pattern)

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let dependency: DependencyName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: DependencyName,
          useValue: mockDependency,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    dependency = module.get<DependencyName>(DependencyName);
  });

  describe('methodName', () => {
    it('should perform expected behavior', async () => {
      // Arrange
      const input = 'test-input';
      const expected = 'expected-output';

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Example: Gateway Circuit Breaker Tests

```typescript
// packages/gateway/src/app/services/circuit-breaker.service.spec.ts
describe('CircuitBreakerService', () => {
  it('should execute function successfully when circuit is CLOSED', async () => {
    // Arrange
    const mockFn = jest.fn().mockResolvedValue('success');

    // Act
    const result = await service.execute('test-service', mockFn);

    // Assert
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(service.getState('test-service')).toBe('CLOSED');
  });

  it('should open circuit after threshold failures', async () => {
    // Arrange
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

    // Act - Trigger failures
    for (let i = 0; i < 10; i++) {
      try {
        await service.execute('test-service', mockFn);
      } catch (error) {
        // Expected
      }
    }

    // Assert
    expect(service.getState('test-service')).toBe('OPEN');
  });
});
```

### Example: Load Balancer Tests

```typescript
// packages/gateway/src/app/services/load-balancer.service.spec.ts
describe('LoadBalancerService', () => {
  it('should distribute requests evenly with round robin', () => {
    // Arrange
    service.setStrategy(LoadBalancingStrategy.ROUND_ROBIN);
    const instances = createMockInstances(3);

    // Act
    const selections = Array(6).fill(null).map(() =>
      service.selectInstance('test-service', instances)
    );

    // Assert
    expect(selections[0]).toBe(instances[0]);
    expect(selections[1]).toBe(instances[1]);
    expect(selections[2]).toBe(instances[2]);
    expect(selections[3]).toBe(instances[0]); // Second round
  });
});
```

### Example: Notification Retry Logic Tests

```typescript
// packages/notifications/src/app/services/retry.service.spec.ts
describe('RetryService', () => {
  it('should retry on failure and eventually succeed', async () => {
    // Arrange
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce('success');

    // Act
    const result = await service.executeWithRetry(mockFn, {
      maxAttempts: 3,
      delay: 10,
    });

    // Assert
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff', async () => {
    // Arrange
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error'))
      .mockRejectedValueOnce(new Error('Error'))
      .mockResolvedValueOnce('success');

    const startTime = Date.now();

    // Act
    await service.executeWithRetry(mockFn, {
      maxAttempts: 3,
      delay: 100,
      backoffMultiplier: 2,
    });

    const duration = Date.now() - startTime;

    // Assert - Should have waited ~100ms + ~200ms = ~300ms
    expect(duration).toBeGreaterThanOrEqual(250);
  });
});
```

## Integration Testing

### Setup

Integration tests require:
1. Test database connection
2. Redis connection (or mock)
3. Message queue (or mock)
4. Complete NestJS application context

### File Location

- Directory: `src/app/integration/`
- Pattern: `*.integration.spec.ts`

### Example: Auth Service Integration Tests

```typescript
// packages/auth/src/app/integration/auth.integration.spec.ts
describe('Auth Service Integration Tests', () => {
  let app: INestApplication;
  let testDb: any;

  beforeAll(async () => {
    testDb = await TestDatabase.initialize();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await TestDatabase.close();
  });

  beforeEach(async () => {
    await TestDatabase.cleanup();
  });

  it('should register user and create session', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@orion.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    // Assert - Check response
    expect(response.body).toHaveProperty('token');

    // Assert - Verify database
    const user = await testDb.user.findUnique({
      where: { email: 'test@orion.com' },
    });
    expect(user).toBeTruthy();
    expect(user.password).not.toBe('Password123!'); // Should be hashed

    // Assert - Verify session created
    const sessions = await testDb.session.findMany({
      where: { userId: user.id },
    });
    expect(sessions).toHaveLength(1);
  });
});
```

### Database Integration Tests

```typescript
describe('Database Integration', () => {
  it('should perform CRUD operations', async () => {
    // Create
    const user = await testDb.user.create({
      data: { email: 'crud@test.com', password: 'hashed' },
    });

    // Read
    const found = await testDb.user.findUnique({ where: { id: user.id } });
    expect(found.email).toBe('crud@test.com');

    // Update
    await testDb.user.update({
      where: { id: user.id },
      data: { firstName: 'Updated' },
    });

    // Delete
    await testDb.user.delete({ where: { id: user.id } });
    const deleted = await testDb.user.findUnique({ where: { id: user.id } });
    expect(deleted).toBeNull();
  });
});
```

### Message Queue Integration Tests

```typescript
describe('Queue Integration', () => {
  it('should process notification queue', async () => {
    // Arrange
    const notification = {
      type: 'email',
      recipient: 'test@orion.com',
      subject: 'Test',
      body: 'Test message',
    };

    // Act
    await notificationQueue.add(notification);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Assert
    const jobs = await notificationQueue.getCompleted();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data).toEqual(notification);
  });
});
```

## E2E Testing

### Setup

E2E tests use Playwright for browser automation and API testing.

### Configuration

```typescript
// playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './packages/e2e/tests',
  use: {
    baseURL: process.env.API_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'API Tests',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};

export default config;
```

### Example: Authentication Flow E2E Tests

```typescript
// packages/e2e/tests/auth.e2e.spec.ts
describe('Authentication E2E', () => {
  test('complete user registration flow', async ({ request }) => {
    // Register
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        email: 'e2e@test.com',
        password: 'Test@1234',
        firstName: 'E2E',
        lastName: 'Test',
      },
    });
    expect(registerResponse.status()).toBe(201);
    const { token } = await registerResponse.json();

    // Verify can access protected route
    const profileResponse = await request.get('/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(profileResponse.status()).toBe(200);

    // Logout
    const logoutResponse = await request.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutResponse.status()).toBe(200);

    // Verify token invalid after logout
    const afterLogout = await request.get('/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(afterLogout.status()).toBe(401);
  });
});
```

### Example: Notification Flow E2E Tests

```typescript
describe('Notification E2E', () => {
  test('send and track email notification', async ({ request }) => {
    // Authenticate
    const authResponse = await request.post('/api/auth/login', {
      data: { email: 'admin@test.com', password: 'Admin@123' },
    });
    const { token } = await authResponse.json();

    // Send notification
    const notifResponse = await request.post('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        type: 'email',
        recipient: 'user@test.com',
        subject: 'Test Notification',
        body: 'This is a test',
      },
    });
    expect(notifResponse.status()).toBe(201);
    const { id } = await notifResponse.json();

    // Check status
    const statusResponse = await request.get(`/api/notifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statusResponse.status()).toBe(200);
    const notification = await statusResponse.json();
    expect(notification.status).toMatch(/pending|sent/);
  });
});
```

## Running Tests

### NPM Scripts

```json
{
  "scripts": {
    "test": "nx affected:test --parallel",
    "test:all": "nx run-many --target=test --all --parallel",
    "test:e2e": "nx run e2e:test",
    "test:coverage": "nx affected:test --coverage",
    "test:ci": "nx run-many --target=test --all --coverage --maxWorkers=2",
    "test:integration": "nx run-many --target=test:integration --all",
    "test:watch": "nx test --watch",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand"
  }
}
```

### Running Specific Tests

```bash
# Run all tests
pnpm test:all

# Run tests for specific package
nx test auth

# Run tests in watch mode
nx test auth --watch

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Run specific test file
nx test auth --testFile=auth.service.spec.ts

# Run tests matching pattern
nx test auth --testNamePattern="should login"
```

## Coverage Requirements

### Configuration

```typescript
// jest.config.ts
export default {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/app/app.module.ts',
    '!src/app/config/**',
  ],
};
```

### Generate Coverage Report

```bash
# Generate coverage report
pnpm test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Goals

- **Overall**: 80% minimum
- **Critical Services**: 90% minimum
  - Auth Service
  - Payment Service
  - Security-related modules
- **Utility Functions**: 95% minimum

## Best Practices

### 1. Test Organization

- **One test file per source file**
- **Group related tests in `describe` blocks**
- **Use descriptive test names**
- **Follow AAA pattern (Arrange, Act, Assert)**

### 2. Test Independence

```typescript
// ✅ Good - Tests are independent
describe('UserService', () => {
  beforeEach(() => {
    // Fresh setup for each test
    userRepository.clear();
  });

  it('should create user', async () => {
    const user = await service.create(userData);
    expect(user).toBeDefined();
  });

  it('should find user by email', async () => {
    await service.create(userData);
    const found = await service.findByEmail(userData.email);
    expect(found).toBeDefined();
  });
});

// ❌ Bad - Tests depend on each other
describe('UserService', () => {
  let createdUser;

  it('should create user', async () => {
    createdUser = await service.create(userData);
    expect(createdUser).toBeDefined();
  });

  it('should find user', async () => {
    // Depends on previous test!
    const found = await service.findById(createdUser.id);
    expect(found).toBeDefined();
  });
});
```

### 3. Mock External Dependencies

```typescript
// Mock HTTP requests
jest.spyOn(httpService, 'get').mockReturnValue(
  of({ status: 200, data: {} })
);

// Mock database
const mockRepository = new MockRepository();

// Mock Redis
const mockRedis = new MockRedis();

// Mock Queue
const mockQueue = new MockQueue();
```

### 4. Test Edge Cases

```typescript
describe('validateEmail', () => {
  it('should validate correct email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('should reject email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('should reject empty email', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
  });
});
```

### 5. Use Test Fixtures

```typescript
// ✅ Good - Use fixtures
import { UserFixture } from '@orion/shared/testing';

const user = UserFixture.createUser();
const admin = UserFixture.createAdmin();

// ❌ Bad - Duplicate test data
const user = {
  id: 'user-123',
  email: 'test@example.com',
  password: 'hashed-password',
  // ... repeated in every test
};
```

### 6. Async Testing

```typescript
// ✅ Good - Use async/await
it('should create user', async () => {
  const user = await service.create(userData);
  expect(user).toBeDefined();
});

// ✅ Good - Use done callback for observables
it('should emit event', (done) => {
  service.userCreated$.subscribe((user) => {
    expect(user.email).toBe('test@example.com');
    done();
  });
  service.create(userData);
});

// ❌ Bad - No async handling
it('should create user', () => {
  const user = service.create(userData); // Returns Promise!
  expect(user).toBeDefined(); // Won't work
});
```

### 7. Clear Test Names

```typescript
// ✅ Good - Descriptive names
it('should throw error when email already exists', () => {});
it('should hash password before storing in database', () => {});
it('should send verification email after successful registration', () => {});

// ❌ Bad - Vague names
it('should work', () => {});
it('test user creation', () => {});
it('email test', () => {});
```

### 8. Test Error Cases

```typescript
describe('createUser', () => {
  it('should create user with valid data', async () => {
    // Test happy path
  });

  it('should throw error when email is invalid', async () => {
    await expect(service.create({ email: 'invalid' })).rejects.toThrow();
  });

  it('should throw error when email already exists', async () => {
    await service.create(userData);
    await expect(service.create(userData)).rejects.toThrow('already exists');
  });

  it('should throw error when database is unavailable', async () => {
    jest.spyOn(repository, 'create').mockRejectedValue(new Error('DB Error'));
    await expect(service.create(userData)).rejects.toThrow();
  });
});
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout: `jest.setTimeout(10000)`
   - Check for unresolved promises
   - Ensure proper cleanup in `afterEach`

2. **Database connection errors**
   - Verify DATABASE_URL in `.env.test`
   - Ensure test database exists
   - Check connection pool limits

3. **Flaky tests**
   - Use `waitFor` for async operations
   - Avoid time-dependent tests
   - Ensure proper test isolation

4. **Memory leaks**
   - Close all connections in `afterAll`
   - Clear mocks with `jest.clearAllMocks()`
   - Reset state between tests

## Summary

This testing infrastructure provides:

✅ **Comprehensive Coverage**: Unit, integration, and E2E tests
✅ **Shared Utilities**: Reusable mocks, fixtures, and helpers
✅ **Best Practices**: AAA pattern, test isolation, descriptive names
✅ **CI/CD Integration**: Automated testing in pipelines
✅ **Quality Gates**: 80% coverage requirement enforced

For questions or improvements, please refer to the [Contributing Guide](./CONTRIBUTING.md).
