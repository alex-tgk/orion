# Coding Standards

This document defines the coding standards and best practices for the ORION microservices platform.

## Table of Contents

1. [TypeScript Best Practices](#typescript-best-practices)
2. [NestJS Patterns](#nestjs-patterns)
3. [Testing Standards](#testing-standards)
4. [Documentation Requirements](#documentation-requirements)
5. [File Organization](#file-organization)
6. [Code Style](#code-style)

## TypeScript Best Practices

### Type Safety

**Always use explicit types** - Avoid `any`

```typescript
// ❌ Bad
function processUser(user: any) {
  return user.name;
}

// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

function processUser(user: User): string {
  return user.name;
}
```

**Use strict TypeScript configuration:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Interfaces vs Types

**Prefer interfaces for object shapes:**

```typescript
// ✅ Good - Use interfaces for objects
interface UserDto {
  email: string;
  firstName: string;
  lastName: string;
}

// ✅ Good - Use type for unions
type UserRole = 'admin' | 'user' | 'guest';

// ✅ Good - Use type for complex types
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};
```

### Enums

**Use const enums when possible:**

```typescript
// ✅ Good - Const enum (no runtime overhead)
const enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED',
}

// ✅ Also good - Union type (even better for literal values)
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
```

### Null vs Undefined

**Be explicit about null/undefined:**

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  deletedAt: Date | null; // Explicitly nullable
  middleName?: string; // Optional, may be undefined
}

// ❌ Bad - Ambiguous
interface User {
  id: string;
  email: string;
  deletedAt: Date; // Can this be null?
  middleName: string; // Can this be undefined?
}
```

### Async/Await

**Prefer async/await over promises:**

```typescript
// ❌ Bad
function createUser(data: CreateUserDto) {
  return this.userRepository
    .create(data)
    .then((user) => this.emailService.sendWelcome(user))
    .then((user) => user)
    .catch((error) => {
      throw new InternalServerErrorException(error);
    });
}

// ✅ Good
async function createUser(data: CreateUserDto): Promise<User> {
  try {
    const user = await this.userRepository.create(data);
    await this.emailService.sendWelcome(user);
    return user;
  } catch (error) {
    throw new InternalServerErrorException(error.message);
  }
}
```

### Error Handling

**Use custom error classes:**

```typescript
// ✅ Good
export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

// Usage
if (existingUser) {
  throw new UserAlreadyExistsError(email);
}
```

### Utility Types

**Leverage built-in utility types:**

```typescript
// Pick
type UserPublicInfo = Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;

// Omit
type UserWithoutPassword = Omit<User, 'password'>;

// Partial
type UpdateUserDto = Partial<CreateUserDto>;

// Required
type CompleteUser = Required<User>;

// Readonly
type ImmutableUser = Readonly<User>;

// Record
type UserMap = Record<string, User>;
```

### Generics

**Use generics for reusable code:**

```typescript
// ✅ Good
export class Repository<T> {
  async findById(id: string): Promise<T | null> {
    // Implementation
  }

  async findAll(): Promise<T[]> {
    // Implementation
  }

  async create(data: Partial<T>): Promise<T> {
    // Implementation
  }
}

// Usage
const userRepo = new Repository<User>();
const user = await userRepo.findById('123'); // Type: User | null
```

## NestJS Patterns

### Module Organization

**Structure modules by feature:**

```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── refresh-token.dto.ts
├── entities/
│   └── session.entity.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── refresh-token.guard.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── refresh-token.strategy.ts
└── __tests__/
    └── auth.service.spec.ts
```

### Controllers

**Keep controllers thin:**

```typescript
// ✅ Good - Thin controller
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<UserDto> {
    return this.userService.findById(id);
  }

  @Post()
  @UsePipes(ValidationPipe)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.userService.create(createUserDto);
  }
}

// ❌ Bad - Business logic in controller
@Controller('users')
export class UserController {
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    // ❌ Don't do validation here
    if (!createUserDto.email) {
      throw new BadRequestException('Email required');
    }

    // ❌ Don't do business logic here
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // ❌ Don't do additional operations here
    await this.emailService.send(user.email, 'Welcome!');

    return user;
  }
}
```

### Services

**Single responsibility principle:**

```typescript
// ✅ Good - Each service has one responsibility
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hashPassword(createUserDto.password);

    const user = await this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    this.eventEmitter.emit('user.created', user);

    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

@Injectable()
export class UserNotificationService {
  constructor(private readonly emailService: EmailService) {}

  @OnEvent('user.created')
  async handleUserCreated(user: User): Promise<void> {
    await this.emailService.sendWelcome(user.email);
  }
}
```

### DTOs and Validation

**Use class-validator decorators:**

```typescript
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password too weak',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;
}
```

**Transform and sanitize inputs:**

```typescript
import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  password: string;
}
```

### Dependency Injection

**Use constructor injection:**

```typescript
// ✅ Good
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}
}

// ❌ Bad - Property injection
@Injectable()
export class UserService {
  @Inject(UserRepository)
  private userRepository: UserRepository;
}
```

### Guards

**Implement reusable guards:**

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
```

