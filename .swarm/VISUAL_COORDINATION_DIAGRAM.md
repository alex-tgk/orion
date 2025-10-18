# Visual Coordination Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORION MICROSERVICES PLATFORM                       │
│                         Parallel Development Coordination                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── WORKSTREAM LAYOUT ─────────────────────────────┐
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ WORKSTREAM 1│  │ WORKSTREAM 2│  │ WORKSTREAM 3│  │ WORKSTREAM 4│      │
│  │  Auth Svc   │  │  User Svc   │  │  Notif Svc  │  │  Gateway    │      │
│  │  (5-7 days) │  │  (5-7 days) │  │  (4-6 days) │  │  (6-8 days) │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                │                │                │              │
│         └────────────────┴────────────────┴────────────────┘              │
│                                  │                                         │
│                          ┌───────▼────────┐                               │
│                          │  WORKSTREAM 6  │  (Contract Owner)             │
│                          │ Shared         │  ◄─── CRITICAL BLOCKER        │
│                          │ Contracts      │  ◄─── EXCLUSIVE WRITE         │
│                          │ (Days 1-2)     │                               │
│                          └────────────────┘                               │
│                                  │                                         │
│         ┌────────────────────────┼────────────────────────┐              │
│         │                        │                        │              │
│  ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐      │
│  │ WORKSTREAM 7│          │ WORKSTREAM 8│          │ WORKSTREAM 5│      │
│  │Infrastructure│          │  Database   │          │  Admin UI   │      │
│  │  (3-5 days) │          │  (4-6 days) │          │  (7-9 days) │      │
│  └─────────────┘          └─────────────┘          └─────────────┘      │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────┐         │
│  │ WORKSTREAM 9 (Testing) & WORKSTREAM 10 (DevOps) - CONTINUOUS│         │
│  └─────────────────────────────────────────────────────────────┘         │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Path Flow

```
DAY 1-2: FOUNDATION (BLOCKING)
┌─────────────────────────────────────────────────────────────┐
│ 🔴 WORKSTREAM 6: Define ALL API Contracts                   │
│    ├─ user-service.contract.ts                             │
│    ├─ notification-service.contract.ts                      │
│    ├─ auth-service.contract.ts                             │
│    └─ Event schemas (user-events.ts, etc.)                 │
│                                                              │
│ 🔴 WORKSTREAM 7: Build Infrastructure Libraries             │
│    ├─ Logger service                                        │
│    ├─ Cache service                                         │
│    ├─ Config service                                        │
│    └─ Secrets service                                       │
└─────────────────────────────────────────────────────────────┘
                            ▼
DAY 2-4: SCHEMAS (BLOCKING)
┌─────────────────────────────────────────────────────────────┐
│ 🔴 WORKSTREAM 8: Review & Approve Database Schemas          │
│    ├─ Auth Prisma schema                                   │
│    ├─ User Prisma schema                                   │
│    └─ Notification Prisma schema                           │
└─────────────────────────────────────────────────────────────┘
                            ▼
DAY 3-7: SERVICES (PARALLEL)
┌─────────────────────────────────────────────────────────────┐
│ 🟢 WORKSTREAMS 1, 2, 3: Implement Services                  │
│    ├─ Auth Service ──┐                                     │
│    ├─ User Service ──┼─► All work in parallel              │
│    └─ Notif Service ─┘                                     │
└─────────────────────────────────────────────────────────────┘
                            ▼
DAY 5-10: INTEGRATION
┌─────────────────────────────────────────────────────────────┐
│ 🟡 WORKSTREAM 4: Gateway (integrates all services)          │
└─────────────────────────────────────────────────────────────┘
                            ▼
DAY 6-12: FRONTEND
┌─────────────────────────────────────────────────────────────┐
│ 🟡 WORKSTREAM 5: Admin UI (consumes gateway)                │
└─────────────────────────────────────────────────────────────┘
                            ▼
                    ✅ INTEGRATION COMPLETE
```

