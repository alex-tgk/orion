# E2E Testing Package

Comprehensive end-to-end testing suite for ORION microservices platform.

## Overview

This package contains E2E tests that validate complete user workflows and cross-service integration scenarios. Tests run against real database instances and simulate actual user interactions.

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup test database
createdb orion_test
DATABASE_URL="postgresql://localhost/orion_test" npx prisma migrate deploy

# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm test auth.e2e-spec.ts

# Run with coverage
npm run test:cov
```

## Test Structure

```
packages/e2e/
├── src/
│   ├── tests/              # E2E test suites
│   │   ├── auth.e2e-spec.ts
│   │   ├── user-management.e2e-spec.ts
│   │   ├── notifications.e2e-spec.ts
│   │   └── gateway.e2e-spec.ts
│   ├── utils/              # Test utilities
│   │   ├── database-setup.ts
│   │   ├── test-helpers.ts
│   │   └── api-client.ts
│   ├── fixtures/           # Test data
│   │   ├── test-data.ts
│   │   └── mock-responses.ts
│   └── setup.ts            # Global setup
├── jest.config.ts
├── tsconfig.json
└── package.json
```

## Test Suites

### Authentication Tests (`auth.e2e-spec.ts`)

Tests complete authentication flow:
- User registration
- Login/logout
- Token validation and refresh
- Password reset
- Multi-factor authentication
- Session management

### User Management Tests (`user-management.e2e-spec.ts`)

Tests user CRUD operations:
- Profile management
- User administration
- Role and permission management

### Notification Tests (`notifications.e2e-spec.ts`)

Tests notification workflows:
- Email notifications
- Push notifications
- In-app notifications
- Real-time delivery

### Gateway Tests (`gateway.e2e-spec.ts`)

Tests API Gateway functionality:
- Request routing
- Rate limiting
- CORS handling
- Request/response transformation

## Test Utilities

### Database Setup

```typescript
import { setupTestDatabase, teardownTestDatabase, clearDatabase } from './utils/database-setup';

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearDatabase();
});
```

### Test Helpers

```typescript
import { createTestApp, authenticatedRequest, generateTestEmail } from './utils/test-helpers';

// Create test application
const app = await createTestApp({ imports: [AuthModule] });

// Make authenticated request
const response = await authenticatedRequest(app, token).get('/api/profile');

// Generate unique test data
const email = generateTestEmail();
```

### Test Fixtures

```typescript
import { TEST_USERS, INVALID_CREDENTIALS } from './fixtures/test-data';

// Use predefined test users
await request(app.getHttpServer())
  .post('/api/auth/login')
  .send(TEST_USERS.admin);
```

## Writing E2E Tests

### Basic Test Structure

```typescript
describe('Feature E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp({ imports: [FeatureModule] });
  });

  afterAll(async () => {
    await closeTestApp(app);
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should complete workflow', async () => {
    // Arrange
    const testData = { /* ... */ };

    // Act
    const response = await request(app.getHttpServer())
      .post('/api/endpoint')
      .send(testData)
      .expect(201);

    // Assert
    expect(response.body).toMatchObject({
      /* expected data */
    });
  });
});
```

### Testing Cross-Service Workflows

```typescript
it('should trigger notification on user creation', async () => {
  // 1. Create user
  const registerRes = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send(testUserData)
    .expect(201);

  const userId = registerRes.body.user.id;

  // 2. Wait for async notification
  await waitFor(async () => {
    const notifications = await prisma.notification.findMany({ where: { userId } });
    return notifications.length > 0;
  });

  // 3. Verify notification
  const notifications = await prisma.notification.findMany({ where: { userId } });
  expect(notifications).toContainEqual(
    expect.objectContaining({ type: 'WELCOME_EMAIL' })
  );
});
```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orion_test"

# Redis
REDIS_URL="redis://localhost:6379/1"

# JWT
JWT_SECRET="test-secret-key"
JWT_EXPIRATION="1h"

# Base URL
BASE_URL="http://localhost:3000"
```

### Test Database Setup

```bash
# Create test database
createdb orion_test

# Run migrations
DATABASE_URL="postgresql://localhost/orion_test" npx prisma migrate deploy

# Seed test data (optional)
DATABASE_URL="postgresql://localhost/orion_test" npx prisma db seed
```

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test File

```bash
npm test auth.e2e-spec.ts
```

### With Coverage

```bash
npm run test:cov
```

### Watch Mode

```bash
npm run test:watch
```

### Debug Mode

```bash
npm run test:debug
```

## CI/CD Integration

### GitHub Actions

```yaml
e2e:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: postgres
    redis:
      image: redis:7

  steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
    - name: Install dependencies
      run: pnpm install
    - name: Setup test database
      run: |
        createdb orion_test
        npx prisma migrate deploy
    - name: Run E2E tests
      run: npm run test:e2e
```

## Best Practices

### 1. Test Independence

Each test should be completely independent and not rely on other tests:

```typescript
beforeEach(async () => {
  await clearDatabase(); // Fresh state for each test
});
```

### 2. Use Unique Test Data

Avoid conflicts by using unique data:

```typescript
const email = generateTestEmail(); // test-123456@example.com
```

### 3. Proper Cleanup

Always clean up resources:

```typescript
afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});
```

### 4. Async Operations

Always use async/await:

```typescript
it('should complete async operation', async () => {
  const result = await service.asyncOperation();
  expect(result).toBeDefined();
});
```

### 5. Descriptive Test Names

Use clear, descriptive names:

```typescript
// Good
it('should send welcome email when user registers successfully', async () => {});

// Bad
it('should work', async () => {});
```

## Troubleshooting

### Port Already in Use

```bash
# Kill process using port
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues

```typescript
// Add retry logic
async function connectWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### Tests Timing Out

Increase timeout in jest.config.ts:

```typescript
export default {
  testTimeout: 60000, // 60 seconds
};
```

### Flaky Tests

Add proper waits:

```typescript
await waitFor(async () => {
  const result = await checkCondition();
  return result === expected;
}, 5000);
```

## Coverage Requirements

E2E tests should cover:

- Critical user journeys: 100%
- Happy paths: 100%
- Error scenarios: 80%
- Cross-service workflows: 90%

## Maintenance

### Regular Tasks

- Update test fixtures monthly
- Review and fix flaky tests weekly
- Optimize slow tests quarterly
- Update documentation as needed

### Adding New Tests

1. Create test file in `src/tests/`
2. Follow naming convention: `*.e2e-spec.ts`
3. Use provided utilities and fixtures
4. Document test scenarios
5. Ensure proper cleanup
6. Run tests locally before committing

## References

- [Testing Strategy](../../.claude/specs/testing-strategy.md)
- [E2E Testing Spec](../../.claude/specs/e2e-testing.md)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/)
