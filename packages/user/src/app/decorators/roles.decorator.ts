import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator for protecting routes with role-based access control
 * @param roles - Array of role names required to access the route
 * @example
 * @Roles('admin', 'moderator')
 * async adminOnlyEndpoint() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
