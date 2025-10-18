# Database Coordination Guide

## Overview

This guide establishes protocols for coordinating database schema development across Orion microservices while maintaining the microservices principle of **database-per-service**.

---

## Core Principles

### 1. Database Isolation
Each service has its own PostgreSQL database:
- **Auth Service**: `orion_auth`
- **User Service**: `orion_user`
- **Notification Service**: `orion_notifications`
- **Future services**: `orion_[service-name]`

### 2. No Cross-Database Foreign Keys
**NEVER** create foreign keys between databases.

**❌ Bad**:
```sql
-- In User Service database
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- WRONG! Cross-database FK
  ...
);
```

**✅ Good**:
```sql
-- In User Service database
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY,
  user_id UUID,  -- No FK, managed at application level
  ...
);
```

Use **event-driven synchronization** instead of foreign keys.

### 3. Eventual Consistency
Services stay synchronized via events, not database constraints.

---

## Database Lead Responsibilities (Workstream 8)

### Authority
- Final approval on all schema changes
- Naming convention enforcement
- Migration strategy oversight
- Cross-service data relationship mapping
- Performance optimization (indexes, queries)

### Review Checklist
- [ ] Naming follows conventions
- [ ] Proper indexes defined
- [ ] No cross-database relationships
- [ ] Migration is reversible
- [ ] Breaking changes documented
- [ ] Performance considered

---

## Schema Change Process

### Step 1: Design Your Schema

Use Prisma schema syntax:

```prisma
// /packages/user/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String
  avatar    String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
  @@index([email])
}

model UserPreferences {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @unique @map("user_id") @db.Uuid
  emailNotifications Boolean @default(true) @map("email_notifications")
  theme             String  @default("light")

  @@map("user_preferences")
  @@index([userId])
}
```

---

### Step 2: Submit for Review

Create GitHub issue:

**Title**: `[Schema] User Service - Add UserPreferences table`

**Label**: `schema-change`

**Template**:
```markdown
## Schema Change Request

### Service
User Service

### Type of Change
- [ ] New table
- [ ] Modify existing table
- [ ] Add index
- [ ] Remove column (breaking)
- [ ] Data migration required

### Proposed Schema
\`\`\`prisma
model UserPreferences {
  id                String  @id @default(uuid()) @db.Uuid
  userId            String  @unique @map("user_id") @db.Uuid
  emailNotifications Boolean @default(true) @map("email_notifications")
  theme             String  @default("light")

  @@map("user_preferences")
  @@index([userId])
}
\`\`\`

### Rationale
Need to store user preferences separately from the main user table for:
- Better query performance
- Clear separation of concerns
- Easier to extend preferences in the future

### Relationships
- References userId (NO foreign key, application-level)
- One-to-one with User table

### Performance Considerations
- Indexed on userId for fast lookups
- Separate table keeps user queries lightweight

### Migration Strategy
- Add new table (non-breaking)
- Default preferences created on user creation
- No data migration needed

### Rollback Plan
If issues arise:
1. Stop creating preferences for new users
2. Drop table
3. Revert migration
```

---

### Step 3: Database Lead Reviews

**Review Timeline**: Within 48 hours

**Database Lead checks**:
1. **Naming Conventions**:
   - Table names: `snake_case`, plural
   - Column names: `snake_case`
   - Prisma model names: `PascalCase`, singular

2. **Data Types**:
   - UUIDs for IDs (`@db.Uuid`)
   - Proper string lengths
   - Appropriate numeric types

3. **Indexes**:
   - Primary keys defined
   - Foreign key columns indexed (even if not FK)
   - Frequently queried columns indexed

4. **Relationships**:
   - No cross-database FKs
   - Clear documentation of application-level relationships

5. **Performance**:
   - Table size estimates
   - Query patterns
   - Index strategy

**Feedback Format**:
```markdown
## Database Lead Review

### Approval Status
- [ ] Approved
- [x] Requires changes
- [ ] Rejected

### Required Changes
1. Add index on email field for search queries
2. Change `theme` to ENUM instead of String
3. Add `@@index([userId, createdAt])` for temporal queries

### Recommendations
- Consider adding `deletedAt` for soft deletes
- Add constraint on theme values at application level

### Performance Notes
- Estimated rows: <1M in first year
- Query pattern: Single lookups by userId
- Index strategy: Good for current needs
```

