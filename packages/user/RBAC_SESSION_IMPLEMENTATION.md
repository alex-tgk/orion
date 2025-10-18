# User Service - RBAC and Session Management Implementation

## Overview
This document outlines the comprehensive Role-Based Access Control (RBAC) and Session Management implementation for the ORION User Service.

## Completed Components

### 1. Database Schema (Prisma)
**File**: `prisma/schema.prisma`

The schema has been significantly enhanced with:

#### Core Models:
- **User**: Enhanced with status tracking, verification, login metrics
- **UserPreferences**: Extended with security, communication, and accessibility settings
- **Role**: Hierarchical roles with system/custom types and permission scoping
- **Permission**: Granular permissions with resource-action-scope model
- **Session**: Comprehensive session tracking with device info and location
- **TwoFactorAuth**: TOTP-based 2FA with backup codes
- **EmailVerification**: Email change verification tokens
- **PasswordReset**: Secure password reset tokens
- **AuditLog**: Complete audit trail for user actions
- **ApiKey**: Service-to-service authentication

#### Junction Tables:
- **UserRole**: User-role assignments with expiration and conditions
- **RolePermission**: Role-permission mappings
- **UserPermission**: Direct permission grants (bypass roles)

#### Key Features:
- Hierarchical role system with parent-child relationships
- Permission scoping (GLOBAL, ORG, TEAM, USER)
- Session status tracking (ACTIVE, EXPIRED, REVOKED, LOGGED_OUT)
- Comprehensive indexing for performance
- Soft deletes with `deletedAt` timestamps
- Metadata and tags for extensibility

### 2. Data Transfer Objects (DTOs)

#### Role DTOs (`dto/role.dto.ts`):
- `RoleDto`: Complete role information with permissions
- `CreateRoleDto`: Create new role with initial permissions
- `UpdateRoleDto`: Update role metadata
- `AssignPermissionsDto`: Bulk permission assignment
- `ListRolesResponseDto`: Paginated role listing

#### Permission DTOs (`dto/permission.dto.ts`):
- `PermissionDto`: Permission details
- `CreatePermissionDto`: Create permission with resource-action
- `ListPermissionsResponseDto`: Paginated permissions
- `GroupedPermissionsDto`: Permissions grouped by resource

#### Session DTOs (`dto/session.dto.ts`):
- `SessionDto`: Complete session information
- `CreateSessionDto`: Create new session on login
- `ListSessionsResponseDto`: User's active sessions
- `SessionActivityDto`: Update session activity
- `DeviceType` enum: MOBILE, DESKTOP, TABLET, UNKNOWN

#### Security DTOs (`dto/security.dto.ts`):
- **Password Management**:
  - `ChangePasswordDto`: Change password with current verification
  - `ResetPasswordRequestDto`: Request password reset
  - `ResetPasswordDto`: Complete password reset

- **Email Verification**:
  - `VerifyEmailDto`: Verify email with token
  - `RequestEmailVerificationDto`: Request new verification
  - `EmailVerificationResponseDto`: Verification response

- **Two-Factor Authentication**:
  - `TwoFactorAuthDto`: 2FA status and setup data
  - `Enable2FADto`: Enable 2FA with TOTP verification
  - `Disable2FADto`: Disable 2FA with password verification
  - `Verify2FADto`: Verify 2FA code
  - `RegenerateBackupCodesDto`: Generate new backup codes
  - `BackupCodesResponseDto`: Return backup codes

- **Account Security**:
  - `AccountSecurityDto`: Overall security status

### 3. Services

#### Role Service (`services/role.service.ts`)
Production-ready RBAC role management:

**Features**:
- Create, read, update, delete roles
- System role protection (cannot be modified/deleted)
- Permission assignment and removal
- User role checking (single role, multiple roles)
- Validation of permission existence
- Caching layer for performance
- Event publishing for audit trails

