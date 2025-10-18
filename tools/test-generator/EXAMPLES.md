# Test Generator Examples

Real-world examples of using the AI test generator.

## Example 1: Generate Tests for a Controller

### Input File: `auth.controller.ts`

```typescript
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req, @Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    return this.authService.logout(req.user.id, token);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.validateUser(req.user.id);
  }
}
```

### Command

```bash
npm run generate:tests:file packages/auth/src/app/auth.controller.ts -- --integration --edge-cases
```

### Generated: `auth.controller.spec.ts`

The generator will create comprehensive tests including:
- Mock setup for AuthService
- Tests for login endpoint with various scenarios
- Tests for logout with authentication
- Tests for profile retrieval
- Edge cases and error scenarios
- Integration tests with full HTTP testing

## Example 2: Generate Tests for a Service

### Input File: `auth.service.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@orion/shared';
import { HashService } from './hash.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private hashService: HashService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.hashService.compare(
      loginDto.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
```

### Command

```bash
npm run generate:tests:file packages/auth/src/app/services/auth.service.ts -- --error-scenarios --fixtures
```

### Generated Output

The generator creates:
- Proper mock setup for all dependencies (PrismaService, JwtService, HashService)
- Tests for successful login
- Tests for invalid credentials
- Tests for inactive users
- Tests for password comparison failures
- Mock data fixtures
- Edge case testing

## Example 3: Coverage-Based Generation

### Command

```bash
npm run generate:tests:coverage -- --service auth --threshold 70
```

### Output

```
Analyzing coverage for auth service...

Coverage Report for auth:
Overall Coverage: 58.32%

Low Coverage Files:
  packages/auth/src/app/services/session.service.ts:
    Lines: 42.1%
    Functions: 38.5%
    Branches: 35.0%

  packages/auth/src/app/guards/roles.guard.ts:
    Lines: 55.2%
    Functions: 50.0%
    Branches: 45.8%

Recommendations:
  - session.service.ts: Add unit tests for functions (38.5% coverage)
  - session.service.ts: Add tests for uncovered lines: 23, 45, 67-89
  - roles.guard.ts: Add tests for conditional branches (45.8% coverage)

Generating tests for session.service.ts...
✓ Generated session.service.spec.ts
✓ Tests compile successfully
✓ Tests pass
✓ Coverage improved from 42.1% to 78.3%

Generating tests for roles.guard.ts...
✓ Generated roles.guard.spec.ts
✓ Tests compile successfully
✓ Tests pass
✓ Coverage improved from 55.2% to 85.7%

Service coverage improved from 58.32% to 82.15%!
```

## Example 4: Integration Test Generation

### Command

```bash
npm run generate:tests:service auth -- --integration
```

### Generated: `auth.integration.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from './auth.module';

