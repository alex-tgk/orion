# File Ownership Map - Orion Microservices

## Visual Directory Structure with Ownership

```
/Users/acarroll/dev/projects/orion/
│
├── .swarm/                           [Documentation - ALL can read]
│   ├── PARALLEL_WORK_COORDINATION_PLAN.md
│   ├── CONTRACT_MANAGEMENT_PROTOCOL.md
│   ├── QUICK_START_GUIDE.md
│   └── FILE_OWNERSHIP_MAP.md
│
├── .github/
│   └── workflows/                    [Workstream 10: DevOps]
│       ├── ci.yml
│       ├── test.yml
│       └── deploy.yml
│
├── k8s/                              [Workstream 10: DevOps]
│   ├── gateway/
│   ├── notification-service/
│   └── user-service/
│
├── scripts/                          [Workstream 10: DevOps]
│   ├── deploy-production.sh
│   ├── deploy-staging.sh
│   ├── smoke-tests.sh
│   └── hooks/
│
├── packages/
│   │
│   ├── admin-ui/                     [Workstream 5: Frontend]
│   │   ├── src/
│   │   │   ├── app/                  ✅ Workstream 5 OWNS
│   │   │   └── frontend/             ✅ Workstream 5 OWNS
│   │   │       ├── components/
│   │   │       ├── hooks/
│   │   │       ├── services/
│   │   │       ├── styles/
│   │   │       └── types/            👁️  READ ONLY (import from @orion/shared)
│   │   └── README.md
│   │
│   ├── ai-interface/                 [Future: AI Integration Team]
│   │   └── src/
│   │
│   ├── analytics/                    [Future: Analytics Team]
│   │   └── src/
│   │
│   ├── audit/                        [Future: Audit Team]
│   │   └── src/
│   │
│   ├── auth/                         [Workstream 1: Auth Service]
│   │   ├── src/
│   │   │   ├── app/                  ✅ Workstream 1 OWNS
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── guards/
│   │   │   │   ├── strategies/
│   │   │   │   ├── dto/              ⚠️  Must implement @orion/shared contracts
│   │   │   │   └── auth.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/                   🔒 Workstream 8: Database Lead REVIEWS
│   │   │   └── schema.prisma         ⚠️  Changes require DB Lead approval
│   │   ├── jest.config.ts            👁️  Workstream 9 sets standards
│   │   ├── project.json
│   │   ├── Dockerfile                👁️  Workstream 10 reviews
│   │   └── README.md
│   │
│   ├── auth-e2e/                     [Workstream 9: Testing]
│   │   └── src/
│   │       └── auth/                 ✅ Workstream 9 OWNS
│   │
│   ├── cache/                        [Workstream 7: Infrastructure]
│   │   └── src/                      ✅ Workstream 7 OWNS
│   │       ├── cache.service.ts
│   │       ├── cache.module.ts
│   │       └── index.ts
│   │
│   ├── config/                       [Workstream 7: Infrastructure]
│   │   └── src/                      ✅ Workstream 7 OWNS
│   │       ├── config.service.ts
│   │       ├── config.module.ts
│   │       ├── schemas/
│   │       └── index.ts
│   │
│   ├── dev-tools/                    [Infrastructure/DevOps]
│   │   └── src/
│   │
│   ├── gateway/                      [Workstream 4: API Gateway]
│   │   ├── src/
│   │   │   ├── app/                  ✅ Workstream 4 OWNS
│   │   │   │   ├── config/
│   │   │   │   ├── filters/
│   │   │   │   ├── middleware/
│   │   │   │   ├── services/
│   │   │   │   └── app.module.ts
│   │   │   └── main.ts
│   │   ├── jest.config.ts
│   │   ├── project.json
│   │   ├── Dockerfile                👁️  Workstream 10 reviews
│   │   └── README.md
│   │
│   ├── logger/                       [Workstream 7: Infrastructure]
│   │   └── src/                      ✅ Workstream 7 OWNS
│   │       ├── logger.service.ts
│   │       ├── logger.module.ts
│   │       └── index.ts
│   │
│   ├── mcp-server/                   [AI/MCP Integration Team]
│   │   └── src/
│   │
│   ├── migrations/                   [Workstream 8: Database]
│   │   └── src/                      ✅ Workstream 8 OWNS
│   │
│   ├── notifications/                [Workstream 3: Notification Service]
│   │   ├── src/
│   │   │   ├── app/                  ✅ Workstream 3 OWNS
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── consumers/
│   │   │   │   ├── dto/              ⚠️  Must implement @orion/shared contracts
│   │   │   │   └── notification.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/                   🔒 Workstream 8: Database Lead REVIEWS
│   │   │   └── schema.prisma
│   │   ├── jest.config.ts
│   │   ├── project.json
│   │   ├── Dockerfile                👁️  Workstream 10 reviews
│   │   └── README.md
│   │
│   ├── orchestrator/                 [Future: Orchestration Team]
│   │   └── src/
│   │
│   ├── scheduler/                    [Future: Scheduler Team]
│   │   └── src/
│   │
│   ├── search/                       [Future: Search Team]
│   │   └── src/
│   │
│   ├── secrets/                      [Workstream 7: Infrastructure]
│   │   └── src/                      ✅ Workstream 7 OWNS
│   │       ├── secrets.service.ts
│   │       ├── secrets.module.ts
│   │       └── index.ts
│   │
│   ├── shared/                       [Workstream 6: Contract Owner]
│   │   ├── src/
│   │   │   ├── contracts/            🔒 Workstream 6 EXCLUSIVE WRITE
│   │   │   │   ├── user-service.contract.ts
│   │   │   │   ├── notification-service.contract.ts
│   │   │   │   └── index.ts
│   │   │   ├── events/               🔒 Workstream 6 EXCLUSIVE WRITE
│   │   │   │   ├── user-events.ts
│   │   │   │   ├── notification-events.ts
│   │   │   │   └── index.ts
│   │   │   ├── lib/                  ✅ Workstream 7 (infrastructure shared code)
│   │   │   │   ├── prisma.service.ts
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── shared.module.ts
│   │   │   ├── port-registry/        👁️  Workstream 10 maintains
│   │   │   │   ├── ports.ts
│   │   │   │   └── port-registry.service.ts
│   │   │   ├── config/               ✅ Workstream 7
│   │   │   │   └── security.config.ts
│   │   │   └── index.ts              🔒 Workstream 6 (exports)
│   │   ├── package.json
│   │   ├── project.json
│   │   └── CHANGELOG.md              🔒 Workstream 6 maintains
│   │
│   ├── storage/                      [Workstream 7: Infrastructure]
│   │   └── src/                      ✅ Workstream 7 OWNS
│   │       ├── storage.service.ts
│   │       ├── storage.module.ts
│   │       └── index.ts
│   │
│   ├── user/                         [Workstream 2: User Service]
│   │   ├── src/
│   │   │   ├── app/                  ✅ Workstream 2 OWNS
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── dto/              ⚠️  Must implement @orion/shared contracts
│   │   │   │   └── user.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/                   🔒 Workstream 8: Database Lead REVIEWS
│   │   │   └── schema.prisma
│   │   ├── jest.config.ts
│   │   ├── project.json
│   │   ├── Dockerfile                👁️  Workstream 10 reviews
│   │   └── README.md
│   │
│   ├── vector-db/                    [Future: Vector DB Team]
│   │   └── src/
│   │
│   └── webhooks/                     [Future: Webhooks Team]
│       └── src/
│
├── docker-compose.yml                [Workstream 10: DevOps]
├── docker-compose.test.yml           [Workstream 10: DevOps]
│
├── Configuration Files (Root Level)
├── .eslintrc.json                    ⚠️  ALL propose, 2 approvals needed
├── .prettierrc                       ⚠️  ALL propose, 2 approvals needed
├── tsconfig.base.json                ⚠️  ALL propose, 2 approvals needed
├── jest.preset.js                    🔒 Workstream 9 OWNS
├── nx.json                           ⚠️  ALL propose, DevOps approves
├── package.json                      ⚠️  ALL propose, Infrastructure approves
├── pnpm-lock.yaml                    🤖 Auto-generated
│
└── .husky/                           [Workstream 10: DevOps]
    └── pre-commit                    🔒 Workstream 10 OWNS
```

