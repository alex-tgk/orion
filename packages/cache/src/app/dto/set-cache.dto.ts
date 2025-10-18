import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export class SetCacheDto {
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
    description: 'Cache value (will be JSON stringified)',
    example: { name: 'John Doe', email: 'john@example.com' },
  })
  @IsNotEmpty()
  value: any;

  @ApiPropertyOptional({
    description: 'Time to live in seconds (null for no expiration)',
    example: 3600,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  ttl?: number;

  @ApiPropertyOptional({
    description: 'Namespace for multi-tenancy',
    example: 'tenant:acme',
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  namespace?: string;

  @ApiPropertyOptional({
    description: 'Tags for cache invalidation',
    example: ['user', 'profile'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
