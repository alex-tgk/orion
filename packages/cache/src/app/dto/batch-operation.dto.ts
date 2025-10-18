import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BatchSetItem {
  @ApiProperty({
    description: 'Cache key',
    example: 'user:123',
    maxLength: 256,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  key: string;

  @ApiProperty({
    description: 'Cache value',
    example: { name: 'John Doe' },
  })
  @IsNotEmpty()
  value: any;

  @ApiPropertyOptional({
    description: 'Time to live in seconds',
    example: 3600,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  ttl?: number;

  @ApiPropertyOptional({
    description: 'Tags for cache invalidation',
    example: ['user', 'profile'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BatchOperationDto {
  @ApiProperty({
    description: 'List of cache operations',
    type: [BatchSetItem],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchSetItem)
  operations: BatchSetItem[];

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

export class BatchGetDto {
  @ApiProperty({
    description: 'List of keys to retrieve',
    example: ['user:123', 'user:456'],
    minItems: 1,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  keys: string[];

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