---

## Legend

| Symbol | Meaning | Description |
|--------|---------|-------------|
| ✅ | **OWNS** | Full write access, can modify freely |
| 🔒 | **EXCLUSIVE** | Only this workstream can modify |
| ⚠️ | **REQUIRES APPROVAL** | Can propose changes, needs approval |
| 👁️ | **READ ONLY / REVIEW** | Can read, can propose with approval |
| 🤖 | **AUTO-GENERATED** | Don't modify manually |

---

## Ownership Rules by File Type

### 1. Service Source Code (`/packages/[service]/src/`)

**Owner**: Service's assigned workstream

**Rules**:
- ✅ Full control over implementation
- ✅ Can create new files/directories
- ✅ Can modify existing service code
- ❌ Cannot modify other services

**Example**:
```
/packages/auth/src/app/controllers/auth.controller.ts
→ Workstream 1 (Auth) OWNS
→ Others: READ ONLY
```

---

### 2. Shared Contracts (`/packages/shared/src/contracts/`)

**Owner**: Workstream 6 (Contract Owner)

**Rules**:
- 🔒 **EXCLUSIVE WRITE** - Only Contract Owner can modify
- 👁️ All others: READ ONLY
- ⚠️ Changes require GitHub issue with `contract-change` label
- ⏱️ Contract Owner reviews within 24 hours

