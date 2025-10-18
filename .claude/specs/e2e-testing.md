# E2E Testing Specification

## Overview

End-to-end testing specification for ORION microservices platform, covering complete user workflows and cross-service integration testing.

## Purpose

E2E tests validate that the entire system works together correctly from the user's perspective. They test:

- Complete user workflows
- Cross-service communication
- Database persistence
- External integrations
- Real-world scenarios

## Test Structure

### Package: `packages/e2e/`

```
packages/e2e/
├── src/
│   ├── tests/
│   │   ├── auth.e2e-spec.ts           # Authentication flows
│   │   ├── user-management.e2e-spec.ts # User CRUD operations
│   │   ├── notifications.e2e-spec.ts   # Notification workflows
│   │   ├── gateway.e2e-spec.ts         # API Gateway routing
│   │   └── health-monitoring.e2e-spec.ts # Health check workflows
│   ├── utils/
│   │   ├── database-setup.ts           # DB setup/teardown
│   │   ├── test-helpers.ts             # Common test utilities
│   │   └── api-client.ts               # HTTP client wrapper
│   ├── fixtures/
│   │   ├── test-data.ts                # Test data constants
│   │   └── mock-responses.ts           # Mock API responses
│   └── setup.ts                        # Global test setup
├── jest.config.ts
├── tsconfig.json
└── package.json
```

## Configuration

### Jest Configuration

```typescript
// packages/e2e/jest.config.ts
export default {
  displayName: 'e2e',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  testMatch: ['**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run serially to avoid conflicts
  forceExit: true,
  detectOpenHandles: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Environment Variables

```bash
# .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orion_test"
REDIS_URL="redis://localhost:6379/1"
JWT_SECRET="test-secret-key"
BASE_URL="http://localhost:3000"
```

## Test Scenarios

### 1. Authentication Flow

**File**: `packages/e2e/src/tests/auth.e2e-spec.ts`

#### User Registration
- Register with valid credentials
- Reject duplicate email
- Reject weak password
- Reject invalid email format
- Validate required fields

#### User Login
- Login with valid credentials
- Reject invalid password
- Reject non-existent email
- Rate limit excessive attempts
- Return JWT tokens

#### Token Management
- Access protected routes with valid token
- Reject invalid tokens
- Reject expired tokens
- Refresh access token
- Invalidate refresh token

#### Password Reset
- Request password reset
- Verify reset token
- Update password
- Login with new password

#### Multi-Factor Authentication
- Enable MFA
- Verify MFA code during login
- Disable MFA
- Handle invalid MFA codes

#### Session Management
- Logout and invalidate token
- Logout from all devices
- Session timeout

### 2. User Management Flow

**File**: `packages/e2e/src/tests/user-management.e2e-spec.ts`

#### Profile Management
- Get user profile
- Update profile information
- Upload profile picture
- Change email address
- Verify email change

#### User Administration
- List all users (admin)
- Search users by criteria
- Update user roles
- Deactivate user account
- Reactivate user account
- Delete user permanently

#### Permissions and Roles
- Access control by role
- Permission inheritance
- Role-based features

### 3. Notification Flow

**File**: `packages/e2e/src/tests/notifications.e2e-spec.ts`

#### Email Notifications
- Send verification email
- Send password reset email
- Send welcome email
- Track email delivery status

#### Push Notifications
- Send push notification
- Handle notification preferences
- Batch notifications

#### In-App Notifications
- Create notification
- List user notifications
- Mark as read
- Delete notification
- Real-time notification delivery

### 4. API Gateway Flow

**File**: `packages/e2e/src/tests/gateway.e2e-spec.ts`

#### Request Routing
- Route to auth service
- Route to user service
- Route to notification service
- Handle routing errors

#### Rate Limiting
- Apply rate limits
- Return 429 when exceeded
- Reset rate limit window

#### CORS Handling
- Allow configured origins
- Block unauthorized origins
- Handle preflight requests

#### Request/Response Transformation
- Add correlation ID
- Transform request headers
- Transform response format
- Error response standardization

### 5. Health Monitoring Flow

**File**: `packages/e2e/src/tests/health-monitoring.e2e-spec.ts`

#### Service Health Checks
- Check individual service health
- Check database connectivity
- Check Redis connectivity
- Aggregate health status

#### Metrics Collection
- Collect request metrics
- Track response times
- Monitor error rates
- System resource usage

#### Alerting
- Trigger alert on service failure
- Send notification on threshold breach
- Alert escalation

## Test Utilities

### Database Setup

```typescript
// packages/e2e/src/utils/database-setup.ts

export async function setupTestDatabase(): Promise<void> {
  const timestamp = Date.now();
  const testDbName = `orion_test_${timestamp}`;

  // Create database
  await execAsync(`createdb ${testDbName}`);

  // Run migrations
  process.env.DATABASE_URL = `postgresql://localhost/${testDbName}`;
  await execAsync('npx prisma migrate deploy');

  // Initialize Prisma client
  prisma = new PrismaClient();
  await prisma.$connect();
}

export async function teardownTestDatabase(): Promise<void> {
  await prisma.$disconnect();
  const dbName = process.env.DATABASE_URL.split('/').pop();
  await execAsync(`dropdb ${dbName}`);
}

