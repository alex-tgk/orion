# Parallel Work Coordination Plan - Orion Microservices

## Overview

This document establishes clear boundaries, protocols, and workflows to enable multiple agents/developers to work simultaneously on the Orion microservices platform without conflicts. The Orion system consists of 24 packages in an Nx monorepo with shared infrastructure, API contracts, and configuration.

**Parallelization Strategy**: Domain-based isolation with centralized contract management and shared infrastructure ownership.

---

## Workstreams

### Workstream 1: Backend Services - Auth Service
**Owner**: Backend Agent 1 / Developer 1
**Priority**: High

**Scope**:
- **Files**: `/Users/acarroll/dev/projects/orion/packages/auth/**/*`
- **Modules**: Authentication, JWT tokens, password management
- **Database**: Auth service Prisma schema (when created)
- **API Endpoints**: All `/api/v1/auth/*` routes
- **Tests**: `/Users/acarroll/dev/projects/orion/packages/auth/**/*.spec.ts`

**Deliverables**:
- Complete authentication flow (login, logout, refresh tokens)
- JWT token management
- Password hashing and validation
- Auth middleware and guards
- Unit tests with >80% coverage
- Integration tests with auth-e2e package

**Dependencies**:
- Must coordinate with Workstream 6 (Shared Contracts) for Auth DTOs
- Blocked until database schema is defined in Workstream 8

**Potential Conflicts**:
- Shared guards and decorators - coordinate with Gateway team (Workstream 4)
- Event publishing patterns - use centralized event definitions from `/Users/acarroll/dev/projects/orion/packages/shared/src/events/`

**Timeline**: 5-7 days

---

### Workstream 2: Backend Services - User Service
**Owner**: Backend Agent 2 / Developer 2
**Priority**: High

**Scope**:
- **Files**: `/Users/acarroll/dev/projects/orion/packages/user/**/*`
- **Modules**: User profiles, preferences, search, avatar management
- **Database**: `/Users/acarroll/dev/projects/orion/packages/user/prisma/schema.prisma`
- **API Endpoints**: All `/api/v1/users/*` routes
- **Tests**: `/Users/acarroll/dev/projects/orion/packages/user/**/*.spec.ts`

**Deliverables**:
- User CRUD operations
- Profile management endpoints
- User preferences system
- Avatar upload functionality
- Search users feature
- Event publishers for user lifecycle
- Unit and integration tests

**Dependencies**:
- Must implement interfaces from `/Users/acarroll/dev/projects/orion/packages/shared/src/contracts/user-service.contract.ts`
- Must publish events defined in `/Users/acarroll/dev/projects/orion/packages/shared/src/events/user-events.ts`
- Depends on Workstream 8 for database schema coordination

**Potential Conflicts**:
- User events schema - DO NOT modify `/Users/acarroll/dev/projects/orion/packages/shared/src/events/user-events.ts` without approval from Workstream 6
- Shared DTOs in `/Users/acarroll/dev/projects/orion/packages/user/src/app/dto/` must match contract definitions

**Timeline**: 5-7 days

---

### Workstream 3: Backend Services - Notification Service
**Owner**: Backend Agent 3 / Developer 3
**Priority**: Medium

**Scope**:
- **Files**: `/Users/acarroll/dev/projects/orion/packages/notifications/**/*`
- **Modules**: Email, SMS, push notifications, queue processing
- **Database**: `/Users/acarroll/dev/projects/orion/packages/notifications/prisma/schema.prisma`
- **API Endpoints**: All `/api/v1/notifications/*` routes
- **Tests**: `/Users/acarroll/dev/projects/orion/packages/notifications/**/*.spec.ts`

**Deliverables**:
- Notification sending service (email, SMS, push)
- Queue consumer for async processing
- Notification history tracking
- Preference management
- Status checking endpoints
- RabbitMQ integration for user events

**Dependencies**:
- Must implement `/Users/acarroll/dev/projects/orion/packages/shared/src/contracts/notification-service.contract.ts`
- Must consume events from `/Users/acarroll/dev/projects/orion/packages/shared/src/events/user-events.ts`
- Depends on Workstream 10 for message queue setup

**Potential Conflicts**:
- Event consumer patterns - coordinate with other services consuming user events
- Notification templates - create in isolated directory `/Users/acarroll/dev/projects/orion/packages/notifications/src/templates/`

**Timeline**: 4-6 days

---

### Workstream 4: Backend Services - API Gateway
**Owner**: Backend Agent 4 / Developer 4
**Priority**: Critical