**Example**:
```
/packages/shared/src/contracts/user-service.contract.ts
→ Workstream 6 EXCLUSIVE
→ Workstream 2 (User Service): Must implement but cannot modify
→ Others: READ ONLY
```

**Process**:
1. Service team creates issue: `[Contract Change] Add UserPreferences interface`
2. Contract Owner reviews
3. Contract Owner implements
4. Contract Owner notifies affected teams

---

### 3. Event Schemas (`/packages/shared/src/events/`)

**Owner**: Workstream 6 (Contract Owner)

**Rules**:
- 🔒 **EXCLUSIVE WRITE** - Only Contract Owner can modify
- 👁️ Publishers and consumers: READ ONLY
- ⚠️ Changes require approval

**Example**:
```
/packages/shared/src/events/user-events.ts
→ Workstream 6 EXCLUSIVE
→ Workstream 2 (User Service): Publishes events, READ ONLY
→ Workstream 3 (Notifications): Consumes events, READ ONLY
```

**Event Flow**:
```
User Service (Publisher) → READ event schema → Publish
                              ↓
                          Event Bus
                              ↓
Notification Service (Consumer) → READ event schema → Consume
```

---

### 4. Database Schemas (`/packages/*/prisma/schema.prisma`)

**Owner**: Service workstream (with Database Lead oversight)

**Rules**:
- ✅ Service team proposes schema
- 🔒 Database Lead (Workstream 8) MUST REVIEW
- ⚠️ Breaking changes require migration plan
- ⏱️ Database Lead reviews within 48 hours

**Example**:
```
/packages/user/prisma/schema.prisma
→ Workstream 2 (User Service) drafts
→ Workstream 8 (Database Lead) APPROVES
→ Others: READ ONLY
```

**Process**:
1. Service team creates schema
2. Submit PR with label `schema-change`
3. Tag Database Lead as reviewer
4. Database Lead reviews for:
   - Naming conventions
   - Relationship integrity
   - Index optimization
   - Migration strategy
5. Approved → Service team creates migration

---

### 5. DTOs (`/packages/[service]/src/app/dto/`)

**Owner**: Service workstream

**Rules**:
- ✅ Service team OWNS
- ⚠️ **MUST implement** interfaces from `@orion/shared`
- ✅ Can add validation decorators
- ✅ Can add service-specific fields (not in contract)

**Example**:
```typescript
// /packages/user/src/app/dto/update-user.dto.ts
import { UserProfile } from '@orion/shared';
import { IsString, IsOptional } from 'class-validator';

// ✅ Implements shared contract
export class UpdateUserDto implements Partial<UserProfile> {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  // ✅ Service-specific field (not in contract)
  @IsString()
  @IsOptional()
  internalNote?: string;
}
```

---

### 6. Infrastructure Libraries (`/packages/{logger,cache,config,etc.}/`)

**Owner**: Workstream 7 (Infrastructure)

**Rules**:
- ✅ Infrastructure team OWNS
- 👁️ Services consume via imports
- ⚠️ Breaking changes require notification to ALL services

**Example**:
```
/packages/logger/src/logger.service.ts
→ Workstream 7 OWNS
→ All services import and use
```

**Usage**:
```typescript
// In any service
import { LoggerService } from '@orion/logger';

@Injectable()
export class MyService {
  constructor(private logger: LoggerService) {}

  doSomething() {
    this.logger.info('Doing something');
  }
}
```

---

### 7. Testing Files (`*.spec.ts`, `*.e2e-spec.ts`)

**Owner**: Service workstream (follows test standards)

**Rules**:
- ✅ Service team writes tests for their code
- 👁️ Workstream 9 (Testing) sets STANDARDS
- ⚠️ Must meet coverage requirements (>80%)
- 👁️ Workstream 9 maintains jest.preset.js

