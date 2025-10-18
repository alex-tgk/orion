# User Service - RBAC Quick Start

## Prerequisites

Ensure you have:
- PostgreSQL running (see docker-compose.yml)
- Redis running (for caching)
- RabbitMQ running (for events)
- Node.js and pnpm installed

## Step 1: Database Setup

```bash
# Navigate to user service
cd packages/user

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/orion_user"
export REDIS_URL="redis://localhost:6379"

# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_rbac_sessions

# Verify migration
npx prisma migrate status
```

## Step 2: Seed Initial Data

Create a seed file or run these SQL commands:

```sql
-- Create system roles
INSERT INTO roles (id, name, display_name, description, type, is_system, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'admin', 'Administrator', 'Full system access', 'SYSTEM', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'user', 'User', 'Standard user access', 'SYSTEM', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'moderator', 'Moderator', 'Content moderation access', 'SYSTEM', true, true, NOW(), NOW());

-- Create base permissions
INSERT INTO permissions (id, name, display_name, description, resource, action, category, scope, is_system, is_active, created_at, updated_at)
VALUES
  -- User permissions
  (gen_random_uuid(), 'users:read', 'Read Users', 'View user profiles and lists', 'users', 'read', 'User Management', 'GLOBAL', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'users:write', 'Write Users', 'Create and update users', 'users', 'write', 'User Management', 'GLOBAL', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'users:delete', 'Delete Users', 'Delete user accounts', 'users', 'delete', 'User Management', 'GLOBAL', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'users:manage', 'Manage Users', 'Full user management', 'users', 'manage', 'User Management', 'GLOBAL', true, true, NOW(), NOW()),

  -- Role permissions
  (gen_random_uuid(), 'roles:read', 'Read Roles', 'View roles', 'roles', 'read', 'Access Control', 'GLOBAL', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'roles:write', 'Write Roles', 'Create and update roles', 'roles', 'write', 'Access Control', 'GLOBAL', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'roles:delete', 'Delete Roles', 'Delete roles', 'roles', 'delete', 'Access Control', 'GLOBAL', true, true, NOW(), NOW()),

  -- Permission permissions
  (gen_random_uuid(), 'permissions:read', 'Read Permissions', 'View permissions', 'permissions', 'read', 'Access Control', 'GLOBAL', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'permissions:write', 'Write Permissions', 'Create permissions', 'permissions', 'write', 'Access Control', 'GLOBAL', true, true, NOW(), NOW()),
  (gen_random_uuid(), 'permissions:delete', 'Delete Permissions', 'Delete permissions', 'permissions', 'delete', 'Access Control', 'GLOBAL', true, true, NOW(), NOW()),

  -- System permissions
  (gen_random_uuid(), 'system:manage', 'Manage System', 'Full system administration', 'system', 'manage', 'System', 'GLOBAL', true, true, NOW(), NOW());

-- Assign permissions to admin role
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM roles WHERE name = 'admin'),
  p.id,
  NOW()
FROM permissions p
WHERE p.is_system = true;

-- Assign limited permissions to user role
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM roles WHERE name = 'user'),
  p.id,
  NOW()
FROM permissions p
WHERE p.name IN ('users:read');

-- Assign moderation permissions to moderator role
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM roles WHERE name = 'moderator'),
  p.id,
  NOW()
FROM permissions p
WHERE p.name IN ('users:read', 'users:write');
```

## Step 3: Update app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { SessionService } from './services/session.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesController } from './controllers/roles.controller';

@Module({
  // ... existing imports
  controllers: [
    UsersController,
    HealthController,
    RolesController, // NEW
  ],
  providers: [
    // ... existing providers
    RoleService, // NEW
    PermissionService, // NEW
    SessionService, // NEW
    RolesGuard, // NEW
    PermissionsGuard, // NEW
  ],
  exports: [
    // ... existing exports
    RoleService,
    PermissionService,
    SessionService,
  ],
})
export class AppModule {}
```

## Step 4: Test the Implementation

### Test 1: Create a Test User with Admin Role

```sql
-- Create test user
INSERT INTO users (id, email, username, first_name, last_name, status, is_verified, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'admin@test.com', 'admin', 'Admin', 'User', 'ACTIVE', true, true, NOW(), NOW());

-- Assign admin role
INSERT INTO user_roles (id, user_id, role_id, assigned_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'admin@test.com'),
  (SELECT id FROM roles WHERE name = 'admin'),
  NOW();