**Key Methods**:
```typescript
async create(createDto: CreateRoleDto): Promise<RoleDto>
async findById(roleId: string): Promise<RoleDto>
async findByName(name: string): Promise<RoleDto>
async findAll(page, pageSize): Promise<ListRolesResponseDto>
async update(roleId, updateDto): Promise<RoleDto>
async delete(roleId: string): Promise<void>
async assignPermissions(roleId, assignDto): Promise<RoleDto>
async removePermission(roleId, permissionId): Promise<RoleDto>
async getUserRoles(userId: string): Promise<RoleDto[]>
async userHasRole(userId, roleName): Promise<boolean>
async userHasAnyRole(userId, roleNames): Promise<boolean>
```

**Business Rules**:
- System roles cannot be modified or deleted
- Roles with user assignments cannot be deleted
- Permission validation before assignment
- Cache invalidation on updates
- Event publishing for audit

#### Permission Service (`services/permission.service.ts`)
Granular permission management:

**Features**:
- Create, read, delete permissions
- Resource-action permission model
- Grouped permissions by resource
- User permission checking (effective permissions from all roles)
- Support for ANY or ALL permission checks
- Caching layer for performance

**Key Methods**:
```typescript
async create(createDto: CreatePermissionDto): Promise<PermissionDto>
async findById(permissionId: string): Promise<PermissionDto>
async findByName(name: string): Promise<PermissionDto>
async findAll(page, pageSize): Promise<ListPermissionsResponseDto>
async findByResource(resource: string): Promise<PermissionDto[]>
async findGroupedByResource(): Promise<GroupedPermissionsDto[]>
async delete(permissionId: string): Promise<void>
async getUserPermissions(userId: string): Promise<PermissionDto[]>
async userHasPermission(userId, permissionName): Promise<boolean>
async userHasResourcePermission(userId, resource, action): Promise<boolean>
async userHasAnyPermission(userId, permissionNames): Promise<boolean>
async userHasAllPermissions(userId, permissionNames): Promise<boolean>
```

**Business Rules**:
- Unique constraint on resource+action+scope combination
- Permissions with role assignments cannot be deleted
- Automatic permission name generation (resource:action)
- Effective permissions cached per user
- Cache invalidation when user roles change

#### Session Service (`services/session.service.ts`)
Comprehensive session lifecycle management:

**Features**:
- Session creation on login with device tracking
- Token-based session validation
- Multi-device support per user
- Session refresh with new tokens
- Individual and bulk session termination
- Activity tracking and session expiry
- Expired session cleanup
- Session statistics

**Key Methods**:
```typescript
async create(createDto: CreateSessionDto): Promise<SessionDto>
async findById(sessionId: string): Promise<SessionDto>
async findByToken(token: string): Promise<SessionDto>
async findUserSessions(userId, includeInactive): Promise<ListSessionsResponseDto>
async updateActivity(sessionId: string): Promise<void>
async refreshSession(refreshToken, newToken, newRefreshToken, newExpiresAt): Promise<SessionDto>
async terminate(sessionId, userId): Promise<void>
async terminateAllUserSessions(userId, exceptSessionId?): Promise<number>
async cleanupExpiredSessions(): Promise<number>
async validateSession(token: string): Promise<SessionDto>
async getUserSessionStats(userId): Promise<SessionStats>
```

**Business Rules**:
- Session validation checks active status and expiration
- Users can only terminate their own sessions
- Activity timestamp updated on each request
- Expired sessions automatically marked inactive
- Support for "logout all other devices"
- Device information tracking (type, name, IP, user agent)

### 4. Decorators

#### @Roles Decorator (`decorators/roles.decorator.ts`)
```typescript
@Roles('admin', 'moderator')
async adminEndpoint() { ... }
```

#### @Permissions Decorator (`decorators/permissions.decorator.ts`)
```typescript
// User needs ANY of these permissions
@Permissions('users:read', 'users:write')
async userManagement() { ... }

// User needs ALL of these permissions
@Permissions('admin:manage', { requireAll: true })
async criticalOperation() { ... }
```

### 5. Guards

#### RolesGuard (`guards/roles.guard.ts`)
- Checks if user has required roles
- Supports multiple roles (ANY match)
- Integration with RoleService
- Detailed logging for audit
- Proper error messages

