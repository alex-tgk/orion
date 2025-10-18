import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class InvalidateCacheDto {
  @ApiPropertyOptional({
    description: 'Pattern to match keys (supports wildcards: *)',
    example: 'user:*',
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @ValidateIf((o) => !o.tags || o.tags.length === 0)
  pattern?: string;

  @ApiPropertyOptional({
    description: 'Tags to invalidate',
    example: ['user', 'profile'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => !o.pattern)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Namespace for multi-tenancy',
    example: 'tenant:acme',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  namespace?: string;
}