---

### Step 4: Implement Changes

Once approved:

```bash
# Navigate to your service
cd /packages/user

# Edit schema based on feedback
# Edit prisma/schema.prisma

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_user_preferences

# Review generated migration SQL
cat prisma/migrations/[timestamp]_add_user_preferences/migration.sql

# Test migration
npx prisma migrate dev

# Verify in Prisma Studio
npx prisma studio
```

---

### Step 5: Document Migration

Add to service README:

```markdown
## Database Migrations

### 2025-10-18: Add UserPreferences Table
- **Migration**: `20251018_add_user_preferences`
- **Type**: Non-breaking addition
- **Purpose**: Store user preferences separately
- **Rollback**: `npx prisma migrate reset` (dev only)
- **Production**: Applied via CD pipeline
```

---

## Naming Conventions

### Table Names
**Format**: `snake_case`, **plural**

✅ Good:
- `users`
- `user_preferences`
- `notification_templates`

❌ Bad:
- `User` (not snake_case)
- `user` (not plural)
- `userPreferences` (not snake_case)

---

### Column Names
**Format**: `snake_case`

✅ Good:
- `user_id`
- `created_at`
- `email_address`

❌ Bad:
- `userId` (not snake_case)
- `createdAt` (not snake_case)
- `EmailAddress` (not snake_case)

---

### Prisma Model Names
**Format**: `PascalCase`, **singular**

```prisma
// ✅ Good
model User {
  id    String @id
  email String

  @@map("users")  // Maps to plural table name
}

model UserPreference {
  id     String @id
  userId String @map("user_id")

  @@map("user_preferences")
}

// ❌ Bad
model user {  // Should be PascalCase
  ...
}

model Users {  // Should be singular
  ...
}
```

---

### Index Names
**Format**: `idx_[table]_[columns]`

```prisma
model User {
  email String

  @@index([email], name: "idx_users_email")
}

model UserPreference {
  userId    String
  createdAt DateTime

  @@index([userId, createdAt], name: "idx_user_preferences_user_id_created_at")
}
```

---

## Common Patterns

### 1. UUID Primary Keys

```prisma
model User {
  id String @id @default(uuid()) @db.Uuid

  @@map("users")
}
```

**Why**: UUIDs prevent ID collision in distributed systems.

---

### 2. Timestamps

```prisma
model User {
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

**Why**: Track creation and modification times.

---

### 3. Soft Deletes (Optional)

```prisma
model User {
  id        String    @id @default(uuid()) @db.Uuid
  deletedAt DateTime? @map("deleted_at")

  @@map("users")
  @@index([deletedAt])
}
```

**Usage**:
```typescript
// Mark as deleted instead of actual delete
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() }
});

// Query non-deleted users
await prisma.user.findMany({
  where: { deletedAt: null }
});
```

---

### 4. Enums

```prisma
enum NotificationStatus {
  QUEUED
  SENDING
  DELIVERED
  FAILED
  BOUNCED

  @@map("notification_status")
}