**Example**:
```
/packages/auth/src/app/auth.service.spec.ts
→ Workstream 1 (Auth) OWNS
→ Workstream 9 (Testing) sets standards in jest.preset.js
```

---

### 8. Docker Files (`Dockerfile`, `docker-compose.yml`)

**Owner**: Workstream 10 (DevOps)

**Rules**:
- 🔒 DevOps OWNS docker-compose.yml (root level)
- ✅ Service teams can create Dockerfile
- 👁️ DevOps REVIEWS all Dockerfiles
- ⚠️ Port allocation coordinated via port registry

**Example**:
```
/packages/auth/Dockerfile
→ Workstream 1 (Auth) creates
→ Workstream 10 (DevOps) REVIEWS

/docker-compose.yml
→ Workstream 10 (DevOps) EXCLUSIVE
```

**Port Registry** (`/packages/shared/src/port-registry/ports.ts`):
```typescript
export const SERVICE_PORTS = {
  GATEWAY: 3000,
  AUTH: 3001,
  USER: 3002,
  NOTIFICATIONS: 3003,
  ADMIN_UI: 4200,
} as const;
```

---

### 9. CI/CD Pipelines (`/.github/workflows/`)

**Owner**: Workstream 10 (DevOps)

**Rules**:
- 🔒 DevOps EXCLUSIVE
- ⚠️ Services can request workflow changes
- ✅ DevOps implements and maintains

**Example**:
```
/.github/workflows/ci.yml
→ Workstream 10 EXCLUSIVE
```

---

### 10. Root Configuration Files

**Owner**: Varies by file

| File | Owner | Change Process |
|------|-------|----------------|
| `package.json` | Infrastructure | Propose via PR, Infrastructure approves |
| `tsconfig.base.json` | ALL | Propose via PR, 2 approvals needed |
| `.eslintrc.json` | ALL | Propose via PR, 2 approvals needed |
| `.prettierrc` | ALL | Propose via PR, 2 approvals needed |
| `jest.preset.js` | Testing | Testing team OWNS |
| `nx.json` | DevOps | DevOps OWNS, others can propose |

**Change Process for Shared Config**:
1. Create PR with clear justification
2. Tag relevant teams
3. Discuss in PR comments
4. Require 2 approvals
5. Merge only if no objections

---

## Conflict Prevention Checklist

Before modifying any file, ask yourself:

1. **Do I own this file?**
   - Check the ownership map above
   - If unsure, ask in `#orion-dev-coordination`

2. **Is this file shared?**
   - If in `/packages/shared/src/contracts/` or `/packages/shared/src/events/`
   - → Create contract change request
   - Do NOT modify directly

3. **Am I implementing a contract?**
   - Import from `@orion/shared`
   - Implement in your service's DTO
   - Do NOT duplicate the contract

4. **Am I changing a database schema?**
   - Create schema in your service
   - Submit PR with `schema-change` label
   - Tag Database Lead for review

5. **Am I adding a dependency?**
   - Add to root `package.json`
   - Notify Infrastructure team
   - Document why it's needed

6. **Am I modifying root config?**
   - Create PR with clear justification
   - Get 2 approvals
   - Notify all affected teams

---

## Quick Reference: "Can I Modify This?"

```bash
# Service code (your service)
/packages/[your-service]/src/  → ✅ YES

# Service code (other service)
/packages/[other-service]/src/ → ❌ NO

# Shared contracts
/packages/shared/src/contracts/ → ❌ NO (request change)

# Shared events
/packages/shared/src/events/ → ❌ NO (request change)

# Your service's DTO
/packages/[your-service]/src/app/dto/ → ✅ YES (must implement contract)

# Your service's tests
/packages/[your-service]/**/*.spec.ts → ✅ YES

# Your service's Prisma schema
/packages/[your-service]/prisma/schema.prisma → ⚠️ YES (DB Lead reviews)

# Root package.json
/package.json → ⚠️ YES (Infrastructure approves)

# Root TypeScript config
/tsconfig.base.json → ⚠️ YES (2 approvals needed)

# Docker Compose
/docker-compose.yml → ❌ NO (DevOps only)
```

---

## Violation Consequences

**If you modify a file you don't own**:
1. PR will be rejected
2. Requested to revert and follow proper process
3. Delays your work and the team's progress

**Proper approach**:
1. Check ownership first
2. Follow change request process if needed
3. Communicate with owners
4. Get approvals before proceeding

---

**Remember**: When in doubt, ask in `#orion-dev-coordination` before modifying!