---

## File Ownership Boundaries

```
/packages/
│
├── auth/                          ┌──────────────────────┐
│   ├── src/                       │  WORKSTREAM 1 OWNS   │
│   ├── prisma/                    │  ✅ Full control     │
│   └── tests/                     └──────────────────────┘
│
├── user/                          ┌──────────────────────┐
│   ├── src/                       │  WORKSTREAM 2 OWNS   │
│   ├── prisma/                    │  ✅ Full control     │
│   └── tests/                     └──────────────────────┘
│
├── notifications/                 ┌──────────────────────┐
│   ├── src/                       │  WORKSTREAM 3 OWNS   │
│   ├── prisma/                    │  ✅ Full control     │
│   └── tests/                     └──────────────────────┘
│
├── gateway/                       ┌──────────────────────┐
│   ├── src/                       │  WORKSTREAM 4 OWNS   │
│   └── tests/                     │  ✅ Full control     │
│                                  └──────────────────────┘
├── admin-ui/                      ┌──────────────────────┐
│   ├── src/                       │  WORKSTREAM 5 OWNS   │
│   └── tests/                     │  ✅ Full control     │
│                                  └──────────────────────┘
└── shared/
    ├── src/
    │   ├── contracts/             ┌──────────────────────┐
    │   │                          │  WORKSTREAM 6 ONLY   │
    │   │                          │  🔒 EXCLUSIVE WRITE  │
    │   │                          │  Others: READ ONLY   │
    │   ├── events/                └──────────────────────┘
    │   │
    │   └── lib/                   ┌──────────────────────┐
    │                              │  WORKSTREAM 7 OWNS   │
    │                              │  ✅ Infrastructure   │
    └── ...                        └──────────────────────┘
```

---

## Contract Change Workflow

```
┌──────────────┐
│  Developer   │
│ (Any Stream) │
└──────┬───────┘
       │
       │ Needs contract change
       ▼
┌──────────────────────────────────────────┐
│ 1. Create GitHub Issue                   │
│    Label: contract-change                │
│    Template: Contract Change Request     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ 2. Contract Owner Reviews                │
│    SLA: 24 hours                         │
│    ├─ Approve                            │
│    ├─ Request Changes                    │
│    └─ Reject                             │
└──────────────┬───────────────────────────┘
               │
               │ Approved
               ▼
┌──────────────────────────────────────────┐
│ 3. Contract Owner Implements             │
│    ├─ Modify contracts/                  │
│    ├─ Update exports                     │
│    ├─ Update CHANGELOG                   │
│    └─ Create PR                          │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ 4. Contract Owner Notifies               │
│    ├─ Slack: #orion-dev-coordination     │
│    ├─ Tag affected workstreams           │
│    └─ Provide migration guide            │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ 5. Developers Update Services            │
│    ├─ Import from @orion/shared          │
│    └─ Implement new interfaces           │
└──────────────────────────────────────────┘
```

---

## Database Schema Review Flow

```
┌──────────────┐
│  Developer   │
│(Service Team)│
└──────┬───────┘
       │
       │ Create/modify schema
       ▼
┌──────────────────────────────────────────┐
│ 1. Draft Prisma Schema                   │
│    packages/[service]/prisma/schema.prisma│
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ 2. Create GitHub Issue                   │
│    Label: schema-change                  │
│    Template: Schema Change Request       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ 3. Database Lead Reviews                 │
│    SLA: 48 hours                         │
│    ├─ Check naming conventions           │
│    ├─ Verify indexes                     │
│    ├─ Review relationships               │
│    └─ Assess performance                 │
└──────────────┬───────────────────────────┘
               │
               │ Approved
               ▼
┌──────────────────────────────────────────┐
│ 4. Developer Creates Migration           │
│    npx prisma migrate dev                │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ 5. Test & Document                       │
│    ├─ Verify migration works             │
│    ├─ Update service README              │
│    └─ Create PR                          │
└──────────────────────────────────────────┘
```

