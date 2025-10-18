import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_ALL_PERMISSIONS_KEY = 'requireAllPermissions';

/**
 * Permissions decorator for protecting routes with permission-based access control
 * @param permissions - Array of permission names required to access the route
 * @param requireAll - If true, user must have ALL permissions. If false, user needs ANY permission (default: false)
 * @example
 * @Permissions('users:read', 'users:write')
 * async userManagement() { ... }
 *
 * @Permissions('admin:manage', { requireAll: true })
 * async sensitiveOperation() { ... }
 */
export const Permissions = (
  ...permissionsOrOptions: [...string[], { requireAll?: boolean }] | string[]
) => {
  const lastArg = permissionsOrOptions[permissionsOrOptions.length - 1];
  const options = typeof lastArg === 'object' && !Array.isArray(lastArg) ? lastArg : { requireAll: false };
  const permissions = typeof lastArg === 'object' && !Array.isArray(lastArg)
    ? permissionsOrOptions.slice(0, -1) as string[]
    : permissionsOrOptions as string[];

  return (target: unknown, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey, descriptor);
    SetMetadata(REQUIRE_ALL_PERMISSIONS_KEY, options.requireAll)(target, propertyKey, descriptor);
  };
};