**Scope**:
- **Files**: `/Users/acarroll/dev/projects/orion/packages/gateway/**/*`
- **Modules**: Request routing, rate limiting, authentication middleware, service orchestration
- **Configuration**: Gateway-specific configs in `/Users/acarroll/dev/projects/orion/packages/gateway/src/app/config/`
- **Tests**: `/Users/acarroll/dev/projects/orion/packages/gateway/**/*.spec.ts`

**Deliverables**:
- Service routing configuration
- Request/response transformation
- Global error handling
- Rate limiting and throttling
- Health check aggregation
- Authentication guard integration
- API documentation aggregation (Swagger)

**Dependencies**:
- MUST wait for contract definitions from Workstream 6 before implementing routes
- Depends on Auth guards from Workstream 1
- Integrates with all backend services (Workstreams 1-3)

**Potential Conflicts**:
- Global middleware - document in `/Users/acarroll/dev/projects/orion/packages/gateway/README.md`
- Shared filters and interceptors - keep in gateway scope, DO NOT modify shared package

**Timeline**: 6-8 days

---

### Workstream 5: Frontend - Admin UI
**Owner**: Frontend Agent 1 / Developer 5
**Priority**: Medium

**Scope**:
- **Files**: `/Users/acarroll/dev/projects/orion/packages/admin-ui/**/*`
- **Components**: Dashboard, system monitoring, service health widgets
- **Styling**: `/Users/acarroll/dev/projects/orion/packages/admin-ui/src/frontend/styles/**/*`
- **Tests**: `/Users/acarroll/dev/projects/orion/packages/admin-ui/**/*.spec.tsx`

**Deliverables**:
- Dashboard layout and navigation
- Real-time system monitoring widgets
- Service health visualization
- WebSocket integration for live updates
- Responsive design implementation
- Component library

**Dependencies**:
- Must consume types from `/Users/acarroll/dev/projects/orion/packages/admin-ui/src/frontend/types/index.ts`
- API integration depends on Workstream 4 (Gateway) routes
- WebSocket events depend on backend event schemas

**Potential Conflicts**:
- Shared types - READ ONLY from `/Users/acarroll/dev/projects/orion/packages/shared/src/contracts/`
- Widget registry - coordinate with backend team for plugin architecture

**Timeline**: 7-9 days

---

### Workstream 6: Shared Contracts & Types (Contract Owner)
**Owner**: Architecture Lead / Senior Developer 6
**Priority**: Critical (Blocking)

**Scope**:
- **Files**:
  - `/Users/acarroll/dev/projects/orion/packages/shared/src/contracts/**/*`
  - `/Users/acarroll/dev/projects/orion/packages/shared/src/events/**/*`
  - `/Users/acarroll/dev/projects/orion/packages/shared/src/index.ts`
- **Responsibility**: API contract definitions, event schemas, shared types

**Deliverables**:
- Complete API contract definitions for all services
- Event schema definitions with versioning
- Shared TypeScript interfaces and types
- Contract validation utilities
- Documentation in JSDoc format
- Contract changelog

**Dependencies**:
- MUST be completed before other workstreams can finalize APIs
- Works closely with ALL workstreams for requirements gathering

**Potential Conflicts**:
- **CRITICAL**: This is the ONLY workstream allowed to modify files in `/Users/acarroll/dev/projects/orion/packages/shared/src/contracts/` and `/Users/acarroll/dev/projects/orion/packages/shared/src/events/`
- All other workstreams MUST request changes through this owner

**Change Protocol**:
1. Other workstreams submit contract change requests via GitHub issues labeled `contract-change`
2. Contract Owner reviews and approves/rejects within 24 hours
3. Contract Owner implements approved changes
4. Contract Owner notifies all affected workstreams via Slack/Discord channel

**Timeline**: Ongoing (highest priority first 2 days)

---

### Workstream 7: Infrastructure Libraries
**Owner**: Infrastructure Agent / Developer 7
**Priority**: High (Early blocker)

**Scope**:
- **Files**:
  - `/Users/acarroll/dev/projects/orion/packages/logger/**/*`
  - `/Users/acarroll/dev/projects/orion/packages/cache/**/*`
  - `/Users/acarroll/dev/projects/orion/packages/config/**/*`
  - `/Users/acarroll/dev/projects/orion/packages/secrets/**/*`
  - `/Users/acarroll/dev/projects/orion/packages/storage/**/*`
- **Responsibility**: Shared infrastructure services

