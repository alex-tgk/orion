# Testing Strategy Specification

## Overview

Comprehensive testing strategy for the ORION microservices platform, ensuring code quality, reliability, and maintainability through multiple layers of testing.

## Testing Philosophy

### Core Principles

1. **Test Pyramid**: Majority of tests should be unit tests, fewer integration tests, minimal E2E tests
2. **Test Isolation**: Tests should be independent and not rely on execution order
3. **Test Speed**: Fast feedback loops with quick-running unit tests
4. **Test Coverage**: Minimum 80% coverage for all packages, 85% for core services, 90% for shared libraries
5. **Test Maintainability**: Tests should be readable, maintainable, and well-documented

### Testing Layers

```
                    E2E Tests (5%)
                 /                 \
            API Tests (15%)
         /                     \
    Integration Tests (30%)
   /                           \
Unit Tests (50%)
```

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions, classes, and components in isolation

**Coverage Requirements**:
- Shared packages: 90%
- Core services (auth, gateway, user): 85%
- Other services: 80%
- Admin UI: 75%

**Tools**:
- Jest for test runner
- ts-jest for TypeScript
- @testing-library/react for React components
- Mocking: jest.mock(), createMock* helpers

**Naming Convention**:
```
[filename].spec.ts
[filename].test.ts
```

**Example**:
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', password: 'Test123!' };

      // Act
      const result = await service.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
    });

    it('should throw error for duplicate email', async () => {
      // Arrange
      const userData = { email: 'existing@example.com', password: 'Test123!' };

      // Act & Assert
      await expect(service.createUser(userData)).rejects.toThrow('Email already exists');
    });
  });
});
```

### 2. Integration Tests

**Purpose**: Test interaction between components, services, and databases

**Coverage Requirements**:
- Critical flows: 100%
- Service interactions: 85%
- Database operations: 90%

**Tools**:
- Jest
- Supertest for HTTP testing
- Test containers for database
- Redis mock for caching

**Setup**:
- Use real database connections (test database)
- Use real Redis instance (test namespace)
- Mock external services (HTTP APIs)

**Example**:
```typescript
describe('Authentication Integration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createIntegrationTestApp({ imports: [AuthModule] });
    prisma = getPrisma();
  });

  afterAll(async () => {
    await closeIntegrationTestApp(app);
    await teardownIntegrationTest();
  });

  it('should register and login user', async () => {
    // Register
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Test123!' })
      .expect(201);

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!' })
      .expect(200);

    expect(loginRes.body.tokens.accessToken).toBeDefined();
  });
});
```

### 3. End-to-End (E2E) Tests

**Purpose**: Test complete user workflows across multiple services

**Coverage Requirements**:
- Critical user journeys: 100%
- Happy paths: 100%
- Error scenarios: 80%

**Tools**:
- Jest
- Supertest
- Test database setup/teardown

**Scope**:
- Complete authentication flow
- User management workflow
- Service health monitoring
- Notification delivery

**Example**:
```typescript
describe('User Registration Flow E2E', () => {
  it('should complete full registration process', async () => {
    // 1. Register user
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'Test123!' })
      .expect(201);

    // 2. Verify email sent (check notifications service)
    const notifications = await notificationService.getByUser(registerRes.body.user.id);
    expect(notifications).toContainEqual(
      expect.objectContaining({ type: 'EMAIL_VERIFICATION' })
    );

    // 3. Verify email
    const verifyRes = await request(app.getHttpServer())
      .get(`/api/auth/verify?token=${registerRes.body.verificationToken}`)
      .expect(200);

    // 4. Login with verified account
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'new@example.com', password: 'Test123!' })
      .expect(200);

    expect(loginRes.body.tokens.accessToken).toBeDefined();
  });
});
```

### 4. Performance Tests

**Purpose**: Ensure system meets performance requirements under load

**Tools**:
- k6 for load testing
- Custom metrics collection
- HTML report generation

**Test Scenarios**:

#### Load Test
- Ramp up to expected load
- Maintain for duration
- Measure response times, throughput

**Thresholds**:
- p95 < 500ms
- p99 < 1000ms
- Error rate < 1%

#### Stress Test
- Gradually increase beyond capacity
- Find breaking point
- Measure degradation

**Thresholds**:
- p99 < 5000ms
- Error rate < 10%

#### Spike Test
- Sudden traffic increase
- Test auto-scaling
- Measure recovery

**Thresholds**:
- p95 < 2000ms during spike
- Error rate < 5%

#### Soak Test
- Extended duration test
- Detect memory leaks
- Measure stability

**Thresholds**:
- Consistent response times
- No memory growth
- No connection leaks

### 5. Visual Regression Tests

**Purpose**: Ensure UI consistency and prevent visual regressions

**Tools**:
- Percy for visual testing
- Puppeteer for browser automation
- Jest for snapshot testing

**Coverage**:
- All major views and pages
- Component library
- Responsive layouts (mobile, tablet, desktop)
- Dark mode variants
- Error states
- Loading states

**Example**:
```typescript
it('should match dashboard snapshot', async () => {
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForSelector('.dashboard-container');

  await percySnapshot(page, 'Dashboard - Overview', {
    widths: [375, 768, 1280, 1920],
  });
});
```

## Test Coverage Requirements

### Global Thresholds

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Per-Package Thresholds

| Package | Coverage Requirement | Rationale |
|---------|---------------------|-----------|
| `packages/shared/**` | 90% | Foundation for all services |
| `packages/auth/**` | 85% | Critical security component |
| `packages/gateway/**` | 85% | Entry point for all requests |
| `packages/user/**` | 85% | Core user management |
| `packages/notifications/**` | 80% | Standard coverage |
| `packages/admin-ui/**` | 75% | UI components, harder to test |

### Coverage Exclusions

```javascript
collectCoverageFrom: [
  '**/*.{ts,tsx}',
  '!**/*.d.ts',
  '!**/*.spec.ts',
  '!**/*.e2e-spec.ts',
  '!**/*.test.ts',
  '!**/node_modules/**',
  '!**/dist/**',
  '!**/coverage/**',
  '!**/webpack.config.js',
  '!**/jest.config.ts',
  '!**/main.ts',
]
```

## Test Data Management

### Test Fixtures

Location: `packages/e2e/src/fixtures/`

```typescript
// test-data.ts
export const TEST_USERS = {
  admin: {
    email: 'admin@orion.test',
    password: 'Admin123!@#',
    role: 'ADMIN',
  },
  user: {
    email: 'user@orion.test',
    password: 'User123!@#',
    role: 'USER',
  },
};
```

### Mock Data Factories

Location: `packages/shared/src/testing/mock-factories.ts`

```typescript
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: generateUUID(),
    email: generateRandomEmail(),
    username: generateRandomUsername(),
    ...overrides,
  };
}
```

### Database Seeding

```typescript
export async function seedTestData(prisma: PrismaClient): Promise<void> {
  await prisma.user.createMany({
    data: [TEST_USERS.admin, TEST_USERS.user],
  });
}
```

## Test Environment Setup

### Local Development

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:perf

# Run visual regression tests
npm run test:visual
```