model Notification {
  id     String             @id @default(uuid()) @db.Uuid
  status NotificationStatus @default(QUEUED)

  @@map("notifications")
}
```

---

### 5. JSON Fields (Use Sparingly)

```prisma
model Notification {
  id       String @id @default(uuid()) @db.Uuid
  metadata Json?  // For flexible data

  @@map("notifications")
}
```

**When to use**:
- Configuration data
- Flexible key-value pairs
- Data structure may change

**When NOT to use**:
- Queryable data (use columns instead)
- Relational data

---

## Cross-Service Data Relationships

### Problem: User Data Needed in Multiple Services

**Scenario**: Notification service needs user email to send notifications.

**❌ Bad Solution** (Foreign Key):
```prisma
// In Notification Service database - DON'T DO THIS
model Notification {
  userId String @db.Uuid
  user   User   @relation(...)  // WRONG! Cross-database relation
}
```

**✅ Good Solution** (Application-Level):

1. **Store only the ID**:
   ```prisma
   // In Notification Service database
   model Notification {
     id     String @id @default(uuid()) @db.Uuid
     userId String @db.Uuid  // Just the ID, no relation
     email  String  // Denormalized for quick access

     @@map("notifications")
     @@index([userId])
   }
   ```

2. **Synchronize via Events**:
   ```typescript
   // In Notification Service
   @OnEvent(USER_EVENT_PATTERNS.USER_CREATED)
   async handleUserCreated(event: UserCreatedEvent) {
     // Cache user data if needed
     await this.cacheUserData(event.userId, event.email);
   }

   @OnEvent(USER_EVENT_PATTERNS.USER_UPDATED)
   async handleUserUpdated(event: UserUpdatedEvent) {
     if (event.changes.includes('email')) {
       // Update cached email
       await this.updateCachedEmail(event.userId);
     }
   }
   ```

3. **Fetch on-demand**:
   ```typescript
   // In Notification Service
   async sendNotification(userId: string) {
     // Call User Service API for current data
     const user = await this.userServiceClient.getUser(userId);
     await this.emailService.send(user.email, ...);
   }
   ```

---

## Data Synchronization Strategies

### Strategy 1: Event-Driven Sync (Recommended)

**When**: Real-time sync needed, eventual consistency acceptable

**Example**: Keep user email in sync across services

```typescript
// Publisher (User Service)
async updateUser(userId: string, data: UpdateUserDto) {
  const user = await this.prisma.user.update({
    where: { id: userId },
    data,
  });

  // Publish event
  this.eventEmitter.emit(USER_EVENT_PATTERNS.USER_UPDATED, {
    eventId: uuidv4(),
    userId: user.id,
    changes: Object.keys(data),
    updatedAt: new Date(),
  });

  return user;
}

// Consumer (Notification Service)
@OnEvent(USER_EVENT_PATTERNS.USER_UPDATED)
async handleUserUpdated(event: UserUpdatedEvent) {
  if (event.changes.includes('email')) {
    // Update local cache/denormalized data
    await this.updateUserEmail(event.userId);
  }
}
```

---

### Strategy 2: API Calls (Request-Time)

**When**: Data needed infrequently, consistency critical

**Example**: Get current user data for notification

```typescript
// In Notification Service
async sendNotification(userId: string, template: string) {
  // Fetch fresh data from User Service
  const user = await this.httpService.get(
    `${USER_SERVICE_URL}/api/v1/users/${userId}`
  ).toPromise();

  await this.emailService.send({
    to: user.email,
    template,
    data: { name: user.name },
  });
}
```

---

### Strategy 3: Denormalization with Cache

**When**: High read frequency, low update frequency

**Example**: Cache user data in Notification Service

```typescript
// In Notification Service
async getUserEmail(userId: string): Promise<string> {
  // Try cache first
  const cached = await this.cache.get(`user:${userId}:email`);
  if (cached) return cached;

  // Fetch from User Service
  const user = await this.userServiceClient.getUser(userId);

  // Cache for 1 hour
  await this.cache.set(`user:${userId}:email`, user.email, 3600);

  return user.email;
}

// Invalidate cache on user update
@OnEvent(USER_EVENT_PATTERNS.USER_UPDATED)
async handleUserUpdated(event: UserUpdatedEvent) {
  if (event.changes.includes('email')) {
    await this.cache.del(`user:${event.userId}:email`);
  }
}
```

---

## Migration Strategies

### Non-Breaking Changes

**Examples**:
- Adding new table
- Adding optional column
- Adding index
- Adding enum value

**Process**:
1. Create migration
2. Test in development
3. Deploy to production
4. No rollback needed

---

### Breaking Changes

**Examples**:
- Removing column
- Renaming column
- Changing column type
- Making column required

**Process**:
1. **Multi-step migration**:

   **Step 1** (Add new column):
   ```sql
   ALTER TABLE users ADD COLUMN new_email VARCHAR(255);
   ```

   **Step 2** (Populate):
   ```sql
   UPDATE users SET new_email = old_email;
   ```

   **Step 3** (Deploy code using new column)

   **Step 4** (Make required):
   ```sql
   ALTER TABLE users ALTER COLUMN new_email SET NOT NULL;
   ```

   **Step 5** (Drop old column):
   ```sql
   ALTER TABLE users DROP COLUMN old_email;
   ```

2. **Version endpoints if needed**
3. **Document migration timeline**

---

### Data Migrations

**When**: Need to transform existing data

**Example**: Split name into firstName and lastName

```typescript
// Create custom migration script
// /packages/user/prisma/migrations/[timestamp]_split_name/migration.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    const [firstName, ...lastNameParts] = user.name.split(' ');
    const lastName = lastNameParts.join(' ');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
      },
    });
  }
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Performance Guidelines