**Deliverables**:
- Centralized logging service (Winston/Pino)
- Redis cache abstraction
- Configuration management (dotenv, validation)
- Secrets management (Vault/AWS Secrets Manager)
- File storage abstraction (S3/local)
- Infrastructure documentation

**Dependencies**:
- None - can start immediately
- Must publish stable APIs for other services to consume

**Potential Conflicts**:
- Configuration schemas - define in each package's `/config/` directory
- Environment variables - document in root `/Users/acarroll/dev/projects/orion/.env.example`

**Timeline**: 3-5 days

---

### Workstream 8: Database Schema Coordination
**Owner**: Database Lead / Developer 8
**Priority**: Critical (Blocking)

**Scope**:
- **Files**:
  - `/Users/acarroll/dev/projects/orion/packages/user/prisma/schema.prisma`
  - `/Users/acarroll/dev/projects/orion/packages/notifications/prisma/schema.prisma`
  - `/Users/acarroll/dev/projects/orion/packages/auth/prisma/schema.prisma` (to be created)
  - `/Users/acarroll/dev/projects/orion/packages/migrations/**/*`
- **Responsibility**: Database schema design, migrations, relationships

**Deliverables**:
- Prisma schema for each service
- Migration scripts
- Database seed data
- Relationship documentation
- Schema versioning strategy
- Cross-service relationship mapping

**Dependencies**:
- Must coordinate with Workstreams 1, 2, 3 for entity requirements
- Shared Prisma module in `/Users/acarroll/dev/projects/orion/packages/shared/src/lib/prisma.service.ts`

**Potential Conflicts**:
- **CRITICAL**: Each service has its own database - maintain strict isolation
- Shared entities - use event-driven synchronization, NOT foreign keys across databases
- Migration naming - use convention: `YYYYMMDDHHMMSS_description.sql`

**Change Protocol**:
1. Schema changes must be reviewed by Database Lead
2. Breaking changes require migration plan
3. All migrations must be reversible

**Timeline**: 4-6 days

---

### Workstream 9: Testing Infrastructure & Strategy
**Owner**: QA Lead / Developer 9
**Priority**: High

**Scope**:
- **Files**:
  - `/Users/acarroll/dev/projects/orion/jest.preset.js`
  - `/Users/acarroll/dev/projects/orion/jest.config.ts`
  - All `jest.config.ts` files in packages
  - `/Users/acarroll/dev/projects/orion/packages/auth-e2e/**/*`
  - `/Users/acarroll/dev/projects/orion/scripts/smoke-tests.sh`
- **Responsibility**: Testing standards, E2E test framework, CI/CD test pipeline

**Deliverables**:
- Jest configuration standards
- E2E testing framework (Supertest)
- Test data factories
- Mock service utilities
- Coverage reporting setup
- CI/CD test integration
- Testing documentation

**Dependencies**:
- Depends on all services implementing testable interfaces
- Integration tests depend on Docker compose setup

**Potential Conflicts**:
- Test database setup - use separate Docker containers per service
- Mock data - centralize in `/Users/acarroll/dev/projects/orion/packages/shared/src/test-helpers/`

**Testing Standards**:
- Unit tests: >80% coverage required
- Integration tests: Happy path + error cases
- E2E tests: Critical user flows only
- Test naming: `describe('Feature') > it('should do X when Y')`

**Timeline**: Ongoing (framework setup: 3-4 days)

---

### Workstream 10: DevOps & Deployment
**Owner**: DevOps Engineer / Developer 10
**Priority**: Medium

**Scope**:
- **Files**:
  - `/Users/acarroll/dev/projects/orion/docker-compose.yml`
  - `/Users/acarroll/dev/projects/orion/docker-compose.test.yml`
  - All Dockerfile files in packages
  - `/Users/acarroll/dev/projects/orion/k8s/**/*`
  - `/Users/acarroll/dev/projects/orion/.github/workflows/**/*`
  - `/Users/acarroll/dev/projects/orion/scripts/**/*`
- **Responsibility**: Containerization, orchestration, CI/CD pipelines

**Deliverables**:
- Docker images for all services
- Docker Compose for local development
- Kubernetes manifests
- CI/CD pipelines (GitHub Actions)
- Deployment scripts
- Environment configuration management
- Monitoring and logging setup (Prometheus, Grafana)

**Dependencies**:
- Depends on services being containerizable
- Health check endpoints from all services

