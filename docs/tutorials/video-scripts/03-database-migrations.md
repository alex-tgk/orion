# Tutorial 03: Working with Prisma Migrations

**Duration**: 18 minutes
**Level**: Intermediate
**Prerequisites**: Tutorials 01-02 completed, basic SQL knowledge

## Learning Objectives

By the end of this tutorial, you will be able to:
- Create and manage Prisma schema changes
- Generate and apply migrations safely
- Handle migration conflicts and rollbacks
- Implement data migrations for complex changes
- Deploy migrations to production environments
- Troubleshoot common migration issues

## Prerequisites

### Required Knowledge
- Completion of Tutorials 01-02
- Basic SQL and database concepts
- Understanding of data modeling
- Familiarity with version control

### Required Setup
- ORION development environment running
- Task service from Tutorial 02 created
- PostgreSQL running in Docker

## Tutorial Outline

### Part 1: Introduction to Migrations (3 minutes)
### Part 2: Creating Schema Changes (5 minutes)
### Part 3: Advanced Migration Patterns (5 minutes)
### Part 4: Production Migration Strategies (3 minutes)
### Part 5: Troubleshooting (2 minutes)

---

## Detailed Script

### Part 1: Introduction to Migrations (3 minutes)

**[SCREEN: Database schema evolution diagram]**

**NARRATOR**: Welcome to database migrations with Prisma! In this tutorial, we'll learn how to safely evolve your database schema as your application grows.

**[SCREEN: Show migration workflow diagram]**

**NARRATOR**: Migrations are version-controlled changes to your database schema. Think of them like Git commits, but for your database structure. Each migration:
- Has a timestamp and description
- Contains SQL to upgrade the schema
- Can be applied or rolled back
- Is tracked in a migrations table

**[SCREEN: Show packages/task/prisma/migrations directory]**

**TYPE:**
```bash
# View existing migrations
ls -la packages/task/prisma/migrations
```

**EXPECTED OUTPUT:**
```
drwxr-xr-x  20251018000000_init/
  migration.sql
```

**NARRATOR**: Let's look at our initial migration:

**TYPE:**
```bash
cat packages/task/prisma/migrations/20251018000000_init/migration.sql
```

**EXPECTED OUTPUT:**
```sql
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "userId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
```

**NARRATOR**: This is the SQL that Prisma generated from our schema. Now let's make some changes!

---

### Part 2: Creating Schema Changes (5 minutes)

**[SCREEN: VS Code with schema.prisma open]**

**NARRATOR**: Let's add some new features to our Task model. We'll add task categories and tags.

#### Adding New Fields

**TYPE:**
```prisma
// packages/task/prisma/schema.prisma

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

// NEW: Add task category enum
enum TaskCategory {
  WORK
  PERSONAL
  SHOPPING
  HEALTH
  OTHER
}

model Task {
  id          String       @id @default(uuid())
  title       String       @db.VarChar(200)
  description String?      @db.VarChar(2000)
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)

  // NEW: Add category field
  category    TaskCategory @default(OTHER)

  // NEW: Add tags as array
  tags        String[]     @default([])

  userId      String
  dueDate     DateTime?

  // NEW: Add completion tracking
  completedAt DateTime?

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId])
  @@index([status])
  @@index([category]) // NEW: Index for category queries
  @@map("tasks")
}
```

**NARRATOR**: Now let's create a migration for these changes:

**TYPE:**
```bash
cd packages/task
npx prisma migrate dev --name add_categories_and_tags
```

**EXPECTED OUTPUT:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database

✔ Enter a name for the new migration: … add_categories_and_tags

Applying migration `20251018123456_add_categories_and_tags`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251018123456_add_categories_and_tags/
    └─ migration.sql

✔ Generated Prisma Client
```

**NARRATOR**: Let's examine the generated migration:

**TYPE:**
```bash
cat prisma/migrations/20251018123456_add_categories_and_tags/migration.sql
```

**EXPECTED OUTPUT:**
```sql
-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('WORK', 'PERSONAL', 'SHOPPING', 'HEALTH', 'OTHER');