### 1. Indexing Strategy

**Index these**:
- Primary keys (automatic)
- Foreign key columns (even without FK constraint)
- Columns in WHERE clauses
- Columns in JOIN conditions
- Columns in ORDER BY

**Don't over-index**:
- Indexes slow down writes
- Each index uses disk space
- Too many indexes hurts performance

**Example**:
```prisma
model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  status    String
  createdAt DateTime @default(now())

  // Frequently queried by userId
  @@index([userId])

  // Frequently queried by userId + status
  @@index([userId, status])

  // Frequently ordered by createdAt
  @@index([createdAt])

  @@map("notifications")
}
```

---

### 2. Query Optimization

**Use `select` to limit fields**:
```typescript
// ❌ Bad: Fetches all fields
const users = await prisma.user.findMany();

// ✅ Good: Fetch only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
  },
});
```

**Use pagination**:
```typescript
// ✅ Good: Paginate large result sets
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
});
```

**Use cursor-based pagination for large datasets**:
```typescript
const users = await prisma.user.findMany({
  take: 20,
  cursor: {
    id: lastUserId,
  },
  orderBy: {
    id: 'asc',
  },
});
```

---

### 3. Connection Pooling

Configure in each service:

```typescript
// In service's PrismaService
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool settings
      log: ['query', 'error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

**Environment variable**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/orion_user?connection_limit=10"
```

---

## Testing Strategies

### 1. Unit Tests with Mock

```typescript
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should find user by id', async () => {
    const mockUser = { id: '1', email: 'test@test.com', name: 'Test' };
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);

    const result = await service.findById('1');

    expect(result).toEqual(mockUser);
  });
});
```

---

### 2. Integration Tests with Test Database

```typescript
// test/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_TEST_URL,
    },
  },
});

beforeAll(async () => {
  // Reset database
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');

  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_TEST_URL },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  // Clean up data after each test
  await prisma.user.deleteMany();
});
```

---

## Environment Configuration

### Development
```env
# .env.development
DATABASE_URL="postgresql://orion:orion@localhost:5432/orion_user_dev?schema=public"
```

### Testing
```env
# .env.test
DATABASE_TEST_URL="postgresql://orion:orion@localhost:5432/orion_user_test?schema=public"
```

### Production
```env
# .env.production (from secrets manager)
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/orion_user?connection_limit=20&pool_timeout=10"
```

---

## Troubleshooting

### Issue: Migration Fails

```bash
# Reset database (development only!)
npx prisma migrate reset

# Re-run migrations
npx prisma migrate dev
```

### Issue: Schema Drift

```bash
# Check current database state
npx prisma db pull

# See differences
git diff prisma/schema.prisma
```

### Issue: Slow Queries

```bash
# Enable query logging
# In PrismaService
super({
  log: ['query'],  // Log all queries
});

# Analyze in logs
# Look for N+1 queries, missing indexes
```

---

## Checklist: Before Submitting Schema Change

- [ ] Naming follows conventions (snake_case tables, PascalCase models)
- [ ] Indexes on frequently queried columns
- [ ] No cross-database foreign keys
- [ ] Migration is reversible
- [ ] Data migration script (if needed)
- [ ] Performance impact assessed
- [ ] GitHub issue created with `schema-change` label
- [ ] Database Lead tagged for review
- [ ] Documentation updated

---

**Last Updated**: 2025-10-18
**Database Lead**: Workstream 8