**Potential Conflicts**:
- Port allocation - use centralized registry `/Users/acarroll/dev/projects/orion/packages/shared/src/port-registry/ports.ts`
- Environment variables - document all in `/Users/acarroll/dev/projects/orion/.env.example`
- Docker network configuration - single compose file authority

**Timeline**: 5-7 days

---

## Integration Points

### 1. API Contract Synchronization
**When**: Before implementing endpoints
**How**:
- All services MUST implement interfaces from `/Users/acarroll/dev/projects/orion/packages/shared/src/contracts/`
- Contract Owner (Workstream 6) reviews and approves all changes
- Use TypeScript interfaces to enforce compile-time checking

**Verification**:
```bash
# Run contract validation
pnpm spec:validate
```

---

### 2. Database Schema Coordination
**When**: During entity modeling phase
**How**:
- Weekly sync meeting with Database Lead
- Schema changes submitted via PR to Database Lead for review
- Use Prisma migrations for all changes
- Each service maintains its own database (microservices pattern)

**Verification**:
```bash
# Generate Prisma client
cd packages/[service] && npx prisma generate

# Create migration
npx prisma migrate dev --name description
```

---

### 3. Event-Driven Communication
**When**: Services need to communicate asynchronously
**How**:
- All events MUST be defined in `/Users/acarroll/dev/projects/orion/packages/shared/src/events/`
- Use RabbitMQ with event patterns from shared definitions
- Publishers: Emit events after successful operations
- Consumers: Subscribe to relevant event patterns

**Event Flow Example**:
```
User Service (Publisher) → user.created → Notification Service (Consumer)
```

**Verification**: Check event definitions match between publisher and consumer

---

### 4. Frontend-Backend Integration
**When**: Frontend needs backend data
**How**:
- Frontend MUST consume types from shared contracts
- All API calls go through Gateway (Workstream 4)
- Use React Query for data fetching and caching
- WebSocket connections managed through gateway

**Integration Checklist**:
- [ ] Import types from `@orion/shared`
- [ ] Configure API base URL via environment variable
- [ ] Implement error handling for all API calls
- [ ] Add loading states

---

### 5. Shared Dependencies
**When**: Installing npm packages
**How**:
- All dependency changes go through root `/Users/acarroll/dev/projects/orion/package.json`
- Use `pnpm add -w` for workspace-level dependencies
- Document dependency purpose in package.json comments
- Run `pnpm install` after pulling changes

**Conflict Prevention**:
```bash
# Check for dependency conflicts
pnpm deps:check

# Update dependencies
pnpm update --interactive
```

---

## Coordination Protocols

### Communication Channels
- **Slack/Discord Channel**: `#orion-dev-coordination`
  - Daily standup messages (async)
  - Blocking issues escalation
  - Integration point coordination

- **GitHub Issues**:
  - Label: `contract-change` - API contract change requests
  - Label: `schema-change` - Database schema changes
  - Label: `breaking-change` - Backward incompatible changes
  - Label: `integration-point` - Cross-service coordination needed

- **Pull Requests**:
  - Tag relevant workstream owners as reviewers
  - Prefix: `[Auth]`, `[User]`, `[Gateway]`, `[Shared]`, etc.
  - Required approvals: 1 for service-specific, 2 for shared packages

---

### Conflict Resolution Process

1. **File-Level Conflicts**:
   - **Rule**: Only assigned workstream can modify files in their scope
   - **Exception**: Bug fixes in other scopes require PR + approval from owner
   - **Shared files**: Only Contract Owner (Workstream 6) can modify

2. **Contract Changes**:
   - Submit GitHub issue with label `contract-change`
   - Contract Owner reviews within 24 hours
   - Once approved, Contract Owner implements change
   - Contract Owner notifies all affected workstreams

3. **Database Schema Conflicts**:
   - Database Lead has final authority
   - Breaking changes require migration plan + impact analysis
   - Schema changes must not break existing APIs

4. **Dependency Conflicts**:
   - Infrastructure team (Workstream 7) arbitrates
   - Prefer latest stable versions
   - Document breaking changes in CHANGELOG

---

### Progress Tracking

**Daily**: Post async standup in `#orion-dev-coordination`
```
Workstream: [Name]
Completed: [What was done]
In Progress: [Current work]
Blocked: [Any blockers]
```

**Weekly**: Integration sync meeting (1 hour)
- Review integration points
- Resolve cross-workstream issues
- Demo completed features
- Plan next week's priorities

