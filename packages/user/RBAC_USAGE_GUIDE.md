# RBAC and Session Management - Usage Guide

## Quick Start

### 1. Database Setup

```bash
# Navigate to user service
cd packages/user

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_rbac_sessions

# Seed initial data (roles and permissions)
npm run seed
```

### 2. Using Role-Based Access Control

#### Protecting Routes with Roles

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles } from './decorators/roles.decorator';

@Controller('admin')
export class AdminController {
  // Only users with 'admin' role can access
  @Get('dashboard')
  @Roles('admin')
  getDashboard() {
    return { message: 'Admin dashboard' };
  }

  // Users with either 'admin' or 'moderator' role can access
  @Get('moderation')
  @Roles('admin', 'moderator')
  getModerationPanel() {
    return { message: 'Moderation panel' };
  }
}
```

#### Protecting Routes with Permissions

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { Permissions } from './decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  // User needs 'users:read' permission
  @Get()
  @Permissions('users:read')
  listUsers() {
    return [];
  }

  // User needs 'users:write' permission
  @Post()
  @Permissions('users:write')
  createUser() {
    return { id: '123' };
  }

  // User needs EITHER 'users:read' OR 'users:write'
  @Get('stats')
  @Permissions('users:read', 'users:write')
  getUserStats() {
    return { total: 100 };
  }

  // User needs BOTH permissions (requireAll: true)
  @Post('bulk-update')
  @Permissions('users:write', 'users:manage', { requireAll: true })
  bulkUpdate() {
    return { updated: 10 };
  }
}
```

#### Combining Roles and Permissions

```typescript
@Controller('sensitive')
export class SensitiveController {
  // User must have admin role AND the specific permission
  @Post('critical-operation')
  @Roles('admin')
  @Permissions('system:manage')
  criticalOperation() {
    return { success: true };
  }
}
```

### 3. Programmatic Permission Checking

#### Check User Roles

```typescript
import { Injectable } from '@nestjs/common';
import { RoleService } from './services/role.service';

@Injectable()
export class MyService {
  constructor(private readonly roleService: RoleService) {}

  async checkUserAccess(userId: string) {
    // Check if user has specific role
    const isAdmin = await this.roleService.userHasRole(userId, 'admin');

    // Check if user has any of the roles
    const isModerator = await this.roleService.userHasAnyRole(
      userId,
      ['admin', 'moderator', 'support']
    );

    // Get all user's roles
    const roles = await this.roleService.getUserRoles(userId);

    return { isAdmin, isModerator, roles };
  }
}
```

#### Check User Permissions

```typescript
import { Injectable } from '@nestjs/common';
import { PermissionService } from './services/permission.service';

@Injectable()
export class MyService {
  constructor(private readonly permissionService: PermissionService) {}

  async checkUserPermissions(userId: string) {
    // Check specific permission
    const canReadUsers = await this.permissionService.userHasPermission(
      userId,
      'users:read'
    );

    // Check resource permission
    const canWritePosts = await this.permissionService.userHasResourcePermission(
      userId,
      'posts',
      'write'
    );

    // Check if user has ANY of these permissions
    const hasAnyPermission = await this.permissionService.userHasAnyPermission(
      userId,
      ['users:read', 'users:write', 'users:delete']
    );

    // Check if user has ALL of these permissions
    const hasAllPermissions = await this.permissionService.userHasAllPermissions(
      userId,
      ['posts:read', 'posts:write']
    );

    // Get all user's effective permissions (from all their roles)
    const permissions = await this.permissionService.getUserPermissions(userId);

    return { canReadUsers, canWritePosts, permissions };
  }
}
```

### 4. Managing Sessions

#### Creating a Session (On Login)

```typescript
import { Injectable } from '@nestjs/common';
import { SessionService } from './services/session.service';
import { DeviceType } from './dto';

@Injectable()
export class AuthService {
  constructor(private readonly sessionService: SessionService) {}

  async createSession(userId: string, token: string, req: Request) {
    const session = await this.sessionService.create({
      userId,
      token,
      refreshToken: 'refresh-token-here',
      deviceName: this.extractDeviceName(req.headers['user-agent']),
      deviceType: DeviceType.DESKTOP,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    return session;
  }
}
```