export async function clearDatabase(): Promise<void> {
  // Truncate all tables
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
}
```

### Test Helpers

```typescript
// packages/e2e/src/utils/test-helpers.ts

export async function createTestApp(moduleMetadata: any): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule(moduleMetadata).compile();
  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

export function authenticatedRequest(app: INestApplication, token: string) {
  return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
}

export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
```

### Test Data Fixtures

```typescript
// packages/e2e/src/fixtures/test-data.ts

export const TEST_USERS = {
  admin: {
    email: 'admin@orion.test',
    password: 'Admin123!@#',
    username: 'admin',
    role: 'ADMIN',
  },
  user: {
    email: 'user@orion.test',
    password: 'User123!@#',
    username: 'testuser',
    role: 'USER',
  },
};

export const INVALID_CREDENTIALS = {
  invalidEmail: {
    email: 'invalid@orion.test',
    password: 'WrongPassword123!',
  },
  malformedEmail: {
    email: 'not-an-email',
    password: 'Password123!',
  },
};
```

## Test Examples

### Complete Authentication Flow

```typescript
describe('Authentication E2E', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp({ imports: [AuthModule] });
  });

  afterAll(async () => {
    await closeTestApp(app);
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should complete full registration and login flow', async () => {
    const testEmail = generateTestEmail();

    // 1. Register
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: 'SecurePassword123!',
        username: 'testuser',
      })
      .expect(201);

    expect(registerRes.body.tokens.accessToken).toBeDefined();
    authToken = registerRes.body.tokens.accessToken;

    // 2. Access protected route
    const profileRes = await authenticatedRequest(app, authToken)
      .get('/api/auth/profile')
      .expect(200);

    expect(profileRes.body.email).toBe(testEmail);

    // 3. Logout
    await authenticatedRequest(app, authToken)
      .post('/api/auth/logout')
      .expect(200);

    // 4. Verify token invalidated
    await authenticatedRequest(app, authToken)
      .get('/api/auth/profile')
      .expect(401);

    // 5. Login again
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'SecurePassword123!',
      })
      .expect(200);

    expect(loginRes.body.tokens.accessToken).toBeDefined();
  });
});
```

### Cross-Service Integration

```typescript
describe('User Notification Integration E2E', () => {
  it('should send notification when user is created', async () => {
    // 1. Register user
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'newuser@orion.test',
        password: 'Password123!',
        username: 'newuser',
      })
      .expect(201);

    const userId = registerRes.body.user.id;

    // 2. Wait for notification to be created
    await waitFor(async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId },
      });
      return notifications.length > 0;
    }, 5000);

    // 3. Verify notification exists
    const notifications = await prisma.notification.findMany({
      where: { userId },
    });

    expect(notifications).toContainEqual(
      expect.objectContaining({
        type: 'WELCOME_EMAIL',
        status: 'SENT',
      })
    );
  });
});
```

## Running E2E Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
nx run e2e:test --testFile=auth.e2e-spec.ts

# Run with watch mode
nx run e2e:test --watch

# Run with coverage
nx run e2e:test --coverage

# Run with debug
npm run test:e2e -- --detectOpenHandles --runInBand
```

### CI/CD Pipeline

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
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
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Setup test database
        run: |
          createdb orion_test
          npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/orion_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/orion_test
          REDIS_URL: redis://localhost:6379/1

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: coverage/
```

## Best Practices

### 1. Test Independence

Each test should be completely independent:

```typescript
beforeEach(async () => {
  await clearDatabase();
  await seedRequiredData();
});
```

### 2. Test Data Isolation

Use unique data for each test:

```typescript
it('should create user', async () => {
  const uniqueEmail = generateTestEmail(); // test-123456@example.com
  // Use uniqueEmail in test
});
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

### 4. Async/Await

Always use async/await for asynchronous operations:

```typescript
it('should complete async operation', async () => {
  const result = await service.asyncOperation();
  expect(result).toBeDefined();
});
```

### 5. Descriptive Test Names

Use clear, descriptive test names:

```typescript
// Good
it('should send welcome email when user registers successfully', async () => {});

// Bad
it('should work', async () => {});
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
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

#### Port Conflicts
```typescript
// Use dynamic ports
const app = await NestFactory.create(AppModule);
await app.listen(0); // Random available port
const port = app.getHttpServer().address().port;
```

#### Timeout Issues
```typescript
// Increase timeout for slow operations
it('should handle slow operation', async () => {
  // Test code
}, 60000); // 60 second timeout
```

## Monitoring and Reporting

### Test Results

- Jest HTML reporter
- JUnit XML for CI integration
- Coverage reports
- Execution time tracking

### Metrics to Track

- Test execution time
- Flaky test rate
- Coverage trends
- Failure patterns

## Maintenance

### Regular Tasks

- Update test data fixtures
- Review and optimize slow tests
- Fix flaky tests
- Update assertions for API changes
- Refactor test utilities

### Test Health

- Monitor test execution time
- Track failure rate
- Identify flaky tests
- Review coverage gaps

## References

- [NestJS E2E Testing](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing)
- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
