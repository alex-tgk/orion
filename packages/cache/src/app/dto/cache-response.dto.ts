import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CacheResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'The cached value (if retrieving)',
    example: { name: 'John Doe' },
  })
  value?: any;

  @ApiPropertyOptional({
    description: 'Whether the key exists in cache',
    example: true,
  })
  exists?: boolean;

  @ApiPropertyOptional({
    description: 'Remaining TTL in seconds',
    example: 3600,
  })
  ttl?: number;

  @ApiPropertyOptional({
    description: 'Error message if operation failed',
    example: 'Key not found',
  })
  error?: string;
}

export class BatchCacheResponseDto {
  @ApiProperty({
    description: 'Whether the batch operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of operations performed',
    example: 5,
  })
  count: number;

  @ApiPropertyOptional({
    description: 'Results for each operation',
    example: [{ key: 'user:123', success: true }],
  })
  results?: Array<{
    key: string;
    success: boolean;
    value?: any;
    error?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Error message if batch operation failed',
    example: 'Batch operation failed',
  })
  error?: string;
}

export class InvalidateCacheResponseDto {
  @ApiProperty({
    description: 'Whether the invalidation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of keys invalidated',
    example: 15,
  })
  count: number;

  @ApiPropertyOptional({
    description: 'Error message if invalidation failed',
    example: 'Pattern matching failed',
  })
  error?: string;
}