#### Validating a Session

```typescript
async validateRequest(token: string) {
  try {
    // Validate session and update activity
    const session = await this.sessionService.validateSession(token);

    // Session is valid
    return { valid: true, userId: session.userId };
  } catch (error) {
    // Session is invalid, expired, or inactive
    return { valid: false, error: error.message };
  }
}
```

#### Listing User Sessions

```typescript
async getUserSessions(userId: string) {
  // Get only active sessions
  const activeSessions = await this.sessionService.findUserSessions(userId);

  // Get all sessions (including inactive)
  const allSessions = await this.sessionService.findUserSessions(userId, true);

  return { activeSessions, allSessions };
}
```

#### Terminating Sessions

```typescript
async logout(userId: string, sessionId: string) {
  // Logout from current device
  await this.sessionService.terminate(sessionId, userId);
}

async logoutAll(userId: string, currentSessionId?: string) {
  // Logout from all devices (optionally keeping current session)
  const count = await this.sessionService.terminateAllUserSessions(
    userId,
    currentSessionId
  );

  return { terminatedSessions: count };
}
```

#### Refreshing a Session

```typescript
async refreshSession(refreshToken: string) {
  const newToken = 'new-jwt-token';
  const newRefreshToken = 'new-refresh-token';
  const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await this.sessionService.refreshSession(
    refreshToken,
    newToken,
    newRefreshToken,
    newExpiresAt
  );

  return session;
}
```

### 5. Managing Roles and Permissions

#### Creating Roles

```typescript
// Create a role with permissions
const role = await roleService.create({
  name: 'content_moderator',
  displayName: 'Content Moderator',
  description: 'Moderates user-generated content',
  permissionIds: [
    'permission-id-1',
    'permission-id-2'
  ]
});
```

#### Creating Permissions

```typescript
// Create a permission
const permission = await permissionService.create({
  resource: 'posts',
  action: 'write',
  displayName: 'Write Posts',
  description: 'Create and edit posts'
});

// Permission name is automatically generated as 'posts:write'
```

#### Assigning Roles to Users

```typescript
// This would be in a UserRoleService (to be implemented)
await prisma.userRole.create({
  data: {
    userId: 'user-id',
    roleId: 'role-id',
    assignedBy: 'admin-user-id'
  }
});
```

#### Assigning Permissions to Roles

```typescript
await roleService.assignPermissions('role-id', {
  permissionIds: [
    'permission-1',
    'permission-2',
    'permission-3'
  ]
});
```

### 6. Common Permission Patterns

#### Standard Permission Naming

```
Resource:Action format:
- users:read - View users
- users:write - Create/update users
- users:delete - Delete users
- users:manage - Full user management

- posts:read - View posts
- posts:write - Create/edit posts
- posts:delete - Delete posts
- posts:publish - Publish posts

- settings:read - View settings
- settings:write - Modify settings

- analytics:read - View analytics
- reports:read - View reports
- reports:export - Export reports
```

#### Hierarchical Roles

```typescript
// Admin (highest level)
{
  name: 'admin',
  permissions: ['*:*'] // All permissions
}

// Manager
{
  name: 'manager',
  permissions: [
    'users:read',
    'users:write',
    'posts:manage',
    'reports:read'
  ]
}

// User (lowest level)
{
  name: 'user',
  permissions: [
    'posts:read',
    'posts:write' // Can only write own posts
  ]
}
```

### 7. Best Practices

#### 1. Use Granular Permissions

Instead of:
```typescript
@Roles('admin') // Too broad
```

Prefer:
```typescript
@Permissions('users:delete') // Specific permission
```

#### 2. Combine Guards Appropriately

```typescript
// Require admin role AND specific permission
@Roles('admin')
@Permissions('system:critical')
async criticalOperation() { }
```

#### 3. Cache Permission Checks

The services already cache permission lookups. Avoid redundant checks:

