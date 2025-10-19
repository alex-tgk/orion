import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsEnum, IsOptional, IsObject, IsArray, Min, Max } from 'class-validator';

export enum FeatureFlagStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  CONDITIONAL = 'conditional',
}

export class FeatureFlagRolloutDto {
  @ApiProperty({ description: 'Rollout percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({ description: 'User segments to target' })
  @IsArray()
  @IsOptional()
  segments?: string[];

  @ApiProperty({ description: 'User IDs to include' })
  @IsArray()
  @IsOptional()
  userIds?: string[];

  @ApiProperty({ description: 'Environment restrictions' })
  @IsArray()
  @IsOptional()
  environments?: string[];
}

export class FeatureFlagDto {
  @ApiProperty({ description: 'Feature flag ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Feature flag name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Feature flag description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Feature flag key (unique identifier)' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Feature flag status', enum: FeatureFlagStatus })
  @IsEnum(FeatureFlagStatus)
  status: FeatureFlagStatus;

  @ApiProperty({ description: 'Is feature flag enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Rollout configuration' })
  @IsOptional()
  rollout?: FeatureFlagRolloutDto;

  @ApiProperty({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Created timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  @IsString()
  updatedAt: string;

  @ApiProperty({ description: 'Created by user' })
  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class CreateFeatureFlagDto {
  @ApiProperty({ description: 'Feature flag name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Feature flag description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Feature flag key (unique identifier)' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ description: 'Is feature flag enabled', default: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = false;

  @ApiPropertyOptional({ description: 'Rollout configuration' })
  @IsOptional()
  rollout?: FeatureFlagRolloutDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional({ description: 'Feature flag name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Feature flag description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Is feature flag enabled' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Rollout configuration' })
  @IsOptional()
  rollout?: FeatureFlagRolloutDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class FeatureFlagListResponseDto {
  @ApiProperty({ description: 'List of feature flags', type: [FeatureFlagDto] })
  @IsArray()
  flags: FeatureFlagDto[];

  @ApiProperty({ description: 'Total flag count' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Enabled flag count' })
  @IsNumber()
  enabled: number;

  @ApiProperty({ description: 'Disabled flag count' })
  @IsNumber()
  disabled: number;
}

export class FeatureFlagStatsDto {
  @ApiProperty({ description: 'Feature flag ID' })
  @IsString()
  flagId: string;

  @ApiProperty({ description: 'Feature flag key' })
  @IsString()
  flagKey: string;

  @ApiProperty({ description: 'Total evaluations' })
  @IsNumber()
  totalEvaluations: number;

  @ApiProperty({ description: 'Enabled evaluations' })
  @IsNumber()
  enabledEvaluations: number;

  @ApiProperty({ description: 'Disabled evaluations' })
  @IsNumber()
  disabledEvaluations: number;

  @ApiProperty({ description: 'Unique users' })
  @IsNumber()
  uniqueUsers: number;

  @ApiProperty({ description: 'Last evaluated timestamp' })
  @IsString()
  @IsOptional()
  lastEvaluated?: string;
}

export class AllFeatureFlagStatsResponseDto {
  @ApiProperty({ description: 'Statistics for all feature flags', type: [FeatureFlagStatsDto] })
  @IsArray()
  stats: FeatureFlagStatsDto[];

  @ApiProperty({ description: 'Total evaluations across all flags' })
  @IsNumber()
  totalEvaluations: number;

  @ApiProperty({ description: 'Query timestamp' })
  @IsString()
  timestamp: string;
}
