# Quick Start Guide - Parallel Development

## Getting Started in 5 Minutes

This guide helps you start working on your assigned workstream without conflicts.

---

## Step 1: Setup Your Environment

```bash
# Clone and enter repository
cd /Users/acarroll/dev/projects/orion

# Install dependencies
pnpm install

# Verify setup
pnpm type-check
pnpm lint
pnpm test
```

---

## Step 2: Identify Your Workstream

Find your workstream in `/Users/acarroll/dev/projects/orion/.swarm/PARALLEL_WORK_COORDINATION_PLAN.md`

**Quick Reference**:
- **Workstream 1**: Auth Service → `/packages/auth/`
- **Workstream 2**: User Service → `/packages/user/`
- **Workstream 3**: Notification Service → `/packages/notifications/`
- **Workstream 4**: API Gateway → `/packages/gateway/`
- **Workstream 5**: Admin UI → `/packages/admin-ui/`
- **Workstream 6**: Shared Contracts → `/packages/shared/src/contracts/`
- **Workstream 7**: Infrastructure → `/packages/{logger,cache,config,secrets,storage}/`
- **Workstream 8**: Database Schemas → `/packages/*/prisma/`
- **Workstream 9**: Testing → Jest configs, E2E tests
- **Workstream 10**: DevOps → Docker, K8s, CI/CD

---

## Step 3: Create Your Feature Branch

```bash
# Format: [workstream]/[description]
git checkout -b auth/implement-jwt-flow
git checkout -b user/add-profile-endpoints
git checkout -b gateway/setup-routing
```

**Branch Naming Convention**:
- `auth/[feature]` - Auth service work
- `user/[feature]` - User service work
- `notifications/[feature]` - Notification service work
- `gateway/[feature]` - Gateway work
- `admin-ui/[feature]` - Frontend work
- `contract/[feature]` - Shared contract changes (Contract Owner only)
- `schema/[feature]` - Database schema changes (DB Lead only)
- `infra/[feature]` - Infrastructure work
- `test/[feature]` - Testing infrastructure
- `devops/[feature]` - DevOps work

---

## Step 4: Know Your Boundaries

### Files You OWN (Can Modify)
Check the File Ownership Matrix in the coordination plan.

**Example for Auth Service (Workstream 1)**:
```
✅ CAN MODIFY:
/packages/auth/**/*

❌ CANNOT MODIFY:
/packages/shared/src/contracts/**
/packages/shared/src/events/**
/packages/user/**
/packages/gateway/**
[Any other service directories]
```

### Files You Can READ
You can read ANY file, but only modify files in your scope.

### Request Changes for Shared Files
For shared contracts/events:
1. Create GitHub issue with label `contract-change`
2. Wait for Contract Owner approval
3. Contract Owner implements the change

---

## Step 5: Start Development

### Backend Service Development

```bash
# Navigate to your service
cd /packages/[your-service]

# Start in development mode
nx serve [your-service]

# Example:
nx serve auth
nx serve user
nx serve notifications
```

**Service Ports** (defined in `/packages/shared/src/port-registry/ports.ts`):
- Auth: 3001
- User: 3002
- Notifications: 3003
- Gateway: 3000
- Admin UI: 4200

### Frontend Development

```bash
# Start Admin UI
nx serve admin-ui

# Open browser
open http://localhost:4200
```

---

## Step 6: Follow Coding Standards

### Import Shared Types (READ-ONLY)

```typescript
// ✅ Good: Import from shared package
import { UserProfile, USER_SERVICE_ENDPOINTS } from '@orion/shared';

// ❌ Bad: Duplicate types in your service
interface UserProfile { ... }  // Don't do this!
```

### Service Implementation Pattern

```typescript
// src/app/[feature]/[feature].controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserProfile, UserPreferences } from '@orion/shared';
import { FeatureService } from './[feature].service';

@Controller('api/v1/users')
export class UserController {
  constructor(private readonly service: FeatureService) {}

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserProfile> {
    return this.service.findById(id);
  }
}
```