```

### Test 2: Verify Role Assignment

```bash
# Get JWT token from Auth Service
TOKEN="your-jwt-token-here"

# List all roles
curl -X GET "http://localhost:3001/roles" \
  -H "Authorization: Bearer $TOKEN"

# Get specific role
curl -X GET "http://localhost:3001/roles/{role-id}" \
  -H "Authorization: Bearer $TOKEN"
```

### Test 3: Create a Custom Role

```bash
curl -X POST "http://localhost:3001/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "content_moderator",
    "displayName": "Content Moderator",
    "description": "Moderates user-generated content",
    "permissionIds": []
  }'
```

### Test 4: Assign Permissions to Role

```bash
curl -X POST "http://localhost:3001/roles/{role-id}/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionIds": [
      "{permission-id-1}",
      "{permission-id-2}"
    ]
  }'
```

## Step 5: Verify Guards are Working

### Test Protected Endpoint

```typescript
// In your controller
@Get('admin-only')
@Roles('admin')
async adminEndpoint() {
  return { message: 'Admin access granted' };
}

@Get('permission-required')
@Permissions('users:write')
async permissionEndpoint() {
  return { message: 'Permission granted' };
}
```

### Test Access

```bash
# Should succeed for admin users
curl -X GET "http://localhost:3001/users/admin-only" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Should fail for regular users
curl -X GET "http://localhost:3001/users/admin-only" \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Step 6: Monitor and Verify

### Check Database

```sql
-- Verify roles created
SELECT * FROM roles;

-- Verify permissions created
SELECT * FROM permissions;

-- Verify role-permission assignments
SELECT
  r.name as role_name,
  p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id;

-- Verify user role assignments
SELECT
  u.email,
  r.name as role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id;
```

### Check Application Logs

```bash
# Start the service
npm run serve

# Watch for logs
# Look for:
# - "Creating role: ..."
# - "User {id} authorized with roles: ..."
# - "Permission check passed for user {id}"
```

## Common Issues and Solutions

### Issue: Prisma Client Not Found

```bash
# Solution: Generate Prisma client
npx prisma generate
```

### Issue: Migration Failed

```bash
# Solution: Reset database and rerun
npx prisma migrate reset
npx prisma migrate dev --name add_rbac_sessions
```

### Issue: Guards Not Protecting Routes

```typescript
// Solution: Ensure guards are registered
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class YourController { }
```

### Issue: Permission Denied Despite Correct Role

```bash
# Solution: Clear cache
# In your code:
await cacheService.delete(`user:${userId}:permissions`);
```

### Issue: Cannot Create System Role

```typescript
// Solution: Don't set isSystem=true for custom roles
{
  name: 'my_custom_role',
  // isSystem: false (default)
}
```

## Development Workflow

### 1. Add New Permission

```sql
INSERT INTO permissions (id, name, display_name, resource, action, category, scope, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'posts:publish', 'Publish Posts', 'posts', 'publish', 'Content Management', 'GLOBAL', true, NOW(), NOW());
```

### 2. Assign to Role

```sql
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM roles WHERE name = 'editor'),
  (SELECT id FROM permissions WHERE name = 'posts:publish'),
  NOW()
);
```

### 3. Protect Route

```typescript
@Post('publish')
@Permissions('posts:publish')
async publishPost(@Body() dto: PublishPostDto) {
  return this.postsService.publish(dto);
}
```

## Next Steps

1. **Complete Remaining Controllers**:
   - PermissionsController
   - SessionsController
   - SecurityController

2. **Implement SecurityService**:
   - Password change
   - Email verification
   - 2FA operations

3. **Add Tests**:
   - Unit tests for services
   - Integration tests for controllers
   - E2E tests for flows

4. **Integration**:
   - Connect with Auth Service
   - Update login flow to create sessions
   - Add session validation middleware

5. **Monitoring**:
   - Add metrics collection
   - Set up alerts
   - Configure audit logging

## Useful Commands

```bash
# Generate Prisma types
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# View database in Prisma Studio
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Format schema
npx prisma format

# Validate schema
npx prisma validate
```

## Resources

- [Implementation Details](./RBAC_SESSION_IMPLEMENTATION.md)
- [Usage Guide](./RBAC_USAGE_GUIDE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Guards](https://docs.nestjs.com/guards)

## Support

For questions or issues:
1. Check the documentation files
2. Review the implementation code
3. Check application logs
4. Verify database state
5. Test with curl/Postman

---

**Happy Coding!** 🚀
