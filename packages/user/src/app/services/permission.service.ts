import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { Permission } from '@prisma/client';
import {
  CreatePermissionDto,
  PermissionDto,
  ListPermissionsResponseDto,
  GroupedPermissionsDto,
} from '../dto';
import { CacheService } from './cache.service';
import { EventPublisherService } from './event-publisher.service';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Create a new permission
   */
  async create(createDto: CreatePermissionDto): Promise<PermissionDto> {
    this.logger.log(`Creating new permission: ${createDto.resource}:${createDto.action}`);

    // Check if permission already exists for this resource+action combination
    const existing = await this.prisma.permission.findUnique({
      where: {
        resource_action: {
          resource: createDto.resource,
          action: createDto.action,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Permission '${createDto.resource}:${createDto.action}' already exists`
      );
    }

    // Generate permission name
    const name = `${createDto.resource}:${createDto.action}`;

    // Create permission
    const permission = await this.prisma.permission.create({
      data: {
        name,
        displayName: createDto.displayName,
        description: createDto.description,
        resource: createDto.resource,
        action: createDto.action,
      },
    });

    const permissionDto = this.mapToDto(permission);

    // Publish event
    await this.eventPublisher.publish('permission.created', {
      permissionId: permission.id,
      name: permission.name,
    });

    this.logger.log(`Permission created successfully: ${permission.id}`);
    return permissionDto;
  }

  /**
   * Get permission by ID
   */
  async findById(permissionId: string): Promise<PermissionDto> {
    const cacheKey = `permission:${permissionId}`;
    const cached = await this.cache.get<PermissionDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for permission ${permissionId}`);
      return cached;
    }

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    const permissionDto = this.mapToDto(permission);
    await this.cache.set(cacheKey, permissionDto, this.CACHE_TTL);

    return permissionDto;
  }

  /**
   * Get permission by name
   */
  async findByName(name: string): Promise<PermissionDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { name },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with name '${name}' not found`);
    }

    return this.mapToDto(permission);
  }

  /**
   * List all permissions with pagination
   */
  async findAll(page = 1, pageSize = 50): Promise<ListPermissionsResponseDto> {
    const skip = (page - 1) * pageSize;

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        skip,
        take: pageSize,
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      }),
      this.prisma.permission.count(),
    ]);

    return {
      permissions: permissions.map((p) => this.mapToDto(p)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get permissions by resource
   */
  async findByResource(resource: string): Promise<PermissionDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { resource },
      orderBy: { action: 'asc' },
    });

    return permissions.map((p) => this.mapToDto(p));
  }

  /**
   * Get all permissions grouped by resource
   */
  async findGroupedByResource(): Promise<GroupedPermissionsDto[]> {
    const cacheKey = 'permissions:grouped';
    const cached = await this.cache.get<GroupedPermissionsDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    // Group permissions by resource
    const grouped = permissions.reduce((acc, permission) => {
      const existing = acc.find((g) => g.resource === permission.resource);
      if (existing) {
        existing.permissions.push(this.mapToDto(permission));
      } else {
        acc.push({
          resource: permission.resource,
          permissions: [this.mapToDto(permission)],
        });
      }
      return acc;
    }, [] as GroupedPermissionsDto[]);

    await this.cache.set(cacheKey, grouped, this.CACHE_TTL);
    return grouped;
  }

  /**
   * Delete permission
   */
  async delete(permissionId: string): Promise<void> {
    this.logger.log(`Deleting permission: ${permissionId}`);

    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        roles: true,
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${permissionId} not found`);
    }

    // Check if permission is assigned to any roles
    if (permission.roles.length > 0) {
      throw new BadRequestException(
        `Cannot delete permission as it is assigned to ${permission.roles.length} role(s). Remove from all roles first.`
      );
    }

    // Delete permission
    await this.prisma.permission.delete({
      where: { id: permissionId },
    });

    // Invalidate cache
    await this.cache.delete(`permission:${permissionId}`);
    await this.cache.delete('permissions:grouped');

    // Publish event
    await this.eventPublisher.publish('permission.deleted', {
      permissionId,
      name: permission.name,
    });

    this.logger.log(`Permission deleted successfully: ${permissionId}`);
  }

  /**
   * Get user's effective permissions (from all their roles)
   */
  async getUserPermissions(userId: string): Promise<PermissionDto[]> {
    const cacheKey = `user:${userId}:permissions`;
    const cached = await this.cache.get<PermissionDto[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user permissions ${userId}`);
      return cached;
    }

    // Get all permissions from user's roles
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

    // Extract unique permissions
    const permissionsMap = new Map<string, Permission>();
    userRoles.forEach((userRole) => {
      userRole.role.permissions.forEach((rolePermission) => {
        permissionsMap.set(rolePermission.permission.id, rolePermission.permission);
      });
    });

    const permissions = Array.from(permissionsMap.values()).map((p) => this.mapToDto(p));

    await this.cache.set(cacheKey, permissions, this.CACHE_TTL);
    return permissions;
  }

  /**
   * Check if user has a specific permission
   */
  async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.some((p) => p.name === permissionName);
  }

  /**
   * Check if user has permission for resource and action
   */
  async userHasResourcePermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const permissionName = `${resource}:${action}`;
    return this.userHasPermission(userId, permissionName);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async userHasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    const userPermissionNames = userPermissions.map((p) => p.name);
    return permissionNames.some((name) => userPermissionNames.includes(name));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async userHasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    const userPermissionNames = userPermissions.map((p) => p.name);
    return permissionNames.every((name) => userPermissionNames.includes(name));
  }

  /**
   * Map Prisma Permission to DTO
   */
  private mapToDto(permission: Permission): PermissionDto {
    return {
      id: permission.id,
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description || undefined,
      resource: permission.resource,
      action: permission.action,
      createdAt: permission.createdAt,
    };
  }
}