-- AlterTable
ALTER TABLE "tasks"
ADD COLUMN "category" "TaskCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tasks_category_idx" ON "tasks"("category");
```

**NARRATOR**: Perfect! Prisma automatically:
- Created the new enum type
- Added columns with default values
- Created the category index

#### Adding a New Table

**[SCREEN: Continue editing schema.prisma]**

**NARRATOR**: Now let's add a TaskComment model for task collaboration:

**TYPE:**
```prisma
model Task {
  // ... existing fields ...

  // NEW: Add relation to comments
  comments Comment[]
}

// NEW: Comment model
model Comment {
  id        String   @id @default(uuid())
  content   String   @db.VarChar(1000)
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([taskId])
  @@map("task_comments")
}
```

**TYPE:**
```bash
npx prisma migrate dev --name add_comments
```

**EXPECTED OUTPUT:**
```
Applying migration `20251018123457_add_comments`

The following migration(s) have been created and applied:

migrations/
  └─ 20251018123457_add_comments/
    └─ migration.sql
```

**TYPE:**
```bash
cat prisma/migrations/20251018123457_add_comments/migration.sql
```

**EXPECTED OUTPUT:**
```sql
-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_comments_taskId_idx" ON "task_comments"("taskId");

-- AddForeignKey
ALTER TABLE "task_comments"
ADD CONSTRAINT "task_comments_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

**NARRATOR**: Notice the CASCADE delete - when a task is deleted, all its comments are automatically removed!

---

### Part 3: Advanced Migration Patterns (5 minutes)

**[SCREEN: Terminal window]**

**NARRATOR**: Sometimes you need to migrate existing data, not just the schema. Let's see how.

#### Data Migration Example

**NARRATOR**: Suppose we want to automatically set the category based on keywords in the title. We'll create a custom migration.

**TYPE:**
```bash
# Create an empty migration
npx prisma migrate dev --create-only --name categorize_existing_tasks
```

**EXPECTED OUTPUT:**
```
Prisma schema loaded from prisma/schema.prisma

✔ Name of migration: … categorize_existing_tasks

The following migration has been created but not applied:

migrations/
  └─ 20251018123458_categorize_existing_tasks/
    └─ migration.sql
```

**[SCREEN: Open the migration file in editor]**

**NARRATOR**: The file is empty. Let's add our data migration logic:

**TYPE:**
```sql
-- Data migration: Categorize existing tasks based on title keywords

-- Set WORK category
UPDATE tasks
SET category = 'WORK'
WHERE category = 'OTHER'
  AND (
    title ILIKE '%meeting%' OR
    title ILIKE '%project%' OR
    title ILIKE '%work%'
  );

-- Set SHOPPING category
UPDATE tasks
SET category = 'SHOPPING'
WHERE category = 'OTHER'
  AND (
    title ILIKE '%buy%' OR
    title ILIKE '%shop%' OR
    title ILIKE '%purchase%'
  );

-- Set HEALTH category
UPDATE tasks
SET category = 'HEALTH'
WHERE category = 'OTHER'
  AND (
    title ILIKE '%doctor%' OR
    title ILIKE '%gym%' OR
    title ILIKE '%health%'
  );

-- Set PERSONAL for remaining uncategorized tasks
UPDATE tasks
SET category = 'PERSONAL'
WHERE category = 'OTHER';
```

**NARRATOR**: Now apply the migration:

**TYPE:**
```bash
npx prisma migrate dev
```

**EXPECTED OUTPUT:**
```
Applying migration `20251018123458_categorize_existing_tasks`

The following migration(s) have been applied:

migrations/
  └─ 20251018123458_categorize_existing_tasks/
    └─ migration.sql
```

#### Handling Breaking Changes

**[SCREEN: Edit schema.prisma]**

**NARRATOR**: What if we need to make a breaking change, like making a field required?

**TYPE:**
```prisma
model Task {
  // ... other fields ...

  // Change description from optional to required
  description String       @db.VarChar(2000)  // Removed the ?
}
```

**TYPE:**
```bash
npx prisma migrate dev --name require_description
```