**Continuous**: Update project board
- GitHub Projects board: `Orion Development`
- Columns: Backlog, In Progress, Review, Done
- Link PRs to issues

---

### Code Quality Gates

All workstreams MUST pass these gates before merging:

1. **Linting**: `pnpm lint`
2. **Type Checking**: `pnpm type-check`
3. **Formatting**: `pnpm format:check`
4. **Tests**: `pnpm test` (>80% coverage)
5. **Build**: `pnpm build`

**Pre-commit Hook** (already configured):
```bash
# Runs automatically via Husky
pnpm lint-staged
```

**CI/CD Pipeline** (GitHub Actions):
- Runs on every PR
- Required checks: lint, test, build
- No merge without passing checks

---

## Coding Standards

### TypeScript Standards
```typescript
// ✅ Good: Explicit types, no 'any'
interface UserResponse {
  id: string;
  email: string;
  name: string;
}

async function getUser(id: string): Promise<UserResponse> {
  // implementation
}

// ❌ Bad: Using 'any'
async function getUser(id: any): Promise<any> {
  // implementation
}
```

**Rules** (enforced by `/Users/acarroll/dev/projects/orion/tsconfig.base.json`):
- `strict: true` - All strict checks enabled
- `noUnusedLocals: true` - No unused variables
- `noImplicitAny: true` - No implicit any types
- `strictNullChecks: true` - Explicit null/undefined handling

---

### NestJS Standards
```typescript
// ✅ Module structure
@Module({
  imports: [SharedModule, ConfigModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

// ✅ Controller with decorators
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string): Promise<UserProfile> {
    return this.userService.findById(id);
  }
}

// ✅ Service with proper DI
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}
}
```

---

### Testing Standards
```typescript
// ✅ Unit test structure
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'test-id';
      const expectedUser = { id: userId, email: 'test@test.com' };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(expectedUser);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      // Test error case
    });
  });
});
```

---

### Formatting Standards
**Enforced by** `/Users/acarroll/dev/projects/orion/.prettierrc`:
- Single quotes
- Trailing commas
- 80 character line width
- 2 space indentation
- Semicolons required
- LF line endings

---