```typescript
// Bad - checks twice
if (await this.permissionService.userHasPermission(userId, 'users:read')) {
  if (await this.permissionService.userHasPermission(userId, 'users:read')) {
    // ...
  }
}

// Good - check once
const canRead = await this.permissionService.userHasPermission(userId, 'users:read');
if (canRead) {
  // ...
}
```

#### 4. Use System Roles for Core Functionality

Mark core roles as system roles:
```typescript
{
  name: 'admin',
  isSystem: true // Cannot be deleted or modified
}
```

#### 5. Session Management

```typescript
// Update session activity on each request (middleware handles this)
// Clean up expired sessions regularly (scheduled job)
// Implement "remember me" with longer session expiry
// Track suspicious login patterns (multiple IPs, devices)
```

### 8. Testing Your RBAC Setup

```typescript
import { Test } from '@nestjs/testing';
import { RoleService } from './services/role.service';

describe('RBAC Integration', () => {
  let roleService: RoleService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RoleService, /* ... */],
    }).compile();

    roleService = module.get<RoleService>(RoleService);
  });

  it('should check user has admin role', async () => {
    const hasRole = await roleService.userHasRole('user-id', 'admin');
    expect(hasRole).toBe(true);
  });

  it('should check user permissions', async () => {
    const permissions = await permissionService.getUserPermissions('user-id');
    expect(permissions).toContainEqual(
      expect.objectContaining({ name: 'users:read' })
    );
  });
});
```

## Error Handling

### Common Errors

1. **403 Forbidden - Insufficient Permissions**
```json
{
  "statusCode": 403,
  "message": "Access denied. Required permissions: users:write",
  "error": "Forbidden"
}
```

2. **401 Unauthorized - Not Authenticated**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

3. **404 Not Found - Role/Permission Not Found**
```json
{
  "statusCode": 404,
  "message": "Role with ID abc-123 not found",
  "error": "Not Found"
}
```

4. **409 Conflict - Role Already Exists**
```json
{
  "statusCode": 409,
  "message": "Role with name 'admin' already exists",
  "error": "Conflict"
}
```

## API Examples

### Create a Role
```bash
curl -X POST http://localhost:3001/roles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "content_moderator",
    "displayName": "Content Moderator",
    "description": "Moderates user content",
    "permissionIds": ["perm-1", "perm-2"]
  }'
```

### List Roles
```bash
curl -X GET "http://localhost:3001/roles?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Assign Permissions to Role
```bash
curl -X POST http://localhost:3001/roles/role-id/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionIds": ["perm-1", "perm-2", "perm-3"]
  }'
```

### List User Sessions
```bash
curl -X GET http://localhost:3001/users/user-id/sessions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Terminate Session
```bash
curl -X DELETE http://localhost:3001/users/user-id/sessions/session-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Issue: Permission checks failing despite correct roles

**Solution**: Clear the permission cache
```typescript
await cacheService.delete(`user:${userId}:permissions`);
```

### Issue: System role cannot be modified

**Solution**: This is by design. System roles are protected. Create a custom role instead.

### Issue: Session expired but user is still logged in

**Solution**: Implement session validation middleware to check expiry on each request.

### Issue: Performance degradation with permission checks

**Solution**:
1. Ensure caching is enabled
2. Check database indexes are created
3. Use `userHasAnyPermission` instead of multiple individual checks
4. Increase cache TTL for permissions

## Migration from Simple Auth

If migrating from a simple authentication system:

1. **Assign default role to existing users**:
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT id, 'default-role-id' FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = users.id
);
```

2. **Create permissions for existing routes**:
```typescript
// Map your existing route protection logic to permissions
await permissionService.create({
  resource: 'users',
  action: 'read',
  displayName: 'View Users'
});
```

3. **Update guards in controllers**:
```typescript
// Before
@UseGuards(AuthGuard)

// After
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Permissions('resource:action')
```

## Additional Resources

- [Prisma Schema Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [RBAC Best Practices](https://auth0.com/docs/manage-users/access-control/rbac)