```typescript
// src/app/[feature]/[feature].service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@orion/shared';

@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
```

---

## Step 7: Write Tests

```bash
# Run tests for your service
nx test [your-service]

# Run tests in watch mode
nx test [your-service] --watch

# Run with coverage
nx test [your-service] --coverage
```

**Test Template**:
```typescript
// [feature].service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureService } from './[feature].service';
import { PrismaService } from '@orion/shared';

describe('FeatureService', () => {
  let service: FeatureService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        {
          provide: PrismaService,
          useValue: {
            // Mock methods
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
    });
  });
});
```

---

## Step 8: Commit Your Changes

### Run Pre-commit Checks

```bash
# Check your code
pnpm lint
pnpm type-check
pnpm test
pnpm format
```

### Commit with Conventional Commits

```bash
# Format: type(scope): description
git add .
git commit -m "feat(auth): implement JWT refresh token flow"
git commit -m "fix(user): resolve avatar upload validation"
git commit -m "docs(shared): update API contract documentation"
```

**Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Build/tooling

---

## Step 9: Push and Create PR

```bash
# Push your branch
git push origin [your-branch-name]

# Create PR on GitHub with:
# - Title: [Service] Brief description
# - Description: What changed and why
# - Tag relevant reviewers
# - Link to related issues
```

**PR Template**:
```markdown
## Description
[Describe what this PR does]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Workstream
[Your workstream number and name]

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log or debugging code
- [ ] Tests added/updated

## Related Issues
Closes #[issue-number]
```

---

## Step 10: Daily Standup

Post in `#orion-dev-coordination`:

```
**Workstream**: [Your workstream]
**Date**: 2025-10-18

**Completed**:
- Implemented JWT authentication flow
- Added unit tests for auth service

**In Progress**:
- Setting up refresh token rotation
- Writing integration tests

**Blockers**:
- Waiting for user service contract approval (#123)

**Integration Needs**:
- Need to coordinate with gateway team on auth middleware
```

---

## Common Tasks

### Add a New Endpoint

1. **Define contract** (request via GitHub issue if not exists)
   ```typescript
   // Wait for Contract Owner to add to @orion/shared
   export interface NewFeatureRequest { ... }
   ```

2. **Implement DTO** (in your service)
   ```typescript
   // src/app/dto/new-feature.dto.ts
   import { NewFeatureRequest } from '@orion/shared';

   export class NewFeatureDto implements NewFeatureRequest {
     // Add validation decorators
   }
   ```

3. **Implement controller**
   ```typescript
   @Post('feature')
   async createFeature(@Body() dto: NewFeatureDto) {
     return this.service.create(dto);
   }
   ```

4. **Add tests**
5. **Update Swagger docs** (if applicable)

---

### Publish an Event

1. **Check event definition** in `/packages/shared/src/events/`
2. **Import event type**
   ```typescript
   import { UserCreatedEvent, USER_EVENT_PATTERNS } from '@orion/shared';
   ```

3. **Emit event** in your service
   ```typescript
   import { EventEmitter2 } from '@nestjs/event-emitter';

   @Injectable()
   export class UserService {
     constructor(private eventEmitter: EventEmitter2) {}

     async createUser(data: CreateUserDto) {
       const user = await this.prisma.user.create({ data });

       // Emit event
       const event: UserCreatedEvent = {
         eventId: uuidv4(),
         userId: user.id,
         email: user.email,
         name: user.name,
         createdAt: new Date(),
       };

       this.eventEmitter.emit(USER_EVENT_PATTERNS.USER_CREATED, event);

       return user;
     }
   }
   ```

---

### Consume an Event

1. **Import event types**
   ```typescript
   import { UserCreatedEvent, USER_EVENT_PATTERNS } from '@orion/shared';
   ```

2. **Create event listener**
   ```typescript
   import { OnEvent } from '@nestjs/event-emitter';

   @Injectable()
   export class NotificationService {
     @OnEvent(USER_EVENT_PATTERNS.USER_CREATED)
     async handleUserCreated(event: UserCreatedEvent) {
       // Send welcome email
       await this.sendEmail({
         to: event.email,
         template: 'welcome',
         data: { name: event.name },
       });
     }
   }
   ```