**EXPECTED OUTPUT:**
```
⚠ We found changes that cannot be executed:

  • Made the column `description` on table `tasks` required, but there are 5 existing NULL values.

? How would you like to handle this? ›
  ⦿ Provide a default value
  ○ Update existing rows
  ○ Cancel migration
```

**NARRATOR**: Prisma warns us about the breaking change. Let's provide a default:

**SELECT:** Provide a default value

**INPUT:**
```
Default value: No description provided
```

**EXPECTED OUTPUT:**
```
✔ Applied migration `20251018123459_require_description`
```

**TYPE:**
```bash
cat prisma/migrations/20251018123459_require_description/migration.sql
```

**EXPECTED OUTPUT:**
```sql
-- First, set default for existing NULL values
UPDATE tasks
SET description = 'No description provided'
WHERE description IS NULL;

-- Then make the column required
ALTER TABLE "tasks"
ALTER COLUMN "description" SET NOT NULL;
```

#### Renaming Columns

**NARRATOR**: Column renames need special attention to preserve data:

**TYPE:**
```prisma
model Task {
  // Rename userId to assignedTo
  assignedTo  String  // was: userId
}
```

**TYPE:**
```bash
npx prisma migrate dev --create-only --name rename_user_id
```

**[SCREEN: Edit the generated migration]**

**TYPE:**
```sql
-- Use RENAME instead of DROP + ADD to preserve data
ALTER TABLE "tasks"
RENAME COLUMN "userId" TO "assignedTo";

-- Update the index as well
DROP INDEX "tasks_userId_idx";
CREATE INDEX "tasks_assignedTo_idx" ON "tasks"("assignedTo");
```

**NARRATOR**: Always use RENAME for column name changes to avoid data loss!

---

### Part 4: Production Migration Strategies (3 minutes)

**[SCREEN: Deployment diagram]**

**NARRATOR**: Running migrations in production requires careful planning. Let's discuss best practices.

#### Migration Workflow

**[SCREEN: Show workflow diagram]**

**NARRATOR**: The safe migration workflow:
1. Develop and test migrations locally
2. Commit migrations to version control
3. Deploy migrations before deploying code
4. Have a rollback plan ready

#### Production Migration Command

**TYPE:**
```bash
# Production migration (doesn't prompt, fails on issues)
npx prisma migrate deploy
```

**NARRATOR**: This command:
- Applies pending migrations
- Never prompts for input
- Fails if there are issues
- Logs all actions

#### Docker Deployment Example

**[SCREEN: Show Dockerfile]**

**TYPE:**
```dockerfile
# In your Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy schema and migrations
COPY prisma ./prisma
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Build application
RUN npm run build

# Migration script
COPY migrate.sh ./
RUN chmod +x migrate.sh

CMD ["./migrate.sh"]
```

**[SCREEN: Show migrate.sh]**

**TYPE:**
```bash
#!/bin/sh
# migrate.sh

echo "Running database migrations..."

# Run migrations
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "Migrations completed successfully"
  # Start the application
  node dist/main.js
else
  echo "Migration failed!"
  exit 1
fi
```

#### Rollback Strategy

**NARRATOR**: For rollbacks, create a migration that reverses changes:

**TYPE:**
```bash
# Create rollback migration
npx prisma migrate dev --create-only --name rollback_comments

# Edit to reverse the add_comments migration
```

**TYPE:**
```sql
-- Rollback: Remove comments table
DROP TABLE IF EXISTS "task_comments" CASCADE;

-- Note: This destroys data!
-- In production, you might want to:
-- 1. Archive the data first
-- 2. Use feature flags instead
-- 3. Keep old schema temporarily
```

---

### Part 5: Troubleshooting (2 minutes)

**[SCREEN: Terminal with common errors]**

#### Common Issues and Solutions

**ISSUE 1: Migration Conflict**

**SYMPTOM:**
```
Error: P3006
Migration `xyz` failed to apply
```

