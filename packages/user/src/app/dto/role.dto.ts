import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class RoleDto {
  @ApiProperty({ description: 'Role ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Role name (unique identifier)', example: 'admin' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name for the role', example: 'Administrator' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Full system access' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether this is a system role (cannot be deleted)', example: false })
  @IsBoolean()
  isSystem: boolean;

  @ApiProperty({ description: 'List of permission IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name (unique identifier)', example: 'content_moderator' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Display name for the role', example: 'Content Moderator' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Moderates user-generated content' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Permission IDs to assign', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Display name for the role', example: 'Senior Moderator' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Senior content moderation role' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AssignPermissionsDto {
  @ApiProperty({ description: 'Permission IDs to assign to the role', type: [String] })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class ListRolesResponseDto {
  @ApiProperty({ description: 'List of roles', type: [RoleDto] })
  roles: RoleDto[];

  @ApiProperty({ description: 'Total count', example: 10 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Page size', example: 20 })
  pageSize: number;
}
