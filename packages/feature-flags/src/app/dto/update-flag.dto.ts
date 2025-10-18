import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FlagType } from '../interfaces/feature-flag.interface';

export class UpdateFlagDto {
  @ApiPropertyOptional({
    description: 'Human-readable name',
    example: 'New Dashboard v2',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the feature',
    example: 'Enables the redesigned dashboard interface with new analytics',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the flag is enabled',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Type of feature flag',
    enum: FlagType,
    example: FlagType.BOOLEAN,
  })
  @IsEnum(FlagType)
  @IsOptional()
  type?: FlagType;

  @ApiPropertyOptional({
    description: 'Rollout percentage (0-100)',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rolloutPercentage?: number;
}
