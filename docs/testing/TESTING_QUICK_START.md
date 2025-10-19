# Testing Quick Start Guide

## Quick Commands

```bash
# Run all tests
pnpm test:all

# Run tests for a specific service
nx test auth
nx test gateway
nx test notifications
nx test user

# Run tests in watch mode (auto-rerun on changes)
nx test auth --watch

# Run tests with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run tests in CI mode
pnpm test:ci

# Run specific test file
nx test auth --testFile=auth.service.spec.ts

# Run tests matching pattern
nx test auth --testNamePattern="should login"

# Debug tests (with inspector)
pnpm test:debug
```

## Test File Locations

```
Unit Tests:          src/app/**/*.spec.ts
Integration Tests:   src/app/integration/*.integration.spec.ts
E2E Tests:          packages/e2e/tests/*.e2e.spec.ts
```

## Writing a New Unit Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should perform action', async () => {
    // Arrange
    const input = 'test-input';
    const expected = 'expected-output';

    // Act
    const result = await service.performAction(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

## Using Test Utilities

```typescript
import {
  JwtTokenFactory,
  UserFixture,
  MockRepository,
  MockRedis,
  MockQueue,
} from '@orion/shared/testing';

// Generate JWT token
const adminToken = JwtTokenFactory.generateAdmin();
const userToken = JwtTokenFactory.generateUser('user-123');

// Create test user
const user = UserFixture.createUser();
const admin = UserFixture.createAdmin();
const users = UserFixture.createBulkUsers(10);

// Use mock repository
const userRepo = new MockRepository();
await userRepo.create(user);
const found = await userRepo.findOne({ email: user.email });

// Use mock Redis
const redis = new MockRedis();
await redis.set('key', 'value', 'EX', 3600);
const value = await redis.get('key');

// Use mock queue
const queue = new MockQueue('notifications');
await queue.add({ type: 'email', to: 'user@test.com' });
```

## Common Testing Patterns

### 1. Testing with Mocks

```typescript
// Mock external service
const mockHttpService = {
  get: jest.fn().mockReturnValue(of({ status: 200, data: {} })),
};

const module = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: HttpService, useValue: mockHttpService },
  ],
}).compile();
```

### 2. Testing Async Operations

```typescript
it('should handle async operation', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### 3. Testing Error Cases

```typescript
it('should throw error on invalid input', async () => {
  await expect(service.method('invalid')).rejects.toThrow('Invalid input');
});
```

### 4. Testing Events

```typescript
it('should emit event', (done) => {
  service.eventEmitter.on('user.created', (user) => {
    expect(user.id).toBeDefined();
    done();
  });

  service.createUser(userData);
});
```

## Integration Test Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { TestDatabase } from '@orion/shared/testing';

describe('Service Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await TestDatabase.initialize();

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

  it('POST /api/endpoint', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/endpoint')
      .send({ data: 'test' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

## E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

describe('Feature E2E Tests', () => {
  test('should complete user flow', async ({ request }) => {
    // Step 1: Create resource
    const createResponse = await request.post('/api/resource', {
      data: { name: 'Test' },
    });
    expect(createResponse.status()).toBe(201);

    // Step 2: Retrieve resource
    const { id } = await createResponse.json();
    const getResponse = await request.get(`/api/resource/${id}`);
    expect(getResponse.status()).toBe(200);

    // Step 3: Verify data
    const data = await getResponse.json();
    expect(data.name).toBe('Test');
  });
});
```

## Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/lcov-report/index.html

# View summary in terminal
cat coverage/coverage-summary.txt
```

## Debugging Tests

```bash
# Run with Node inspector
pnpm test:debug

# Then in Chrome, visit:
chrome://inspect

# Or use VS Code debugger with this launch config:
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

## Troubleshooting

### Tests Timing Out

```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout

// Or globally
jest.setTimeout(10000);
```

### Database Connection Errors

```bash
# Ensure test database exists
createdb orion_test

# Check DATABASE_URL in .env.test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orion_test
```

### Mock Not Working

```typescript
// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Or restore all mocks
afterAll(() => {
  jest.restoreAllMocks();
});
```

## CI/CD Integration

Tests automatically run on:
- Every push to main
- Pull request creation/update
- Manual workflow dispatch

View test results in GitHub Actions tab.

## Best Practices Checklist

- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Test one thing per test
- ✅ Keep tests independent
- ✅ Mock external dependencies
- ✅ Clean up after tests
- ✅ Test both success and error cases
- ✅ Maintain 80%+ code coverage

## Getting Help

- Full guide: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- Implementation details: [TESTING_IMPLEMENTATION_SUMMARY.md](./TESTING_IMPLEMENTATION_SUMMARY.md)
- Jest docs: https://jestjs.io/
- Playwright docs: https://playwright.dev/

---

Happy Testing! 🧪