### Interceptors

**Use interceptors for cross-cutting concerns:**

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(`${method} ${url} ${responseTime}ms`);
      }),
    );
  }
}
```

### Exception Filters

**Create custom exception filters:**

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(`${request.method} ${request.url}`, exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

## Testing Standards

### Test Structure (AAA Pattern)

**Arrange, Act, Assert:**

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create user with hashed password', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const expectedUser = {
        id: 'user-123',
        ...createUserDto,
        password: 'hashed-password',
      };

      jest.spyOn(userRepository, 'create').mockResolvedValue(expectedUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(result.password).not.toBe(createUserDto.password);
      expect(userRepository.create).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Test Naming

**Use descriptive test names:**

```typescript
// ✅ Good
describe('UserService', () => {
  describe('create', () => {
    it('should create user with hashed password', () => {});
    it('should throw error when email already exists', () => {});
    it('should emit user.created event after creation', () => {});
    it('should rollback transaction if email sending fails', () => {});
  });
});

// ❌ Bad
describe('UserService', () => {
  it('test create', () => {});
  it('should work', () => {});
  it('email test', () => {});
});
```

### Test Coverage

**Aim for high coverage:**

```typescript
// ✅ Good - Test all paths
describe('calculateDiscount', () => {
  it('should return 0 for amounts under $100', () => {
    expect(calculateDiscount(50)).toBe(0);
  });

  it('should return 10% for amounts $100-$500', () => {
    expect(calculateDiscount(250)).toBe(25);
  });

  it('should return 20% for amounts over $500', () => {
    expect(calculateDiscount(600)).toBe(120);
  });

  it('should handle edge case of exactly $100', () => {
    expect(calculateDiscount(100)).toBe(10);
  });

  it('should handle edge case of exactly $500', () => {
    expect(calculateDiscount(500)).toBe(50);
  });

  it('should throw error for negative amounts', () => {
    expect(() => calculateDiscount(-10)).toThrow();
  });
});
```

### Mocking

**Use appropriate mocking strategies:**

```typescript
// ✅ Good - Mock external dependencies
describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendWelcome: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);
    emailService = module.get(EmailService);
  });

  it('should call repository and email service', async () => {
    const createUserDto = { email: 'test@example.com' };
    const createdUser = { id: '123', ...createUserDto };

    userRepository.create.mockResolvedValue(createdUser);
    emailService.sendWelcome.mockResolvedValue(undefined);

    await service.create(createUserDto);

    expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
    expect(emailService.sendWelcome).toHaveBeenCalledWith(createdUser.email);
  });
});
```

## Documentation Requirements

### JSDoc Comments

**Document all public APIs:**

```typescript
/**
 * Creates a new user in the system.
 *
 * @param createUserDto - The user data for creation
 * @returns The created user object without password
 * @throws {ConflictException} If user with email already exists
 * @throws {InternalServerErrorException} If database operation fails
 *
 * @example
 * ```typescript
 * const user = await userService.create({
 *   email: 'user@example.com',
 *   password: 'SecurePass123!',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * });
 * ```
 */
async create(createUserDto: CreateUserDto): Promise<UserDto> {
  // Implementation
}
```

### Interface Documentation

```typescript
/**
 * Data transfer object for user creation.
 *
 * @remarks
 * Password must be at least 8 characters and contain:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number or special character
 */
export interface CreateUserDto {
  /** User's email address (must be unique) */
  email: string;

  /** User's password (will be hashed before storage) */
  password: string;

  /** User's first name */
  firstName: string;

  /** User's last name */
  lastName: string;

  /** Optional middle name */
  middleName?: string;
}
```

### README Files

**Each package should have a README:**

```markdown
# Auth Service

Authentication and authorization service for ORION platform.

## Features

- JWT-based authentication
- Refresh token rotation
- Role-based access control (RBAC)
- Session management
- Password reset flow

## API Endpoints

### POST /auth/register
Register a new user account.

### POST /auth/login
Authenticate user and receive JWT token.

### POST /auth/refresh
Refresh access token using refresh token.

## Configuration

See `.env.example` for required environment variables.

## Testing

```bash
# Unit tests
nx test auth

# Integration tests
nx test:integration auth
```

## Dependencies

- @nestjs/jwt
- @nestjs/passport
- bcrypt
- passport-jwt
```

### Inline Comments

**Comment complex logic:**

```typescript
// ✅ Good - Explain why, not what
async refreshToken(refreshToken: string): Promise<TokenPair> {
  // Verify refresh token hasn't been used before (prevents replay attacks)
  const isUsed = await this.tokenBlacklist.check(refreshToken);
  if (isUsed) {
    throw new UnauthorizedException('Token already used');
  }

  // Decode and validate token
  const payload = await this.verifyToken(refreshToken);

  // Invalidate old refresh token
  await this.tokenBlacklist.add(refreshToken);

  // Issue new token pair
  return this.generateTokenPair(payload.userId);
}

