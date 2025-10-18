import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// Controllers
import { UsersController } from './controllers/users.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';

// Services
import { UserManagementService } from './services/user-management.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { AuthIntegrationService } from './services/auth-integration.service';

/**
 * User Management Module
 *
 * Provides functionality for managing users, roles, and permissions
 * with integration to the auth service.
 */
@Module({
  imports: [HttpModule],
  controllers: [UsersController, RolesController, PermissionsController],
  providers: [
    UserManagementService,
    RoleService,
    PermissionService,
    AuthIntegrationService,
  ],
  exports: [
    UserManagementService,
    RoleService,
    PermissionService,
    AuthIntegrationService,
  ],
})
export class UserManagementModule {}