### Git Commit Standards
**Format** (enforced by commitlint):
```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build/tooling changes

**Examples**:
```bash
feat(auth): implement JWT refresh token flow
fix(user): resolve avatar upload validation issue
docs(shared): update API contract documentation
```

---

## Critical Path & Risks

### Critical Path Dependencies

**Highest Priority** (Must complete first):
1. **Workstream 6**: Shared Contracts (Days 1-2)
2. **Workstream 7**: Infrastructure Libraries (Days 1-3)
3. **Workstream 8**: Database Schemas (Days 2-4)

**Second Priority** (Can start after critical path):
4. **Workstream 1**: Auth Service (Days 3-7)
5. **Workstream 2**: User Service (Days 3-7)
6. **Workstream 3**: Notification Service (Days 4-8)

**Third Priority** (Integration phase):
7. **Workstream 4**: Gateway (Days 5-10)
8. **Workstream 5**: Admin UI (Days 6-12)

**Continuous**:
9. **Workstream 9**: Testing (Throughout)
10. **Workstream 10**: DevOps (Days 5-10)

---

### Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Contract changes mid-development** | High | Strict change control process via Workstream 6 owner |
| **Database schema conflicts** | High | Single Database Lead authority, migration reviews |
| **Dependency version conflicts** | Medium | Centralized package.json, pnpm workspace protocol |
| **Integration delays** | High | Early integration points, weekly sync meetings |
| **Testing bottleneck** | Medium | Parallel testing, clear coverage requirements |
| **Port conflicts in development** | Low | Centralized port registry in shared package |
| **Environment config drift** | Medium | Documented .env.example, config validation |
| **Divergent code styles** | Low | Automated linting/formatting via pre-commit |

---

## File Ownership Matrix

| Directory/File Pattern | Owner | Others Can | Approval Needed |
|------------------------|-------|------------|-----------------|
| `/packages/auth/**` | Workstream 1 | Read | Yes (Owner) |
| `/packages/user/**` | Workstream 2 | Read | Yes (Owner) |
| `/packages/notifications/**` | Workstream 3 | Read | Yes (Owner) |
| `/packages/gateway/**` | Workstream 4 | Read | Yes (Owner) |
| `/packages/admin-ui/**` | Workstream 5 | Read | Yes (Owner) |
| `/packages/shared/src/contracts/**` | Workstream 6 | Read Only | Yes (Contract Owner) |
| `/packages/shared/src/events/**` | Workstream 6 | Read Only | Yes (Contract Owner) |
| `/packages/logger/**` | Workstream 7 | Read | Yes (Infra Team) |
| `/packages/cache/**` | Workstream 7 | Read | Yes (Infra Team) |
| `/packages/config/**` | Workstream 7 | Read | Yes (Infra Team) |
| `/packages/*/prisma/**` | Workstream 8 | Read | Yes (DB Lead) |
| `jest.*.js` | Workstream 9 | Read | Yes (QA Lead) |
| `docker-compose*.yml` | Workstream 10 | Read | Yes (DevOps) |
| `/k8s/**` | Workstream 10 | Read | Yes (DevOps) |
| `.github/workflows/**` | Workstream 10 | Read | Yes (DevOps) |
| `.eslintrc.json` | ALL | Propose | Yes (2 approvals) |
| `tsconfig.base.json` | ALL | Propose | Yes (2 approvals) |
| `package.json` (root) | ALL | Propose | Yes (Infra Team) |

---

## Quick Reference Commands

### Start Development
```bash
# Install dependencies
pnpm install

# Start all services in development mode
pnpm dev

# Start specific service
pnpm dev:service [service-name]

# Example: Start auth service
nx serve auth
```

### Testing
```bash
# Run all tests
pnpm test:all

# Run tests for changed files
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Code Quality
```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type check
pnpm type-check
```

### Building
```bash
# Build all services
pnpm build:all

# Build specific service
nx build [service-name]

# Production build
pnpm build:prod
```

### Docker
```bash
# Build all Docker images
pnpm docker:build

# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs
pnpm docker:logs
```

### Database
```bash
# Generate Prisma client
cd packages/[service] && npx prisma generate

# Create migration
cd packages/[service] && npx prisma migrate dev

# Apply migrations
cd packages/[service] && npx prisma migrate deploy

# Open Prisma Studio
cd packages/[service] && npx prisma studio
```

---

## Success Criteria

### Individual Workstream Completion
- [ ] All assigned files implemented and tested
- [ ] Code passes all quality gates (lint, type-check, tests)
- [ ] Documentation updated (README, API docs)
- [ ] Integration points tested
- [ ] PR approved and merged

### System-Wide Completion
- [ ] All services can start simultaneously via Docker Compose
- [ ] All API contracts implemented and verified
- [ ] All inter-service communication working (events, HTTP)
- [ ] E2E tests passing for critical flows
- [ ] CI/CD pipeline green
- [ ] Documentation complete

---

## Escalation Path

1. **Blocking Issue**: Post in `#orion-dev-coordination` immediately
2. **Contract Dispute**: Escalate to Workstream 6 (Contract Owner)
3. **Schema Conflict**: Escalate to Workstream 8 (Database Lead)
4. **Cross-Service Bug**: Create issue, tag all affected workstream owners
5. **Architectural Decision Needed**: Schedule emergency sync meeting

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-18 | Initial coordination plan | Claude (Coordination Specialist) |

---

## Appendix: Communication Templates

### Daily Standup Template
```
**Workstream**: [Your workstream name]
**Date**: [Today's date]

**Completed Yesterday**:
- [Item 1]
- [Item 2]

**Working On Today**:
- [Item 1]
- [Item 2]

**Blockers**:
- [None / Issue #123 / Waiting for...]

**Integration Needs**:
- [None / Need contract review / Need schema approval]
```

### Contract Change Request Template
```
**Title**: [Contract Change Request] [Service Name] - [Brief Description]
**Label**: contract-change
**Priority**: [Low/Medium/High/Critical]

**Current Contract**:
[Show current interface/type definition]

**Proposed Change**:
[Show proposed change]

**Reason**:
[Explain why this change is needed]

**Impact**:
- Services affected: [List]
- Breaking change: [Yes/No]
- Backward compatible: [Yes/No]

**Migration Plan** (if breaking):
[Describe how to migrate existing code]
```

### Schema Change Request Template
```
**Title**: [Schema Change] [Service Name] - [Brief Description]
**Label**: schema-change

**Current Schema**:
[Show current Prisma schema]

**Proposed Change**:
[Show proposed change]

**Reason**:
[Explain why]

**Migration Required**: [Yes/No]
**Data Migration Plan**: [If yes, describe plan]
**Rollback Plan**: [Describe rollback strategy]
```

---

**Remember**: When in doubt, communicate early and often. It's better to over-communicate than to discover conflicts late.