### Continuous Integration

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run unit tests
        run: npm run test:ci
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Test Database

```bash
# Setup test database
createdb orion_test

# Run migrations
DATABASE_URL="postgresql://localhost/orion_test" npx prisma migrate deploy

# Teardown
dropdb orion_test
```

## Test Utilities

### Shared Test Utilities

Location: `packages/shared/src/testing/`

- `test-utils.ts`: Mock factories and helpers
- `integration-setup.ts`: Integration test setup
- `mock-factories.ts`: Data generation

### Common Mocks

```typescript
// Mock Repository
const mockRepository = createMockRepository();

// Mock Redis
const mockRedis = createMockRedis();

// Mock JWT Service
const mockJwtService = createMockJwtService();

// Mock Logger
const mockLogger = createMockLogger();
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain the scenario:

```typescript
// Good
it('should throw UnauthorizedException when token is expired', () => {});

// Bad
it('should fail', () => {});
```

### 2. AAA Pattern

Structure tests with Arrange, Act, Assert:

```typescript
it('should create user', async () => {
  // Arrange
  const userData = { email: 'test@example.com', password: 'Test123!' };

  // Act
  const result = await service.createUser(userData);

  // Assert
  expect(result).toBeDefined();
  expect(result.email).toBe(userData.email);
});
```

### 3. Test Isolation

Each test should be independent:

```typescript
beforeEach(async () => {
  // Clear database before each test
  await clearDatabase();
});

afterEach(() => {
  // Clear mocks
  jest.clearAllMocks();
});
```

### 4. Avoid Test Interdependence

```typescript
// Bad
it('should create user', () => {
  userId = service.createUser(userData);
});

it('should update user', () => {
  service.updateUser(userId, updates); // Depends on previous test
});

// Good
describe('User CRUD', () => {
  let userId: string;

  beforeEach(async () => {
    userId = await service.createUser(userData);
  });

  it('should update user', () => {
    service.updateUser(userId, updates);
  });
});
```

### 5. Mock External Dependencies

```typescript
jest.mock('@nestjs/axios');
jest.mock('ioredis');

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
};
```

### 6. Test Error Cases

```typescript
describe('error handling', () => {
  it('should handle network errors', async () => {
    mockHttpService.get.mockRejectedValue(new Error('Network error'));

    await expect(service.fetchData()).rejects.toThrow('Failed to fetch data');
  });

  it('should handle validation errors', async () => {
    await expect(service.createUser({ email: 'invalid' }))
      .rejects.toThrow(ValidationException);
  });
});
```

## CI/CD Integration

### Pre-commit Hooks

```json
// package.json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

### Pull Request Checks

- Unit tests must pass
- Coverage must meet thresholds
- No decrease in coverage
- E2E tests pass (on main PRs)

### Nightly Builds

- Full test suite
- Performance tests
- Visual regression tests
- Security scans

### Release Pipeline

- All tests pass
- Performance benchmarks met
- Visual regression approved
- Integration tests pass
- E2E tests pass

## Monitoring and Reporting

### Coverage Reports

- HTML reports in `coverage/` directory
- LCOV format for CI integration
- JSON summary for programmatic access

### Performance Reports

- k6 HTML reports
- Trend analysis
- Performance budgets

### Visual Regression Reports

- Percy dashboard
- Snapshot comparison
- Approval workflow

## Maintenance

### Regular Tasks

1. **Weekly**: Review and update test fixtures
2. **Monthly**: Audit test coverage gaps
3. **Quarterly**: Review and optimize slow tests
4. **Annually**: Update testing strategy

### Test Debt Management

- Track skipped tests
- Monitor flaky tests
- Refactor brittle tests
- Remove obsolete tests

## Troubleshooting

### Flaky Tests

1. Identify flaky tests with CI data
2. Add proper waits/timeouts
3. Improve test isolation
4. Fix race conditions

### Slow Tests

1. Profile test execution
2. Optimize database operations
3. Use mocks where appropriate
4. Parallelize independent tests

### Coverage Gaps

1. Generate coverage report
2. Identify uncovered code
3. Write tests for critical paths
4. Document intentional exclusions

## References

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [k6 Documentation](https://k6.io/docs/)
- [Percy Documentation](https://docs.percy.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