---

## Integration Points Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATION POINTS                           │
└─────────────────────────────────────────────────────────────────┘

1. API CONTRACTS (via @orion/shared)
   ┌──────────┐     imports     ┌────────────────┐
   │ Services │ ◄───────────────┤ /shared/       │
   └──────────┘                 │ contracts/     │
                                └────────────────┘

2. EVENT COMMUNICATION (via RabbitMQ)
   ┌─────────┐   publishes   ┌──────────┐   consumes   ┌─────────┐
   │  User   ├──────────────►│  Event   ├─────────────►│ Notif   │
   │ Service │               │   Bus    │              │ Service │
   └─────────┘               └──────────┘              └─────────┘

3. DATABASE ISOLATION (no cross-DB FKs)
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Auth DB     │  │  User DB     │  │  Notif DB    │
   │ (isolated)   │  │ (isolated)   │  │ (isolated)   │
   └──────────────┘  └──────────────┘  └──────────────┘
         │                  │                  │
         └──────────────────┴──────────────────┘
                            │
                   No foreign keys across DBs
                   Use events or API calls

4. FRONTEND-BACKEND (via Gateway)
   ┌──────────┐   HTTP/WS   ┌─────────┐   routes   ┌─────────┐
   │ Admin UI ├────────────►│ Gateway ├───────────►│ Services│
   └──────────┘             └─────────┘            └─────────┘
                                 │
                            Aggregates
                          all service APIs

5. SHARED DEPENDENCIES (via root package.json)
   ┌─────────────────────────────────────────┐
   │  Root package.json                       │
   │  ├─ NestJS (all services)               │
   │  ├─ Prisma (all services)               │
   │  └─ Jest (all services)                 │
   └─────────────────────────────────────────┘
                    │
         All services inherit dependencies
```

---

## Communication Flow

```
┌───────────────────────── DAILY ─────────────────────────┐
│                                                          │
│  Slack: #orion-dev-coordination                         │
│  ┌────────────────────────────────────────────┐         │
│  │ • Daily async standups                     │         │
│  │ • Quick questions                          │         │
│  │ • Blocking issues                          │         │
│  │ • Integration coordination                 │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  GitHub Issues & PRs                                    │
│  ┌────────────────────────────────────────────┐         │
│  │ • contract-change requests                 │         │
│  │ • schema-change requests                   │         │
│  │ • Code reviews                             │         │
│  │ • Feature discussions                      │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌───────────────────────── WEEKLY ────────────────────────┐
│                                                          │
│  Integration Sync Meeting (1 hour)                      │
│  ┌────────────────────────────────────────────┐         │
│  │ 1. Review integration points               │         │
│  │ 2. Demo completed features                 │         │
│  │ 3. Resolve cross-workstream issues         │         │
│  │ 4. Plan next week's priorities             │         │
│  │ 5. Risk review                             │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Quality Gates (Automated)

```
┌─────────────────────────────────────────────────────────┐
│                    PRE-COMMIT                            │
│  (via Husky)                                            │
│  ┌───────────────────────────────────────────┐          │
│  │ ✓ Lint staged files                       │          │
│  │ ✓ Format with Prettier                    │          │
│  │ ✓ Type check                              │          │
│  └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    ON PUSH                               │
│  (GitHub Actions)                                       │
│  ┌───────────────────────────────────────────┐          │
│  │ ✓ Lint all code                           │          │
│  │ ✓ Type check entire project               │          │
│  │ ✓ Run unit tests                          │          │
│  │ ✓ Check coverage (>80%)                   │          │
│  │ ✓ Build all affected services             │          │
│  └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│                 ON PULL REQUEST                          │
│  (GitHub Actions)                                       │
│  ┌───────────────────────────────────────────┐          │
│  │ ✓ All on-push checks                      │          │
│  │ ✓ Run E2E tests                           │          │
│  │ ✓ Build Docker images                     │          │
│  │ ✓ Check for merge conflicts               │          │
│  │ ✓ Require 1+ approval                     │          │
│  └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
                        ▼
                   ✅ MERGE
```

