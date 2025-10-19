# Orion Microservices - Database Documentation

This document provides comprehensive information about database schemas, migrations, and management for the Orion microservices platform.

## Table of Contents

- [Overview](#overview)
- [Database Architecture](#database-architecture)
- [Service Schemas](#service-schemas)
- [Setup and Migration](#setup-and-migration)
- [Seed Data](#seed-data)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Orion uses PostgreSQL databases with Prisma ORM for each microservice, following a database-per-service pattern for true microservice isolation.

### Services and Databases

| Service | Database | Schema Location | Purpose |
|---------|----------|----------------|---------|
| **Notification** | `orion_notifications` | `/packages/notifications/prisma/schema.prisma` | Notification delivery and templates |
| **User** | `orion_users` | `/packages/user/prisma/schema.prisma` | User profiles and RBAC |
| **Auth** | `orion_auth` | `/packages/auth/prisma/schema.prisma` | Authentication and security |

## Database Architecture

### Notification Service Schema

**Key Models:**
- `Notification` - Main notification records with delivery tracking
- `Template` - Reusable notification templates with versioning
- `DeliveryAttempt` - Detailed delivery attempt tracking
- `UserPreference` - User notification preferences
- `NotificationBatch` - Bulk notification management

**Features:**
- Multi-channel support (Email, SMS, Push, In-App, Webhook, Slack, Discord)
- Priority-based delivery (LOW, NORMAL, HIGH, URGENT)
- Template versioning and localization
- Delivery retry tracking with exponential backoff support
- Quiet hours and timezone-aware delivery
- Comprehensive status tracking (QUEUED → PROCESSING → SENT → DELIVERED)

**Indexes:**
- Composite indexes for queue processing (`status, priority, queuedAt`)
- User activity tracking (`userId, status`)
- Efficient template lookup
- Tag-based filtering

### User Service Schema

**Key Models:**
- `User` - Core user profiles with comprehensive tracking
- `Role` - Hierarchical role definitions
- `Permission` - Granular permission system
- `UserRole` - User-role assignments with expiration
- `RolePermission` - Role-permission mappings
- `UserPermission` - Direct user permissions (bypass roles)
- `Session` - Active session management
- `AuditLog` - Complete audit trail
- `ApiKey` - Service-to-service authentication

**Features:**
- **RBAC System:**
  - Hierarchical roles with inheritance
  - Permission scopes (GLOBAL, ORG, TEAM, USER)
  - Role types (SYSTEM, CUSTOM)
  - Conditional permission assignment
  - Time-bound role assignments

- **User Management:**
  - Soft deletes with `deletedAt`
  - Email and phone verification tracking
  - Login attempt monitoring
  - Flexible user preferences (notifications, privacy, display, security)
  - Social links and metadata support

- **Audit Trail:**
  - Comprehensive action logging
  - Before/after value tracking
  - Session correlation
  - Performance metrics (duration)

**Indexes:**
- User lookup optimization (`email`, `username`, `status`)
- RBAC query performance (`userId, roleId`, `roleId, permissionId`)
- Audit log analysis (`userId, action, timestamp`)
- Session management (`token`, `expiresAt`)

### Auth Service Schema

**Key Models:**
- `AuthToken` - JWT token management with rotation
- `LoginAttempt` - Security monitoring and rate limiting
- `PasswordReset` - Password reset workflow
- `TwoFactorAuth` - 2FA configuration (TOTP, SMS, Email, Hardware Key)
- `TwoFactorBackupCode` - Recovery codes
- `Device` - Device fingerprinting and trust management
- `SessionBlacklist` - Immediate token revocation
- `OAuthProvider` - Social login integration
- `SecurityEvent` - Security audit trail
- `RateLimit` - Per-user/IP rate limiting

**Features:**
- **Token Management:**
  - Refresh token rotation
  - Token family tracking (parent-child relationships)
  - Scope-based access control
  - Automatic expiration cleanup

- **Security Features:**
  - Failed login detection
  - Suspicious activity flagging
  - Risk scoring (0-100)
  - Device fingerprinting
  - Geolocation tracking
  - IP-based rate limiting

- **Two-Factor Authentication:**
  - Multiple methods (TOTP, SMS, Email, Hardware Key, Backup Codes)
  - Trusted device management
  - Recovery mechanisms
  - Method-specific verification tracking

- **OAuth Integration:**
  - Multi-provider support
  - Token refresh management
  - Profile synchronization

**Indexes:**
- Token lookup (`token`, `tokenHash`)
- Security analysis (`email, status, attemptedAt`, `ipAddress, attemptedAt`)
- Device management (`deviceId`, `fingerprint`)
- Rate limiting (`key`, `resetAt`)

## Setup and Migration

### Environment Variables

Create `.env` files with database URLs:

```bash
# Notification Service
NOTIFICATION_DATABASE_URL="postgresql://user:password@localhost:5432/orion_notifications"

# User Service
USER_DATABASE_URL="postgresql://user:password@localhost:5432/orion_users"

# Auth Service
AUTH_DATABASE_URL="postgresql://user:password@localhost:5432/orion_auth"
```

### Initial Setup

```bash
# Initialize all databases (generate clients, migrate, seed)
./scripts/db-migrate.sh all init

# Or initialize individual services
./scripts/db-migrate.sh notifications init
./scripts/db-migrate.sh user init
./scripts/db-migrate.sh auth init
```

### Migration Commands

```bash
# Run migrations (development)
./scripts/db-migrate.sh all migrate

# Deploy migrations (production)
./scripts/db-migrate.sh all deploy

# Check migration status
./scripts/db-migrate.sh all status

# Generate Prisma clients
./scripts/db-migrate.sh all generate
```

### Manual Migration Workflow

For individual service management:

```bash
# Navigate to service directory
cd packages/notifications

# Generate migration
npx prisma migrate dev --name add_new_feature

# Apply migrations
npx prisma migrate dev

# Production deployment
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## Seed Data

### Notification Service Seeds

**Templates:**
- Welcome Email (Account category)
- Password Reset (Security category)
- Email Verification (Security category)
- Two-Factor SMS (Security category)
- New Message Push (Social category)
- System Maintenance (System category)

**User Preferences:**
- Default notification settings for sample users
- Channel preferences (email, SMS, push, in-app)
- Quiet hours configuration

### User Service Seeds

**Permissions:**
- User Management (5 permissions)
- Role Management (5 permissions)
- Permission Management (3 permissions)
- Content Management (5 permissions)
- System Management (3 permissions)

**Roles:**
- Super Admin (all permissions)
- Admin (most permissions)
- Moderator (user + content management)
- Editor (content management)
- User (read permissions)
- Guest (limited read access)

**Sample Users:**
- `admin@orion.local` - Super Administrator
- `user@orion.local` - Standard User

### Auth Service Seeds

**Devices:**
- Trusted devices for sample users
- Device fingerprinting examples

**Rate Limits:**
- Login endpoint (5/minute)
- Refresh endpoint (10/minute)
- Password reset (3/5 minutes)
- Email verification (5/5 minutes)
- 2FA verification (5/minute)

### Running Seeds

```bash
# Seed all services
./scripts/db-migrate.sh all seed

# Seed individual service
./scripts/db-migrate.sh notifications seed
```

## Best Practices

### Schema Design

1. **Use UUIDs for Primary Keys**
   ```prisma
   id String @id @default(uuid()) @db.Uuid
   ```

2. **Always Include Timestamps**
   ```prisma
   createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
   updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz
   ```

3. **Implement Soft Deletes**
   ```prisma
   deletedAt DateTime? @map("deleted_at") @db.Timestamptz
   @@index([deletedAt])
   ```

4. **Use Enums for Status Fields**
   ```prisma
   enum NotificationStatus {
     QUEUED
     PROCESSING
     SENT
     DELIVERED
     FAILED
   }
   ```

5. **Add Metadata Fields for Flexibility**
   ```prisma
   metadata Json @default("{}") @db.JsonB
   ```

### Indexing Strategy

1. **Index Foreign Keys**
   ```prisma
   @@index([userId])
   @@index([roleId])
   ```

2. **Composite Indexes for Common Queries**
   ```prisma
   @@index([status, priority, queuedAt])
   @@index([userId, action, timestamp])
   ```

3. **Unique Constraints**
   ```prisma
   @@unique([email])
   @@unique([userId, roleId])
   ```

### Migration Best Practices

1. **Name Migrations Descriptively**
   ```bash
   npx prisma migrate dev --name add_user_preferences_table
   ```

2. **Review Generated Migrations**
   - Always check the generated SQL before applying
   - Add data migrations in separate steps

3. **Test Migrations Locally**
   ```bash
   # Test in development
   npx prisma migrate dev

   # Verify with seed data
   npx prisma db seed
   ```

4. **Production Deployment**
   ```bash
   # Use deploy command (never dev)
   npx prisma migrate deploy

   # Backup database first!
   pg_dump orion_users > backup.sql
   ```

### Performance Optimization

1. **Use `@db.Timestamptz` for Timestamps**
   - Stores timezone information
   - More efficient queries

2. **Use `@db.JsonB` for JSON Fields**
   - More efficient than plain JSON
   - Supports indexing

3. **Limit String Field Sizes**
   ```prisma
   email String @db.VarChar(255)
   name  String @db.VarChar(100)
   ```

4. **Add Indexes for Frequent Queries**
   - WHERE clauses
   - JOIN conditions
   - ORDER BY fields
   - Foreign keys

## Troubleshooting

### Common Issues

#### Migration Conflicts

```bash
# Check current migration state
npx prisma migrate status

# Reset and reapply (development only)
npx prisma migrate reset

# Resolve conflicts manually
npx prisma migrate resolve --applied <migration_name>
```

#### Connection Issues

```bash
# Test database connection
npx prisma db pull

# Check environment variables
echo $USER_DATABASE_URL

# Verify PostgreSQL is running
pg_isready -h localhost -p 5432
```

#### Schema Drift

```bash
# Check for schema drift
npx prisma migrate status

# Generate migration from schema changes
npx prisma migrate dev --create-only

# Review and apply
npx prisma migrate dev
```

#### Performance Issues

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Table statistics
SELECT * FROM pg_stat_user_tables;
```

### Database Maintenance

```bash
# Vacuum database (PostgreSQL)
VACUUM ANALYZE;

# Reindex tables
REINDEX TABLE users;

# Check database size
SELECT pg_size_pretty(pg_database_size('orion_users'));

# Clean up old sessions
DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '30 days';
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

## Support

For issues or questions:
1. Check this documentation
2. Review Prisma logs: `packages/*/prisma/*.log`
3. Consult team in #backend-support channel
4. Create issue in repository