#### PermissionsGuard (`guards/permissions.guard.ts`)
- Checks if user has required permissions
- Supports ANY or ALL permission matching
- Integration with PermissionService
- Effective permissions from all roles
- Detailed logging for audit

### 6. Controllers

#### RolesController (`controllers/roles.controller.ts`)
RESTful API for role management:

**Endpoints**:
- `POST /roles` - Create role (admin only)
- `GET /roles` - List roles with pagination
- `GET /roles/:id` - Get role details
- `PUT /roles/:id` - Update role (admin only)
- `DELETE /roles/:id` - Delete role (admin only)
- `POST /roles/:id/permissions` - Assign permissions (admin only)
- `DELETE /roles/:id/permissions/:permissionId` - Remove permission (admin only)

**Features**:
- Role-based and permission-based protection
- Rate limiting on mutations
- Comprehensive Swagger documentation
- Input validation via DTOs
- Proper HTTP status codes

## Remaining Implementation Tasks

### 1. Controllers (To Be Completed)

#### PermissionsController
```typescript
POST /permissions - Create permission (admin only)
GET /permissions - List all permissions
GET /permissions/grouped - Get permissions grouped by resource
GET /permissions/:id - Get permission details
DELETE /permissions/:id - Delete permission (admin only)
```

#### SessionsController
```typescript
GET /users/:userId/sessions - List user sessions
POST /users/:userId/sessions/:sessionId/terminate - Terminate session
POST /users/:userId/sessions/terminate-all - Logout all devices
GET /users/:userId/sessions/stats - Session statistics
```

#### SecurityController
```typescript
// Password Management
POST /security/password/change - Change password
POST /security/password/reset - Request password reset
POST /security/password/reset/confirm - Complete password reset

// Email Verification
POST /security/email/verify - Verify email
POST /security/email/verification/request - Request verification

// Two-Factor Authentication
GET /security/2fa - Get 2FA status
POST /security/2fa/enable - Enable 2FA
POST /security/2fa/disable - Disable 2FA
POST /security/2fa/verify - Verify 2FA code
POST /security/2fa/backup-codes - Regenerate backup codes

// Account Security Status
GET /security/status - Get overall security status
```

### 2. Enhanced User Management Endpoints

Add to existing `UsersController`:
```typescript
GET /users - List all users (admin only, with pagination and filters)
POST /users/:id/roles - Assign role to user (admin only)
DELETE /users/:id/roles/:roleId - Remove role from user (admin only)
GET /users/:id/permissions - Get user's effective permissions
GET /users/:id/sessions - Get user's active sessions
```

### 3. Additional Services

#### SecurityService
Handle password changes, email verification, 2FA operations:
```typescript
async changePassword(userId, currentPassword, newPassword): Promise<void>
async requestPasswordReset(email): Promise<void>
async resetPassword(token, newPassword): Promise<void>
async requestEmailVerification(userId, newEmail): Promise<void>
async verifyEmail(token): Promise<void>
async enable2FA(userId): Promise<TwoFactorAuthDto>
async disable2FA(userId, password): Promise<void>
async verify2FACode(userId, code): Promise<boolean>
async regenerateBackupCodes(userId): Promise<string[]>
async getSecurityStatus(userId): Promise<AccountSecurityDto>
```

#### AuditService
Track all user actions for compliance:
```typescript
async log(action, userId, resource, resourceId, changes): Promise<void>
async getUserAuditLog(userId, page, pageSize): Promise<AuditLogDto[]>
async getResourceAuditLog(resource, resourceId): Promise<AuditLogDto[]>
```

### 4. Middleware

#### SessionActivityMiddleware
Update session activity on each request:
```typescript
@Injectable()
export class SessionActivityMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    if (req.user && req.user.sessionId) {
      await this.sessionService.updateActivity(req.user.sessionId);
    }
    next();
  }
}
```

### 5. Scheduled Tasks (Cron Jobs)

