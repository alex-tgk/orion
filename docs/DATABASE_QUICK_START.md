# Database Quick Start Guide

## TL;DR - Get Started in 5 Minutes

### 1. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env and set your database URLs:
# NOTIFICATION_DATABASE_URL="postgresql://user:pass@localhost:5432/orion_notifications"
# USER_DATABASE_URL="postgresql://user:pass@localhost:5432/orion_users"
# AUTH_DATABASE_URL="postgresql://user:pass@localhost:5432/orion_auth"
```

### 2. Create Databases
```bash
# Using PostgreSQL CLI
createdb orion_notifications
createdb orion_users
createdb orion_auth
```

### 3. Initialize Everything
```bash
# This will: generate Prisma clients, run migrations, and seed data
./scripts/db-migrate.sh all init
```

### 4. Verify Setup
```bash
# Check migration status
./scripts/db-migrate.sh all status

# Expected output: "Database schema is up to date!"
```

## Common Commands

### Migration Commands
```bash
# Run migrations (development)
./scripts/db-migrate.sh all migrate

# Deploy migrations (production)
./scripts/db-migrate.sh all deploy

# Check status
./scripts/db-migrate.sh all status

# Generate Prisma clients
./scripts/db-migrate.sh all generate
```

### Seed Commands
```bash
# Seed all services
./scripts/db-migrate.sh all seed

# Seed specific service
./scripts/db-migrate.sh notifications seed
./scripts/db-migrate.sh user seed
./scripts/db-migrate.sh auth seed
```

### Service-Specific Commands
```bash
# Work with individual services
./scripts/db-migrate.sh notifications [action]
./scripts/db-migrate.sh user [action]
./scripts/db-migrate.sh auth [action]
```

## Making Schema Changes

### Step 1: Edit Schema
```bash
# Edit the schema file
vim packages/user/prisma/schema.prisma
```

### Step 2: Create Migration
```bash
cd packages/user
npx prisma migrate dev --name add_new_field
cd ../..
```

### Step 3: Apply Migration
```bash
./scripts/db-migrate.sh user migrate
```

## Database Access

### Using Prisma Studio
```bash
# Open Prisma Studio for visual database management
cd packages/user
npx prisma studio
# Opens at http://localhost:5555
```

### Using psql
```bash
# Connect to database
psql orion_users

# View tables
\dt

# View schema
\d users

# Query data
SELECT * FROM users;
```

## Troubleshooting

### "Migration conflicts detected"
```bash
# Reset database (development only!)
./scripts/db-migrate.sh user reset

# Or manually resolve
cd packages/user
npx prisma migrate resolve --applied migration_name
```

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U your_user -d orion_users

# Verify environment variables
echo $USER_DATABASE_URL
```

### "Schema drift detected"
```bash
# Generate new migration
cd packages/user
npx prisma migrate dev --create-only

# Review the generated SQL
cat prisma/migrations/[timestamp]_migration_name/migration.sql

# Apply if correct
npx prisma migrate dev
```

## What Gets Seeded?

### Notification Service
- 6 notification templates (email, SMS, push)
- Sample user preferences

### User Service
- 21 permissions (user, role, content, system)
- 6 roles (super_admin to guest)
- 2 sample users (admin, user)
- User preferences for all users

### Auth Service
- Trusted device examples
- Rate limit configurations
- Security baseline data

## Production Deployment

### Pre-Deployment Checklist
- [ ] Backup existing database
- [ ] Test migrations in staging
- [ ] Review generated SQL
- [ ] Plan rollback strategy

### Deployment Steps
```bash
# 1. Backup
pg_dump orion_users > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Deploy migrations
./scripts/db-migrate.sh all deploy

# 3. Verify
./scripts/db-migrate.sh all status

# 4. (Optional) Seed if new environment
./scripts/db-migrate.sh all seed
```

## Schema Overview

### Notification Service (5 models)
- Notification
- Template
- DeliveryAttempt
- UserPreference
- NotificationBatch

### User Service (13 models)
- User
- UserPreferences
- Role
- Permission
- UserRole
- RolePermission
- UserPermission
- Session
- TwoFactorAuth
- EmailVerification
- PasswordReset
- AuditLog
- ApiKey

### Auth Service (10 models)
- AuthToken
- LoginAttempt
- PasswordReset
- TwoFactorAuth
- TwoFactorBackupCode
- Device
- SessionBlacklist
- OAuthProvider
- SecurityEvent
- RateLimit

## Need More Help?

- **Full Documentation:** `/DATABASE.md`
- **Implementation Details:** `/docs/DATABASE_IMPLEMENTATION.md`
- **Schema Files:**
  - `/packages/notifications/prisma/schema.prisma`
  - `/packages/user/prisma/schema.prisma`
  - `/packages/auth/prisma/schema.prisma`
- **Seed Scripts:**
  - `/packages/notifications/prisma/seed.ts`
  - `/packages/user/prisma/seed.ts`
  - `/packages/auth/prisma/seed.ts`

## Quick Tips

1. **Always backup before migrations in production**
2. **Test migrations in development first**
3. **Use `npx prisma studio` for visual database exploration**
4. **Check migration status before making changes**
5. **Review generated SQL before applying migrations**
6. **Use soft deletes (`deletedAt`) for important data**
7. **Add indexes for frequently queried fields**
8. **Use transactions for multi-step operations**
