import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsIn,
} from 'class-validator';

export class PermissionDto {
  @ApiProperty({ description: 'Permission ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Permission name (unique identifier)', example: 'users:read' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name for the permission', example: 'Read Users' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Permission description', example: 'View user profiles' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Resource this permission applies to', example: 'users' })
  @IsString()
  resource: string;

  @ApiProperty({ description: 'Action allowed on the resource', example: 'read' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export class CreatePermissionDto {
  @ApiProperty({ description: 'Resource this permission applies to', example: 'posts' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  resource: string;

  @ApiProperty({
    description: 'Action allowed on the resource',
    example: 'write',
    enum: ['read', 'write', 'delete', 'manage']
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['read', 'write', 'delete', 'manage'])
  action: string;

  @ApiProperty({ description: 'Display name for the permission', example: 'Write Posts' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ description: 'Permission description', example: 'Create and edit posts' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ListPermissionsResponseDto {
  @ApiProperty({ description: 'List of permissions', type: [PermissionDto] })
  permissions: PermissionDto[];

  @ApiProperty({ description: 'Total count', example: 50 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Page size', example: 20 })
  pageSize: number;
}

export class GroupedPermissionsDto {
  @ApiProperty({ description: 'Resource name', example: 'users' })
  resource: string;

  @ApiProperty({ description: 'Permissions for this resource', type: [PermissionDto] })
  permissions: PermissionDto[];
}