describe('Auth Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('id');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('Authentication Flow', () => {
    it('should handle complete auth flow', async () => {
      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      const { accessToken } = loginResponse.body;

      // Access protected route
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify token is blacklisted
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});
```

## Example 5: Batch Generation for Entire Service

### Command

```bash
npm run generate:tests:service notifications
```

### Output

```
Generating tests for service: notifications
Found 8 files needing tests

Analyzing packages/notifications/src/app/notifications.controller.ts...
✓ Generated notifications.controller.spec.ts

Analyzing packages/notifications/src/app/services/notifications.service.ts...
✓ Generated notifications.service.spec.ts

Analyzing packages/notifications/src/app/services/email.service.ts...
✓ Generated email.service.spec.ts

Analyzing packages/notifications/src/app/services/sms.service.ts...
✓ Generated sms.service.spec.ts

Analyzing packages/notifications/src/app/services/push.service.ts...
✓ Generated push.service.spec.ts

Analyzing packages/notifications/src/app/consumers/notification.consumer.ts...
✓ Generated notification.consumer.spec.ts

Analyzing packages/notifications/src/app/entities/notification.entity.ts...
✓ Generated notification.entity.spec.ts

Analyzing packages/notifications/src/app/dto/send-notification.dto.ts...
✓ Generated send-notification.dto.spec.ts

✓ Tests generated for service: notifications
All tests compile and pass!
```

## Example 6: Using Claude Code Slash Command

### Interactive Session

```
User: /generate-tests

Claude: I'll help you generate tests! What would you like to test?

1. Specific file - Generate tests for a single file
2. Entire service - Generate tests for all files in a service
3. Low coverage areas - Generate tests only where coverage is low
4. All services - Generate tests for all services

User: 3

Claude: I'll analyze test coverage and generate tests for low-coverage areas.
Which threshold should I use? (default: 60%)

User: 70

Claude: Analyzing test coverage across all services...

Found low-coverage services:
- gateway (58.3%)
- notifications (62.1%)
- user (45.7%)

Generating tests for these services...

[Processing...]

✓ Generated 23 test files
✓ Coverage improved:
  - gateway: 58.3% → 82.1%
  - notifications: 62.1% → 79.8%
  - user: 45.7% → 81.5%

All tests compile and pass!

Would you like me to commit these changes?
```

## Example 7: Custom Configuration

### Creating Custom Template

```typescript
// tools/test-generator/templates/custom.template.ts
import { SourceFileAnalysis } from '../types';

export function generateCustomTest(analysis: SourceFileAnalysis): string {
  return `
import { Test } from '@nestjs/testing';
import { ${analysis.className} } from './${analysis.className.toLowerCase()}';

describe('${analysis.className} - Custom Pattern', () => {
  let instance: ${analysis.className};

  beforeEach(async () => {
    instance = new ${analysis.className}(/* deps */);
  });

  // Custom test patterns here
});
  `;
}
```

### Using Custom Configuration

```bash
# Edit config.json to add custom patterns
{
  "patterns": {
    "custom": ["**/*.custom.ts"]
  }
}

# Generate with custom template
npm run generate:tests:file packages/custom/my-file.custom.ts
```

## Example 8: GitHub Workflow Trigger

### Manual Trigger

```bash
# Trigger workflow for specific service
gh workflow run test-coverage-improvement.yml \
  -f service=auth \
  -f threshold=75

# Check workflow status
gh run list --workflow=test-coverage-improvement.yml

# View workflow logs
gh run view <run-id>
```

### Automated Weekly Run

The workflow runs automatically every Monday at 9 AM UTC:
1. Analyzes coverage across all services
2. Identifies services below threshold
3. Generates tests for low-coverage areas
4. Creates PR with generated tests

### PR Created

```markdown
# feat: AI-generated tests for coverage improvement

## Summary
Added comprehensive tests for services with low test coverage.

## Coverage Improvements
- auth: 58.3% → 82.1%
- gateway: 62.1% → 79.8%

## Files Changed
- packages/auth/src/app/auth.controller.spec.ts (new)
- packages/auth/src/app/services/auth.service.spec.ts (new)
- packages/gateway/src/app/gateway.controller.spec.ts (new)

## Quality Checks
✓ All tests compile
✓ All tests pass
✓ Follow ORION patterns
```

## Best Practices from Examples

1. **Start with Coverage Analysis**
   ```bash
   npm run generate:tests:coverage -- --service myservice
   ```

2. **Generate Integration Tests for Critical Flows**
   ```bash
   npm run generate:tests:file critical.controller.ts -- --integration
   ```

3. **Use Edge Cases for Complex Logic**
   ```bash
   npm run generate:tests:file complex.service.ts -- --edge-cases --error-scenarios
   ```

4. **Review and Enhance Generated Tests**
   - Check mock implementations
   - Verify test data
   - Add domain-specific scenarios
   - Enhance edge cases

5. **Measure Improvement**
   ```bash
   npm run test:coverage
   ```

6. **Commit Incrementally**
   - Generate for one service
   - Review and test
   - Commit before moving to next

## Troubleshooting Examples

### Example: Tests Don't Compile

```bash
# Check TypeScript errors
npx tsc --noEmit packages/auth/src/app/auth.controller.spec.ts

# Fix import paths if needed
# Regenerate with corrections
npm run generate:tests:file packages/auth/src/app/auth.controller.ts
```

### Example: Tests Fail

```bash
# Run specific test to see errors
npx jest packages/auth/src/app/auth.controller.spec.ts

# Review mock setup
# Adjust test data
# Regenerate if needed
```

## Summary

The AI test generator is a powerful tool for:
- Quickly creating comprehensive test coverage
- Maintaining testing standards across services
- Identifying and filling coverage gaps
- Accelerating development with automated testing

Start with small batches, review thoroughly, and iterate to achieve high-quality test coverage!