// ❌ Bad - Obvious comments
async refreshToken(refreshToken: string): Promise<TokenPair> {
  // Check if token is used
  const isUsed = await this.tokenBlacklist.check(refreshToken);
  // If used, throw error
  if (isUsed) {
    throw new UnauthorizedException('Token already used');
  }

  // Verify token
  const payload = await this.verifyToken(refreshToken);

  // Add to blacklist
  await this.tokenBlacklist.add(refreshToken);

  // Generate tokens
  return this.generateTokenPair(payload.userId);
}
```

## File Organization

### Naming Conventions

**Files:**
```
user.service.ts          # Service
user.controller.ts       # Controller
user.module.ts          # Module
user.entity.ts          # Database entity
create-user.dto.ts      # DTO
user.interface.ts       # Interface
user.service.spec.ts    # Test file
user.constants.ts       # Constants
```

**Classes:**
```typescript
UserService             # PascalCase for classes
UserController
CreateUserDto
UserNotFoundException
```

**Functions:**
```typescript
createUser()            # camelCase for functions
findUserById()
validateEmail()
```

**Constants:**
```typescript
const MAX_LOGIN_ATTEMPTS = 5;     # UPPER_SNAKE_CASE
const JWT_EXPIRATION = '15m';
```

**Interfaces:**
```typescript
interface User { }              # PascalCase (no I prefix)
interface CreateUserDto { }     # Not ICreateUserDto
```

### File Structure

**Service file structure:**

```typescript
// 1. Imports (grouped)
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';

// 2. Constants
const MAX_USERS_PER_PAGE = 50;

// 3. Interfaces (if any)
interface UserFilters {
  role?: string;
  status?: string;
}

// 4. Class
@Injectable()
export class UserService {
  // 4a. Constructor
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 4b. Public methods
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Implementation
  }

  async findAll(filters: UserFilters): Promise<User[]> {
    // Implementation
  }

  // 4c. Private methods
  private async validateEmail(email: string): Promise<boolean> {
    // Implementation
  }

  private hashPassword(password: string): Promise<string> {
    // Implementation
  }
}
```

## Code Style

### Formatting

**Use Prettier (configured in `.prettierrc`):**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### ESLint Rules

**Key rules from `eslint.config.js`:**

```javascript
{
  "prefer-const": "error",
  "no-var": "error",
  "arrow-body-style": ["error", "as-needed"],
  "prefer-arrow-callback": "error",
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-explicit-any": "error"
}
```

### Imports

**Order imports:**

```typescript
// 1. External dependencies
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';

// 2. Internal modules (absolute imports)
import { User } from '@orion/shared/entities';
import { EmailService } from '@orion/shared/services';

// 3. Relative imports
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
```

### Functions

**Prefer arrow functions for callbacks:**

```typescript
// ✅ Good
const users = await this.userRepository.findAll();
const emails = users.map((user) => user.email);

const filtered = users.filter((user) => user.isActive);

// ❌ Bad
const emails = users.map(function (user) {
  return user.email;
});
```

**Use async/await:**

```typescript
// ✅ Good
async function loadUser(id: string): Promise<User> {
  const user = await this.userRepository.findById(id);
  if (!user) {
    throw new NotFoundException();
  }
  return user;
}

// ❌ Bad
function loadUser(id: string): Promise<User> {
  return this.userRepository.findById(id).then((user) => {
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  });
}
```

### Objects

**Use object destructuring:**

```typescript
// ✅ Good
const { email, firstName, lastName } = createUserDto;

// ✅ Good - With defaults
const { role = 'user', status = 'active' } = userData;

// ✅ Good - Function parameters
function createUser({ email, password, firstName, lastName }: CreateUserDto) {
  // Implementation
}
```

**Use spread operator:**

```typescript
// ✅ Good
const updatedUser = {
  ...existingUser,
  ...updates,
};

// ✅ Good - Avoid mutations
const users = [...existingUsers, newUser];
```

## Quick Reference

### Checklist for New Code

- [ ] TypeScript types are explicit (no `any`)
- [ ] Functions have return types
- [ ] DTOs have validation decorators
- [ ] Services use dependency injection
- [ ] Controllers are thin
- [ ] Business logic is in services
- [ ] Tests follow AAA pattern
- [ ] Test coverage > 80%
- [ ] Public APIs have JSDoc comments
- [ ] Complex logic has inline comments
- [ ] Code is formatted with Prettier
- [ ] No ESLint errors
- [ ] Imports are organized
- [ ] File naming follows conventions

### Common Patterns

```typescript
// Service pattern
@Injectable()
export class MyService {
  constructor(private readonly dependency: Dependency) {}
  async method(): Promise<Result> { }
}

// Controller pattern
@Controller('resource')
export class MyController {
  constructor(private readonly service: MyService) {}
  @Get()
  async findAll(): Promise<Resource[]> {
    return this.service.findAll();
  }
}

// DTO pattern
export class CreateDto {
  @IsString()
  @MinLength(2)
  name: string;
}

// Exception pattern
if (!entity) {
  throw new NotFoundException(`Entity not found`);
}
```

---

**Remember:** Consistent code is readable code. Follow these standards to maintain high code quality across the platform!
