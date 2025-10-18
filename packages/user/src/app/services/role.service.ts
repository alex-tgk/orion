import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { Role, RolePermission } from '@prisma/client';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleDto,
  AssignPermissionsDto,
  ListRolesResponseDto,
} from '../dto';
import { CacheService } from './cache.service';
import { EventPublisherService } from './event-publisher.service';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);
  private readonly CACHE_TTL = 600; // 10 minutes - roles change infrequently

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Create a new role
   */
  async create(createDto: CreateRoleDto): Promise<RoleDto> {
    this.logger.log(`Creating new role: ${createDto.name}`);

    // Check if role with same name already exists
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createDto.name },
    });

    if (existingRole) {
      throw new ConflictException(`Role with name '${createDto.name}' already exists`);
    }

    // Validate permissions if provided
    if (createDto.permissionIds && createDto.permissionIds.length > 0) {
      await this.validatePermissions(createDto.permissionIds);
    }

    // Create role
    const role = await this.prisma.role.create({
      data: {
        name: createDto.name,
        displayName: createDto.displayName,
        description: createDto.description,
        permissions: createDto.permissionIds
          ? {
              create: createDto.permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    const roleDto = this.mapToDto(role);

    // Publish event
    await this.eventPublisher.publish('role.created', {
      roleId: role.id,
      name: role.name,
      createdBy: 'system', // TODO: Add authenticated user context
    });

    this.logger.log(`Role created successfully: ${role.id}`);
    return roleDto;
  }

  /**
   * Get role by ID
   */
  async findById(roleId: string): Promise<RoleDto> {
    const cacheKey = `role:${roleId}`;
    const cached = await this.cache.get<RoleDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for role ${roleId}`);
      return cached;
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const roleDto = this.mapToDto(role);
    await this.cache.set(cacheKey, roleDto, this.CACHE_TTL);

    return roleDto;
  }

  /**
   * Get role by name
   */
  async findByName(name: string): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { name },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with name '${name}' not found`);
    }

    return this.mapToDto(role);
  }

  /**
   * List all roles with pagination
   */
  async findAll(page = 1, pageSize = 20): Promise<ListRolesResponseDto> {
    const skip = (page - 1) * pageSize;

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take: pageSize,
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.role.count(),
    ]);

    return {
      roles: roles.map((role) => this.mapToDto(role)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Update role
   */
  async update(roleId: string, updateDto: UpdateRoleDto): Promise<RoleDto> {
    this.logger.log(`Updating role: ${roleId}`);

    // Check if role exists
    const existingRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // System roles cannot be modified
    if (existingRole.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    // Update role
    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data: updateDto,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    const roleDto = this.mapToDto(updatedRole);

    // Invalidate cache
    await this.cache.delete(`role:${roleId}`);

    // Publish event
    await this.eventPublisher.publish('role.updated', {
      roleId,
      changes: Object.keys(updateDto),
    });

    this.logger.log(`Role updated successfully: ${roleId}`);
    return roleDto;
  }

  /**
   * Delete role
   */
  async delete(roleId: string): Promise<void> {
    this.logger.log(`Deleting role: ${roleId}`);

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        userRoles: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // System roles cannot be deleted
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Check if role is assigned to any users
    if (role.userRoles.length > 0) {
      throw new BadRequestException(
        `Cannot delete role as it is assigned to ${role.userRoles.length} user(s). Remove all assignments first.`
      );
    }

    // Delete role (cascades to role_permissions)
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    // Invalidate cache
    await this.cache.delete(`role:${roleId}`);

    // Publish event
    await this.eventPublisher.publish('role.deleted', {
      roleId,
      name: role.name,
    });

    this.logger.log(`Role deleted successfully: ${roleId}`);
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(roleId: string, assignDto: AssignPermissionsDto): Promise<RoleDto> {
    this.logger.log(`Assigning permissions to role: ${roleId}`);

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // System roles permissions cannot be modified
    if (role.isSystem) {
      throw new BadRequestException('System role permissions cannot be modified');
    }

    // Validate permissions exist
    await this.validatePermissions(assignDto.permissionIds);

    // Remove existing permissions and add new ones (replace operation)
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      this.prisma.rolePermission.createMany({
        data: assignDto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);

    // Invalidate cache
    await this.cache.delete(`role:${roleId}`);

    // Publish event
    await this.eventPublisher.publish('role.permissions.updated', {
      roleId,
      permissionIds: assignDto.permissionIds,
    });

    this.logger.log(`Permissions assigned to role: ${roleId}`);
    return this.findById(roleId);
  }

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string): Promise<RoleDto> {
    this.logger.log(`Removing permission ${permissionId} from role ${roleId}`);

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // System roles permissions cannot be modified
    if (role.isSystem) {
      throw new BadRequestException('System role permissions cannot be modified');
    }

    // Remove permission
    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId,
      },
    });

    // Invalidate cache
    await this.cache.delete(`role:${roleId}`);

    // Publish event
    await this.eventPublisher.publish('role.permission.removed', {
      roleId,
      permissionId,
    });

    this.logger.log(`Permission removed from role: ${roleId}`);
    return this.findById(roleId);
  }

  /**
   * Get user's roles with permissions
   */
  async getUserRoles(userId: string): Promise<RoleDto[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return userRoles.map((ur) => this.mapToDto(ur.role));
  }

  /**
   * Check if user has specific role
   */
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: roleName,
        },
      },
    });

    return !!userRole;
  }

  /**
   * Check if user has any of the specified roles
   */
  async userHasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: {
            in: roleNames,
          },
        },
      },
    });

    return !!userRole;
  }

  /**
   * Validate that all permission IDs exist
   */
  private async validatePermissions(permissionIds: string[]): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
      },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = permissionIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `The following permission IDs do not exist: ${missingIds.join(', ')}`
      );
    }
  }

  /**
   * Map Prisma Role with relations to DTO
   */
  private mapToDto(
    role: Role & {
      permissions: Array<RolePermission & { permission: { id: string } }>;
    }
  ): RoleDto {
    return {
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description || undefined,
      isSystem: role.isSystem,
      permissionIds: role.permissions.map((rp) => rp.permission.id),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
