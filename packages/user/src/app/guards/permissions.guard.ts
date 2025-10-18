import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, REQUIRE_ALL_PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get user from request (added by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      this.logger.warn('User not authenticated - should be caught by JwtAuthGuard');
      throw new ForbiddenException('User not authenticated');
    }

    // Check if ALL permissions are required or just ANY
    const requireAll = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ALL_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    ) || false;

    // Check user permissions
    const hasPermission = requireAll
      ? await this.permissionService.userHasAllPermissions(user.id, requiredPermissions)
      : await this.permissionService.userHasAnyPermission(user.id, requiredPermissions);

    if (!hasPermission) {
      this.logger.warn(
        `User ${user.id} attempted to access resource requiring permissions: ${requiredPermissions.join(', ')} (requireAll: ${requireAll})`
      );
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
      );
    }

    this.logger.debug(
      `User ${user.id} authorized with permissions: ${requiredPermissions.join(', ')}`
    );
    return true;
  }
}
