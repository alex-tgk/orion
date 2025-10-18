import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class EvaluateFlagDto {
  @ApiPropertyOptional({
    description: 'User ID for evaluation',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'User roles',
    example: ['admin', 'developer'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userRoles?: string[];

  @ApiPropertyOptional({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsString()
  @IsOptional()
  userEmail?: string;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org-456',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'User groups',
    example: ['beta-testers', 'premium-users'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groups?: string[];

  @ApiPropertyOptional({
    description: 'Custom attributes for targeting',
    example: { region: 'us-east', plan: 'premium' },
  })
  @IsObject()
  @IsOptional()
  customAttributes?: Record<string, unknown>;
}
