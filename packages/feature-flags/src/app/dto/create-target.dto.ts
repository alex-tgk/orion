import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TargetType } from '../interfaces/feature-flag.interface';

export class CreateTargetDto {
  @ApiProperty({
    description: 'Type of target',
    enum: TargetType,
    example: TargetType.USER,
  })
  @IsEnum(TargetType)
  @IsNotEmpty()
  targetType: TargetType;

  @ApiProperty({
    description: 'Target value (user ID, role, email, etc.)',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  targetValue: string;

  @ApiPropertyOptional({
    description: 'Whether the target is enabled',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Rollout percentage for this target (0-100)',
    example: 100,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({
    description: 'Specific variant key for this target',
    example: 'variant-a',
  })
  @IsString()
  @IsOptional()
  variantKey?: string;

  @ApiPropertyOptional({
    description: 'Priority for conflicting rules (higher wins)',
    example: 10,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  priority?: number;
}