**SOLUTION:**
```bash
# Reset database (DEVELOPMENT ONLY!)
npx prisma migrate reset

# Or manually fix in production:
# 1. Mark migration as applied
npx prisma migrate resolve --applied "migration_name"

# 2. Or mark as rolled back
npx prisma migrate resolve --rolled-back "migration_name"
```

**ISSUE 2: Drift Detected**

**SYMPTOM:**
```
The database schema is not in sync with the migration history
```

**SOLUTION:**
```bash
# Check what changed
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# Create migration to sync
npx prisma migrate dev --name sync_database
```

**ISSUE 3: Out of Sync in Team**

**NARRATOR**: When pulling migrations from teammates:

**TYPE:**
```bash
# Pull latest migrations
git pull origin main

# Apply new migrations
npx prisma migrate dev

# Regenerate Prisma Client
npx prisma generate
```

---

## Common Pitfalls

### Pitfall 1: Not Committing Migrations

**PROBLEM**: Migrations exist locally but aren't in Git

**SOLUTION**:
```bash
# Always commit migration files
git add prisma/migrations/
git commit -m "feat: add task categories and comments"
```

### Pitfall 2: Editing Applied Migrations

**PROBLEM**: Changing a migration after it's been applied

**SOLUTION**: Never edit applied migrations. Create a new migration instead:
```bash
npx prisma migrate dev --name fix_previous_migration
```

### Pitfall 3: No Backup Before Production Migration

**PROBLEM**: Running migrations without backup

**SOLUTION**:
```bash
# Always backup first
pg_dump orion_task > backup_before_migration.sql

# Then migrate
npx prisma migrate deploy
```

### Pitfall 4: Slow Migrations on Large Tables

**PROBLEM**: Migrations lock tables and timeout

**SOLUTION**: Use concurrent index creation:
```sql
-- Instead of:
CREATE INDEX "tasks_category_idx" ON "tasks"("category");

-- Use:
CREATE INDEX CONCURRENTLY "tasks_category_idx" ON "tasks"("category");
```

---

## Summary Checklist

By now, you should be able to:
- ✓ Create migrations for schema changes
- ✓ Generate migrations with `migrate dev`
- ✓ Write custom data migrations
- ✓ Handle breaking changes safely
- ✓ Rename columns without data loss
- ✓ Deploy migrations to production
- ✓ Rollback migrations when needed
- ✓ Troubleshoot common migration issues
- ✓ Work with migrations in a team

---

## Next Steps

### Practice Exercises
1. Add a Task archiving feature with an `archivedAt` field
2. Create a migration to archive all DONE tasks older than 30 days
3. Add full-text search capabilities to task titles

### Next Tutorial
**Tutorial 04: Testing Guide**
- Unit testing with Jest
- Integration testing with test databases
- Mocking Prisma Client
- E2E testing strategies

### Additional Resources
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Migration Troubleshooting Guide](https://www.prisma.io/docs/guides/migrate/troubleshooting)
- [Production Best Practices](/docs/guides/DATABASE_PRODUCTION.md)

---

## Commands Reference

### Development
```bash
# Create and apply migration
npx prisma migrate dev --name <description>

# Create migration without applying
npx prisma migrate dev --create-only --name <description>

# Reset database (dev only!)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Production
```bash
# Apply pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Resolve migration issues
npx prisma migrate resolve --applied <migration>
npx prisma migrate resolve --rolled-back <migration>
```

### Utilities
```bash
# View database schema
npx prisma db pull

# Compare schemas
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# Open Prisma Studio
npx prisma studio
```

---

## Video Production Notes

### Visual Aids
- Show side-by-side schema.prisma and generated SQL
- Animate the migration workflow diagram
- Highlight SQL changes with color coding
- Show before/after database state

### Code Preparation
Pre-create these examples:
- Base schema (from Tutorial 02)
- Schema with categories added
- Schema with comments table
- Custom data migration SQL
- Rollback migration SQL

### Timing
- Pause after each migration applies
- Show Prisma Studio viewing the changes
- Allow time to read generated SQL

---

**Script Version**: 1.0
**Last Updated**: October 2025
**Estimated Recording Time**: 23 minutes (18 min tutorial + 5 min buffer)
