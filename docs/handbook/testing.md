# Testing Guide

This guide covers the testing philosophy and patterns for the ORION platform.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Test Patterns](#unit-test-patterns)
3. [Integration Test Patterns](#integration-test-patterns)
4. [E2E Test Patterns](#e2e-test-patterns)
5. [Coverage Requirements](#coverage-requirements)
6. [Test Utilities](#test-utilities)
7. [Best Practices](#best-practices)

## Testing Philosophy

### The Testing Pyramid

```
        /\
       /  \      E2E Tests (Few)
      /____\     - Test complete user workflows
     /      \    - Slow, expensive, brittle
    /        \
   /  Integration\ Integration Tests (Some)
  /______________\ - Test service interactions
 /                \ - Database, APIs, queues
/  Unit Tests      \ Unit Tests (Many)
/____________________\ - Test individual functions
                     - Fast, isolated, reliable
```

### Core Principles

1. **Fast Feedback** - Tests should run quickly
2. **Reliable** - No flaky tests
3. **Isolated** - Tests don't depend on each other
4. **Readable** - Tests document behavior
5. **Maintainable** - Easy to update as code changes

### Test-Driven Development (TDD)

**Red-Green-Refactor cycle:**

1. **Red** - Write a failing test
2. **Green** - Write minimal code to pass
3. **Refactor** - Improve code while keeping tests green

**Example:**

```typescript
// 1. RED - Write failing test
describe('EmailValidator', () => {
  it('should validate correct email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });
});

// 2. GREEN - Implement minimal solution
function validateEmail(email: string): boolean {
  return email.includes('@');
}

// 3. REFACTOR - Improve implementation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

## Unit Test Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create user with hashed password', async () => {
      // Arrange - Set up test data and mocks
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: 'user-123',
        ...createUserDto,
        password: 'hashed-password',
      };

      jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');

      // Act - Execute the function
      const result = await service.create(createUserDto);

      // Assert - Verify the results
      expect(result).toEqual(mockUser);
      expect(result.password).not.toBe(createUserDto.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashed-password',
      });
    });
  });
});
```

### Testing Services

**Service setup:**

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests...
});
```

**Testing async operations:**

```typescript
describe('login', () => {
  it('should return JWT tokens on successful login', async () => {
    // Arrange
    const loginDto = { email: 'test@example.com', password: 'Password123!' };
    const user = { id: 'user-123', email: loginDto.email, password: 'hashed' };
    const tokens = { access_token: 'jwt-token', refresh_token: 'refresh-token' };

    userRepository.findOne.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jwtService.sign.mockReturnValueOnce(tokens.access_token);
    jwtService.sign.mockReturnValueOnce(tokens.refresh_token);

    // Act
    const result = await service.login(loginDto);

    // Assert
    expect(result).toEqual(tokens);
    expect(eventEmitter.emit).toHaveBeenCalledWith('user.login', user);
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    // Arrange
    const loginDto = { email: 'test@example.com', password: 'wrong' };
    userRepository.findOne.mockResolvedValue(null);

    // Act & Assert
    await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
  });
});
```

### Testing Controllers

```typescript
describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService);
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      // Arrange
      const users = [
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' },
      ];
      service.findAll.mockResolvedValue(users);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
```

### Testing Guards

```typescript
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  describe('canActivate', () => {
    it('should return true for valid JWT', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer valid-token' },
      });

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for invalid JWT', () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer invalid-token' },
      });

      // Act & Assert
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
```

## Integration Test Patterns

### Database Integration Tests

**Setup test database:**

```typescript
// test-database.ts
import { PrismaClient } from '@prisma/client';

export class TestDatabase {
  private static prisma: PrismaClient;

  static async initialize() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_TEST_URL,
        },
      },
    });

    await this.prisma.$connect();
    return this.prisma;
  }

  static async cleanup() {
    const tables = ['users', 'sessions', 'notifications'];

    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    }
  }

  static async close() {
    await this.prisma.$disconnect();
  }

  static async seed(data: any) {
    for (const [model, records] of Object.entries(data)) {
      for (const record of records as any[]) {
        await this.prisma[model].create({ data: record });
      }
    }
  }
}
```

**Integration test example:**

```typescript
describe('User Service Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await TestDatabase.initialize();

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

  describe('User Creation Flow', () => {
    it('should create user, hash password, and send welcome email', async () => {
      // Arrange
      const createUserDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(createUserDto)
        .expect(201);

      // Assert - Check response
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body).not.toHaveProperty('password');

      // Assert - Verify database
      const user = await prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      expect(user).toBeTruthy();
      expect(user.password).not.toBe(createUserDto.password); // Should be hashed
      expect(user.firstName).toBe(createUserDto.firstName);

      // Assert - Verify email sent (check queue or mock)
      // ... email verification
    });
  });
});
```

### API Integration Tests

```typescript
describe('Auth API Integration', () => {
  it('should complete full authentication flow', async () => {
    // 1. Register
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test@123',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    const { access_token } = registerResponse.body;
    expect(access_token).toBeDefined();

    // 2. Access protected route
    const profileResponse = await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);

    expect(profileResponse.body.email).toBe('test@example.com');

    // 3. Logout
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);

    // 4. Verify token invalid after logout
    await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${access_token}`)
      .expect(401);
  });
});
```

## E2E Test Patterns

### Playwright Setup

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Start services
  // Seed database
  // Create test users
}

export default globalSetup;
```

### E2E Test Example

```typescript
// e2e/tests/auth.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register, login, and access protected page', async ({ page, request }) => {
    // Register
    const email = `test-${Date.now()}@example.com`;

    const registerResponse = await request.post('/api/auth/register', {
      data: {
        email,
        password: 'Test@1234',
        firstName: 'E2E',
        lastName: 'Test',
      },
    });

    expect(registerResponse.status()).toBe(201);
    const { access_token } = await registerResponse.json();

    // Login via UI
    await page.goto('/login');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verify user profile loaded
    await expect(page.locator('.user-email')).toHaveText(email);
  });
});
```

## Coverage Requirements

### Coverage Thresholds

**Global requirements (jest.preset.js):**

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

### Per-Service Requirements

| Service | Coverage | Rationale |
|---------|----------|-----------|
| Auth | 90% | Critical security |
| User | 85% | Core functionality |
| Gateway | 85% | Entry point |
| Shared | 90% | Widely used |
| Notifications | 80% | Non-critical |
| Admin UI | 75% | UI components |

### Generating Coverage Reports

```bash
# Run tests with coverage
pnpm test:coverage