---

## Escalation Path

```
LEVEL 1: Self-Service
┌──────────────────────────────────────┐
│ • Check documentation                │
│ • Search existing issues             │
│ • Review similar code                │
└──────────────────────────────────────┘
              │ Still blocked
              ▼
LEVEL 2: Ask Team
┌──────────────────────────────────────┐
│ • Post in #orion-dev-coordination    │
│ • Tag relevant workstream owner      │
│ • Response SLA: 2 hours              │
└──────────────────────────────────────┘
              │ Still blocked
              ▼
LEVEL 3: Create Issue
┌──────────────────────────────────────┐
│ • GitHub issue with proper labels    │
│ • Tag multiple owners if needed      │
│ • Response SLA: 4 hours              │
└──────────────────────────────────────┘
              │ Still blocked
              ▼
LEVEL 4: Emergency Escalation
┌──────────────────────────────────────┐
│ • @channel in Slack                  │
│ • Tag project lead                   │
│ • Schedule emergency sync            │
│ • Response: Immediate                │
└──────────────────────────────────────┘
```

---

## Success Criteria Dashboard

```
┌─────────────────────────────────────────────────────────┐
│                  WORKSTREAM STATUS                       │
├─────────────────┬───────────┬──────────┬────────────────┤
│ Workstream      │ Progress  │ Status   │ Blockers       │
├─────────────────┼───────────┼──────────┼────────────────┤
│ 1. Auth         │ ██░░░░░░  │ 🟡 WIP   │ None           │
│ 2. User         │ ██░░░░░░  │ 🟡 WIP   │ None           │
│ 3. Notif        │ █░░░░░░░  │ 🟡 WIP   │ None           │
│ 4. Gateway      │ ░░░░░░░░  │ ⚪ Waiting│ Contract       │
│ 5. Admin UI     │ ░░░░░░░░  │ ⚪ Waiting│ Gateway        │
│ 6. Contracts    │ ████████  │ 🟢 Done  │ None           │
│ 7. Infra        │ ██████░░  │ 🟡 WIP   │ None           │
│ 8. Database     │ █████░░░  │ 🟡 WIP   │ None           │
│ 9. Testing      │ ███░░░░░  │ 🟡 WIP   │ None           │
│ 10. DevOps      │ ██░░░░░░  │ 🟡 WIP   │ None           │
└─────────────────┴───────────┴──────────┴────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 INTEGRATION STATUS                       │
├─────────────────┬────────────────────────────────────────┤
│ API Contracts   │ 🟢 Complete                           │
│ Event Schemas   │ 🟢 Complete                           │
│ Database Schemas│ 🟡 In Review                          │
│ Service-to-Svc  │ 🔴 Not Started                        │
│ Frontend-Backend│ 🔴 Not Started                        │
└─────────────────┴────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    QUALITY METRICS                       │
├─────────────────┬────────────────────────────────────────┤
│ Test Coverage   │ 85% (Target: >80%)     🟢             │
│ Linting Errors  │ 0                      🟢             │
│ Type Errors     │ 0                      🟢             │
│ Open Blockers   │ 2                      🟡             │
│ PR Review Time  │ avg 4hrs               🟢             │
└─────────────────┴────────────────────────────────────────┘
```

---

## Legend

```
Status Indicators:
🟢 Green  = On track / Complete
🟡 Yellow = In progress / Minor issues
🔴 Red    = Blocked / Critical issues
⚪ White  = Not started / Waiting

Ownership Symbols:
✅ = Full ownership
🔒 = Exclusive (no others)
⚠️ = Requires approval
👁️ = Read only

Priority:
🔴 Critical (blocking others)
🟡 High (important)
🟢 Medium (normal)
⚪ Low (nice to have)
```

---

**Last Updated**: 2025-10-18
**Document Version**: 1.0.0
