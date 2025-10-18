# Coding Standards & Best Practices

**Version:** 1.0.0
**Last Updated:** 2025-10-18

---

## General Principles

1. **Code is read more than written** - Optimize for readability
2. **Consistency > Personal preference** - Follow team standards
3. **Tests are non-negotiable** - All code must have tests
4. **Documentation is code** - Keep docs up to date
5. **Review thoroughly** - Every PR gets a careful review

---

## TypeScript Guidelines

### Type Safety

```typescript
// ✅ Good: Explicit types for function parameters and returns
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad: Implicit any types
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Good: Use interfaces for object shapes
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// ❌ Bad: Use 'any' for objects
const user: any = { id: '123', email: 'test@example.com' };

// ✅ Good: Use union types
type Status = 'pending' | 'approved' | 'rejected';

// ❌ Bad: Use string for limited options
const status: string = 'pending';

// ✅ Good: Use optional chaining and nullish coalescing
const userName = user?.profile?.name ?? 'Anonymous';

// ❌ Bad: Nested conditionals
const userName = user && user.profile && user.profile.name
  ? user.profile.name
  : 'Anonymous';
```

### Naming Conventions

```typescript
// ✅ Variables and functions: camelCase
const userCount = 10;
function getUserById(id: string) {}

// ✅ Classes and interfaces: PascalCase
class UserService {}
interface UserProfile {}

// ✅ Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// ✅ Type aliases: PascalCase
type UserId = string;
type UserRole = 'admin' | 'user' | 'guest';

// ✅ Enums: PascalCase (both enum and values)
enum UserStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED',
}

// ✅ Private fields: prefix with underscore
class UserService {
  private _cache: Map<string, User>;
}

// ✅ Boolean variables: use is/has/can prefix
const isActive = true;
const hasPermission = false;
const canEdit = true;
```

---

## NestJS Best Practices

### Module Organization

```typescript
// ✅ Good: Well-organized module
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserValidator,
  ],
  exports: [UserService],
})
export class UserModule {}

// ❌ Bad: Everything exported, unclear dependencies
@Module({
  imports: [TypeOrmModule.forFeature([User, Profile, Session])],
  controllers: [UserController, ProfileController],
  providers: [UserService, ProfileService, SessionService],
  exports: [UserService, ProfileService, SessionService],
})
export class UserModule {}
```

### Dependency Injection

```typescript
// ✅ Good: Inject dependencies via constructor
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}
}

// ❌ Bad: Create dependencies manually
@Injectable()
export class UserService {
  private userRepository = new UserRepository();
  private logger = new LoggerService();
}
```

### DTOs and Validation

```typescript
// ✅ Good: Use class-validator decorators
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

// ❌ Bad: No validation
export class CreateUserDto {
  email: string;
  password: string;
  name?: string;
}
```

### Error Handling

```typescript
// ✅ Good: Use NestJS exceptions with proper status codes
@Injectable()
export class UserService {
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    try {
      return await this.userRepository.create(dto);
    } catch (error) {
      if (error.code === 'P2002') {  // Prisma unique constraint
        throw new ConflictException('Email already exists');
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}

// ❌ Bad: Generic error handling
async findById(id: string) {
  try {
    return await this.userRepository.findById(id);
  } catch (error) {
    throw new Error('Something went wrong');
  }
}
```

---

## Testing Standards

### Unit Tests

```typescript
// ✅ Good: Comprehensive test with arrange-act-assert
describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
    } as any;

    service = new UserService(repository);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: '123', email: 'test@example.com' };
      repository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById('123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

// ❌ Bad: Minimal test coverage
describe('UserService', () => {
  it('works', () => {
    const service = new UserService();
    expect(service).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// ✅ Good: Test actual API endpoints
describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

### Test Coverage Requirements

- **Minimum**: 80% overall coverage
- **Services**: 90% coverage
- **Controllers**: 80% coverage
- **Critical paths**: 100% coverage

---

## Code Organization

### File Structure

```
packages/user/
├── src/
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.controller.spec.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── user.service.ts
│   │   │   ├── user.service.spec.ts
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   └── index.ts
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── index.ts
│   │   ├── interfaces/
│   │   │   └── user.interface.ts
│   │   ├── app.module.ts
│   │   └── app.controller.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── project.json
├── tsconfig.json
└── package.json
```

### Import Order

```typescript
// ✅ Good: Organized imports
// 1. Node built-ins
import { join } from 'path';

// 2. External libraries
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

// 3. Internal shared libraries
import { LoggerService } from '@orion/shared/logger';
import { CacheService } from '@orion/shared/cache';

// 4. Local imports
import { UserService } from './services/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

// ❌ Bad: Mixed import order
import { User } from './entities/user.entity';
import { Controller } from '@nestjs/common';
import { UserService } from './services/user.service';
import { join } from 'path';
```

---

## Database & Prisma

### Schema Design

```prisma
// ✅ Good: Well-defined schema with constraints
model User {
  id            String       @id @default(uuid())
  email         String       @unique
  passwordHash  String       @map("password_hash")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")
  
  profile       UserProfile?
  sessions      Session[]
  
  @@index([email])
  @@map("users")
}

model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique @map("user_id")
  firstName String?  @map("first_name")
  lastName  String?  @map("last_name")
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_profiles")
}