# View HTML report
open coverage/lcov-report/index.html

# View terminal summary
pnpm test:coverage | grep "All files"

# Coverage for specific service
nx test auth --coverage

# CI coverage report
pnpm test:ci
```

### Coverage Best Practices

**What to test:**
- ✅ Business logic
- ✅ Error handling
- ✅ Edge cases
- ✅ Input validation
- ✅ State transitions

**What not to test:**
- ❌ Third-party libraries
- ❌ Framework internals
- ❌ Simple getters/setters
- ❌ Configuration files
- ❌ Type definitions

## Test Utilities

### Shared Test Utilities

Located in `packages/shared/src/testing/`:

**JWT Token Factory:**

```typescript
import { JwtTokenFactory } from '@orion/shared/testing';

const adminToken = JwtTokenFactory.generateAdmin();
const userToken = JwtTokenFactory.generateUser('user-123');
const expiredToken = JwtTokenFactory.generateExpired({ sub: 'user-123' });
```

**Mock Repository:**

```typescript
import { MockRepository } from '@orion/shared/testing';

const userRepository = new MockRepository<User>();
await userRepository.create({ email: 'test@example.com' });
const user = await userRepository.findOne({ email: 'test@example.com' });
```

**Test Fixtures:**

```typescript
import { UserFixture, NotificationFixture } from '@orion/shared/testing';

const user = UserFixture.createUser();
const admin = UserFixture.createAdmin();
const users = UserFixture.createBulkUsers(10);

const email = NotificationFixture.createEmailNotification();
```

**WebSocket Test Client:**

```typescript
import { WebSocketTestClient } from '@orion/shared/testing';

const client = new WebSocketTestClient({ port: 3000 });
await client.connect();

client.emit('subscribe', { channel: 'notifications' });
const data = await client.waitForEvent('notification:created');

client.disconnect();
```

## Best Practices

### 1. Test Naming

```typescript
// ✅ Good - Descriptive names
it('should return 401 when JWT token is expired', () => {});
it('should hash password before storing in database', () => {});
it('should emit user.created event after successful registration', () => {});

// ❌ Bad - Vague names
it('should work', () => {});
it('test login', () => {});
it('auth test', () => {});
```

### 2. Test Independence

```typescript
// ✅ Good - Independent tests
describe('UserService', () => {
  beforeEach(() => {
    // Fresh setup for each test
  });

  it('test 1', () => {
    // Self-contained
  });

  it('test 2', () => {
    // Doesn't depend on test 1
  });
});

// ❌ Bad - Dependent tests
describe('UserService', () => {
  let user;

  it('should create user', () => {
    user = createUser(); // Sets shared state
  });

  it('should find user', () => {
    findUser(user.id); // Depends on previous test
  });
});
```

### 3. Mock External Dependencies

```typescript
// ✅ Good
jest.spyOn(emailService, 'send').mockResolvedValue(undefined);
jest.spyOn(httpService, 'get').mockResolvedValue({ data: {} });

// ❌ Bad - Don't actually call external services
await emailService.send(); // Real API call
await httpService.get(); // Real HTTP request
```

### 4. Test Error Cases

```typescript
describe('createUser', () => {
  it('should create user successfully', () => {
    // Happy path
  });

  it('should throw when email is invalid', () => {
    // Error case
  });

  it('should throw when email already exists', () => {
    // Error case
  });

  it('should throw when database is unavailable', () => {
    // Error case
  });
});
```

### 5. Use Test Helpers

```typescript
// ✅ Good - Reusable helpers
function createTestUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };
}

it('should process user', () => {
  const user = createTestUser({ email: 'custom@example.com' });
  // Use user
});

// ❌ Bad - Duplicate setup
it('test 1', () => {
  const user = {
    id: 'user-123',
    email: 'test@example.com',
    // ... repeated in every test
  };
});
```

## Quick Reference

### Common Commands

```bash
# Run all tests
pnpm test:all

# Run specific service tests
nx test auth

# Watch mode
nx test auth --watch

# Coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e

# Integration tests
pnpm test:integration

# Debug tests
nx test auth --runInBand --no-cache
```

### Test Checklist

- [ ] Tests follow AAA pattern
- [ ] Descriptive test names
- [ ] Tests are independent
- [ ] External dependencies mocked
- [ ] Both success and error cases tested
- [ ] Edge cases covered
- [ ] Coverage threshold met
- [ ] Tests run fast
- [ ] No flaky tests

---

For more detailed information, see the [Comprehensive Testing Guide](../../TESTING_GUIDE.md).

**Remember:** Good tests are the foundation of maintainable code. Invest time in writing quality tests!