```typescript
@Cron('0 */6 * * *') // Every 6 hours
async cleanupExpiredSessions() {
  await this.sessionService.cleanupExpiredSessions();
}

@Cron('0 0 * * *') // Daily
async cleanupExpiredTokens() {
  await this.securityService.cleanupExpiredPasswordResets();
  await this.securityService.cleanupExpiredEmailVerifications();
}
```

### 6. Integration with Auth Service

The Auth Service needs to:
1. Call User Service to create session on successful login
2. Validate session tokens on protected requests
3. Support session refresh flow
4. Terminate sessions on logout
5. Publish events for user lifecycle (registration, login, logout)

### 7. Module Updates

Update `app.module.ts` to include:
```typescript
imports: [
  // ... existing imports
],
controllers: [
  UsersController,
  HealthController,
  RolesController,
  PermissionsController,
  SessionsController,
  SecurityController,
],
providers: [
  // ... existing providers
  RoleService,
  PermissionService,
  SessionService,
  SecurityService,
  AuditService,
  RolesGuard,
  PermissionsGuard,
],
```

### 8. Database Migration

Generate and run Prisma migration:
```bash
cd packages/user
npx prisma migrate dev --name add_rbac_and_sessions
npx prisma generate
```

### 9. Seeding

Create seed data for:
- System roles (admin, user, moderator)
- Base permissions (users:read, users:write, etc.)
- Default admin user with admin role

### 10. Testing

Required test coverage:
- Unit tests for all services
- Integration tests for controllers
- E2E tests for critical flows
- Permission checking scenarios
- Session lifecycle tests
- 2FA flow tests

## Security Considerations

1. **Password Management**:
   - Minimum 8 characters with complexity requirements
   - Password hashing via bcrypt (handled by Auth Service)
   - Password reset tokens expire after 1 hour
   - Limit failed login attempts

2. **Session Security**:
   - Secure token generation
   - Session expiration enforcement
   - IP and user agent tracking
   - Support for session revocation
   - Protection against session fixation

3. **Two-Factor Authentication**:
   - TOTP-based implementation
   - Encrypted backup codes
   - Rate limiting on verification attempts
   - Secure secret storage

4. **RBAC Security**:
   - System roles cannot be modified
   - Permission checks before all protected operations
   - Audit logging of role/permission changes
   - Least privilege principle

5. **API Security**:
   - JWT authentication on all endpoints (except health)
   - Rate limiting on mutation endpoints
   - Input validation via DTOs
   - SQL injection protection via Prisma

## Performance Optimizations

1. **Caching Strategy**:
   - User permissions cached with 10-minute TTL
   - Roles cached with 10-minute TTL
   - Sessions cached with 5-minute TTL
   - Cache invalidation on updates

2. **Database Indexes**:
   - Comprehensive indexes on all foreign keys
   - Composite indexes for common queries
   - Indexes on frequently filtered fields

3. **Query Optimization**:
   - Selective field retrieval
   - Pagination on list endpoints
   - Batch operations where applicable
   - Connection pooling via Prisma

## Monitoring and Observability

1. **Logging**:
   - Structured logging via NestJS Logger
   - Request/response logging
   - Error logging with stack traces
   - Audit logging of security events

2. **Metrics**:
   - Active session count
   - Failed login attempts
   - Permission check latency
   - API endpoint usage

3. **Alerts**:
   - Excessive failed logins
   - Unusual session patterns
   - Permission denied spikes
   - System role modification attempts

## Next Steps

1. Complete remaining controllers (Permissions, Sessions, Security)
2. Implement SecurityService for password and 2FA operations
3. Add AuditService for comprehensive audit logging
4. Create database migration and seed data
5. Implement session activity middleware
6. Add scheduled tasks for cleanup
7. Write comprehensive tests
8. Update API documentation
9. Integration testing with Auth Service
10. Performance testing and optimization

## API Documentation

Once complete, Swagger documentation will be available at:
```
http://localhost:3001/api
```

All endpoints include:
- Detailed descriptions
- Request/response schemas
- Authentication requirements
- Example payloads
- Error responses