// ❌ Bad: No constraints or indexes
model User {
  id       String
  email    String
  password String
  
  @@map("users")
}
```

### Query Patterns

```typescript
// ✅ Good: Use specific selects and includes
async findUserProfile(id: string) {
  return this.prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

// ❌ Bad: Over-fetching data
async findUserProfile(id: string) {
  return this.prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      sessions: true,
      notifications: true,  // Not needed!
    },
  });
}

// ✅ Good: Use transactions for related operations
async createUserWithProfile(dto: CreateUserDto) {
  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: dto.email,
        passwordHash: await this.hash(dto.password),
      },
    });

    const profile = await tx.userProfile.create({
      data: {
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    return { user, profile };
  });
}
```

---

## Git Workflow

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# ✅ Good commit messages
feat: add user profile endpoint
fix: resolve authentication timeout issue
docs: update API documentation for auth service
refactor: simplify user validation logic
test: add integration tests for user service
chore: update dependencies

# With scope
feat(auth): implement refresh token rotation
fix(gateway): handle rate limit edge cases

# Breaking changes
feat(api)!: change user ID format to UUID

# ❌ Bad commit messages
WIP
update
fix stuff
changes
```

### Branch Naming

```bash
# ✅ Good branch names
feature/user-profile-endpoint
fix/auth-timeout-issue
refactor/user-validation
docs/api-documentation

# ❌ Bad branch names
my-changes
updates
fix
new-feature
```

### Pull Request Guidelines

```markdown
## Description
Brief description of what this PR does and why.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Detailed list of changes
- Each change on its own line

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] All tests passing
- [ ] No console.log or debugger statements
```

---

## Code Review Checklist

### For Authors

- [ ] Self-review completed
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] No hardcoded credentials or secrets
- [ ] No commented-out code
- [ ] Console.logs removed
- [ ] TypeScript types are explicit
- [ ] Error handling is comprehensive

### For Reviewers

- [ ] Code is understandable
- [ ] Tests are adequate
- [ ] No security issues
- [ ] Performance considerations addressed
- [ ] Documentation is clear
- [ ] Follows coding standards
- [ ] No unnecessary complexity

---

## Performance Guidelines

```typescript
// ✅ Good: Efficient database queries
async getUsersWithProfiles(limit: number) {
  return this.prisma.user.findMany({
    take: limit,
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

// ❌ Bad: N+1 query problem
async getUsersWithProfiles(limit: number) {
  const users = await this.prisma.user.findMany({ take: limit });
  
  return Promise.all(
    users.map(async (user) => ({
      ...user,
      profile: await this.prisma.userProfile.findUnique({
        where: { userId: user.id },
      }),
    })),
  );
}

// ✅ Good: Use caching for expensive operations
@Cacheable({ ttl: 300 })
async getExpensiveData() {
  return await this.performExpensiveOperation();
}

// ✅ Good: Use pagination
async listUsers(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  
  return this.prisma.user.findMany({
    skip,
    take: pageSize,
  });
}
```

---

## Security Guidelines

```typescript
// ✅ Good: Validate and sanitize inputs
@Post()
async createUser(@Body() dto: CreateUserDto) {
  // DTO validation happens automatically via class-validator
  return this.userService.create(dto);
}

// ❌ Bad: No input validation
@Post()
async createUser(@Body() body: any) {
  return this.userService.create(body);
}

// ✅ Good: Use parameterized queries (Prisma does this automatically)
async findByEmail(email: string) {
  return this.prisma.user.findUnique({
    where: { email },
  });
}

// ❌ Bad: Raw SQL with string interpolation (SQL injection risk)
async findByEmail(email: string) {
  return this.prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
}

// ✅ Good: Hash passwords
const hashedPassword = await bcrypt.hash(password, 10);

// ❌ Bad: Store plain text passwords
const password = dto.password;  // NEVER DO THIS!
```

---

## Documentation Standards

### Code Comments

```typescript
// ✅ Good: Explain why, not what
// Use exponential backoff to avoid overwhelming the external API
// during temporary outages
const retryDelay = Math.pow(2, attemptNumber) * 1000;

// ❌ Bad: State the obvious
// Multiply 2 by attemptNumber and multiply by 1000
const retryDelay = Math.pow(2, attemptNumber) * 1000;

// ✅ Good: Document complex logic
/**
 * Calculates the user's subscription tier based on usage metrics.
 * 
 * Tiers are determined by:
 * - API calls per month
 * - Storage usage
 * - Team size
 * 
 * @param userId - The user to calculate tier for
 * @returns The calculated tier ('free' | 'pro' | 'enterprise')
 */
async calculateSubscriptionTier(userId: string): Promise<Tier> {
  // Implementation
}
```

### API Documentation

```typescript
// ✅ Good: Comprehensive Swagger documentation
@ApiTags('users')
@Controller('users')
export class UserController {
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findById(id);
  }
}
```

---

## Common Pitfalls to Avoid

1. **Don't use `any` type** - It defeats the purpose of TypeScript
2. **Don't ignore errors** - Always handle or propagate
3. **Don't commit secrets** - Use environment variables
4. **Don't skip tests** - Tests are not optional
5. **Don't over-engineer** - Keep it simple
6. **Don't ignore code review feedback** - It's there to help
7. **Don't commit commented code** - Delete it or use git
8. **Don't use console.log in production** - Use proper logging

---

## Tools & IDE Setup

### Required VS Code Extensions

- ESLint
- Prettier
- Prisma
- TypeScript
- GitLens
- Nx Console

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

**Questions?** Ask in #engineering-orion on Slack

**Last Updated:** 2025-10-18
