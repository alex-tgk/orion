import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { FlagType } from '../interfaces/feature-flag.interface';

export class CreateFlagDto {
  @ApiProperty({
    description: 'Unique key for the feature flag (kebab-case)',
    example: 'new-dashboard',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Key must be lowercase alphanumeric with hyphens only',
  })
  key: string;

  @ApiProperty({
    description: 'Human-readable name',
    example: 'New Dashboard',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the feature',
    example: 'Enables the redesigned dashboard interface',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Whether the flag is enabled',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({
    description: 'Type of feature flag',
    enum: FlagType,
    example: FlagType.BOOLEAN,
    default: FlagType.BOOLEAN,
  })
  @IsEnum(FlagType)
  @IsOptional()
  type?: FlagType;

  @ApiProperty({
    description: 'Rollout percentage (0-100)',
    example: 0,
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rolloutPercentage?: number;

  @ApiPropertyOptional({
    description: 'User ID of the creator',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  createdBy?: string;
}