---

### Work with Database

```bash
# Navigate to service
cd /packages/[your-service]

# Edit schema
# Edit prisma/schema.prisma

# Generate Prisma client
npx prisma generate

# Create migration (development)
npx prisma migrate dev --name add_user_preferences

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

### Debug Your Service

```bash
# Start with debug logging
NODE_ENV=development nx serve [your-service]

# Use NestJS debug namespace
DEBUG=* nx serve [your-service]

# Attach debugger (VS Code)
# Use launch.json configuration for your service
```

**VS Code launch.json example**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Auth Service",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["nx", "serve", "auth"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 [PID]

# Or use different port
PORT=3010 nx serve auth
```

### Issue: TypeScript Errors After Pulling Changes

```bash
# Rebuild shared package
cd /packages/shared
nx build shared

# Regenerate types
cd /packages/[your-service]
npx prisma generate

# Clear Nx cache
nx reset
```

### Issue: Import Not Found from @orion/shared

```bash
# Rebuild shared package
nx build shared

# Check if export exists in /packages/shared/src/index.ts
cat /packages/shared/src/index.ts | grep [YourType]

# If not exported, request contract change from Contract Owner
```

### Issue: Tests Failing After Changes

```bash
# Clear Jest cache
pnpm test --clearCache

# Run tests in verbose mode
pnpm test --verbose

# Run specific test file
pnpm test [file-path]
```

### Issue: Docker Container Won't Start

```bash
# View logs
docker compose logs [service-name]

# Rebuild container
docker compose build [service-name]

# Remove and restart
docker compose down
docker compose up -d
```

---

## Need Help?

1. **Check documentation**: `/Users/acarroll/dev/projects/orion/.swarm/`
2. **Ask in Slack**: `#orion-dev-coordination`
3. **Create GitHub issue**: Tag relevant workstream owners
4. **Emergency**: Escalate to team lead

---

## Useful Commands Cheat Sheet

```bash
# Development
pnpm dev                    # Start all services
nx serve [service]          # Start specific service
nx serve [service] --watch  # Start with auto-reload

# Testing
pnpm test                   # Run tests for changed files
pnpm test:all               # Run all tests
pnpm test:coverage          # Run with coverage report
nx test [service] --watch   # Watch mode for specific service

# Code Quality
pnpm lint                   # Lint all files
pnpm lint:fix               # Auto-fix linting issues
pnpm format                 # Format all files
pnpm type-check             # TypeScript type checking

# Building
pnpm build                  # Build changed services
pnpm build:all              # Build all services
nx build [service]          # Build specific service

# Database
npx prisma generate         # Generate Prisma client
npx prisma migrate dev      # Create and apply migration
npx prisma studio           # Open database GUI

# Docker
pnpm docker:build           # Build all images
pnpm docker:up              # Start all containers
pnpm docker:down            # Stop all containers
pnpm docker:logs            # View logs

# Git
git status                  # Check status
git add .                   # Stage changes
git commit -m "msg"         # Commit with message
git push origin [branch]    # Push branch

# Nx
nx graph                    # View dependency graph
nx affected:test            # Test affected projects
nx affected:build           # Build affected projects
nx reset                    # Clear Nx cache
```

---

## Resources

- **Coordination Plan**: `/Users/acarroll/dev/projects/orion/.swarm/PARALLEL_WORK_COORDINATION_PLAN.md`
- **Contract Protocol**: `/Users/acarroll/dev/projects/orion/.swarm/CONTRACT_MANAGEMENT_PROTOCOL.md`
- **API Contracts**: `/Users/acarroll/dev/projects/orion/packages/shared/src/contracts/`
- **Event Schemas**: `/Users/acarroll/dev/projects/orion/packages/shared/src/events/`
- **Port Registry**: `/Users/acarroll/dev/projects/orion/packages/shared/src/port-registry/ports.ts`

---

**Happy Coding! Remember: Communicate Early, Communicate Often!** 🚀
