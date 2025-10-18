import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Roles } from '../decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { RoleService } from '../services/role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleDto,
  AssignPermissionsDto,
  ListRolesResponseDto,
} from '../dto';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created', type: RoleDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  @Roles('admin')
  @Permissions('roles:write')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() createDto: CreateRoleDto): Promise<RoleDto> {
    this.logger.log(`Creating role: ${createDto.name}`);
    return this.roleService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved', type: ListRolesResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Permissions('roles:read')
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<ListRolesResponseDto> {
    this.logger.log(`Listing roles - page: ${page}, pageSize: ${pageSize}`);
    return this.roleService.findAll(page, pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved', type: RoleDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @Permissions('roles:read')
  async findOne(@Param('id') id: string): Promise<RoleDto> {
    this.logger.log(`Getting role: ${id}`);
    return this.roleService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated', type: RoleDto })
  @ApiResponse({ status: 400, description: 'Validation failed or system role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @Roles('admin')
  @Permissions('roles:write')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRoleDto,
  ): Promise<RoleDto> {
    this.logger.log(`Updating role: ${id}`);
    return this.roleService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete - system role or has assignments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @Roles('admin')
  @Permissions('roles:delete')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting role: ${id}`);
    await this.roleService.delete(id);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned', type: RoleDto })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @Roles('admin')
  @Permissions('roles:write', 'permissions:write')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignDto: AssignPermissionsDto,
  ): Promise<RoleDto> {
    this.logger.log(`Assigning permissions to role: ${id}`);
    return this.roleService.assignPermissions(id, assignDto);
  }

  @Delete(':id/permissions/:permissionId')
  @ApiOperation({ summary: 'Remove permission from role' })
  @ApiResponse({ status: 200, description: 'Permission removed', type: RoleDto })
  @ApiResponse({ status: 400, description: 'Cannot modify system role' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @Roles('admin')
  @Permissions('roles:write', 'permissions:write')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ): Promise<RoleDto> {
    this.logger.log(`Removing permission ${permissionId} from role: ${id}`);
    return this.roleService.removePermission(id, permissionId);
  }
}
