import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CacheStatsDto {
  @ApiProperty({
    description: 'Total number of keys in cache',
    example: 1250,
  })
  totalKeys: number;

  @ApiProperty({
    description: 'Total cache hits',
    example: 5000,
  })
  hits: number;

  @ApiProperty({
    description: 'Total cache misses',
    example: 250,
  })
  misses: number;

  @ApiProperty({
    description: 'Cache hit ratio (hits / (hits + misses))',
    example: 0.952,
  })
  hitRatio: number;

  @ApiProperty({
    description: 'Memory usage in bytes',
    example: 1048576,
  })
  memoryUsage: number;

  @ApiProperty({
    description: 'Memory usage in human-readable format',
    example: '1.00 MB',
  })
  memoryUsageFormatted: string;

  @ApiPropertyOptional({
    description: 'Number of keys per namespace',
    example: { 'tenant:acme': 500, 'tenant:globex': 750 },
  })
  keysByNamespace?: Record<string, number>;

  @ApiProperty({
    description: 'Redis server uptime in seconds',
    example: 86400,
  })
  uptime: number;

  @ApiProperty({
    description: 'Number of connected clients',
    example: 5,
  })
  connectedClients: number;

  @ApiProperty({
    description: 'Total commands processed',
    example: 10500,
  })
  totalCommands: number;

  @ApiProperty({
    description: 'Last stats update timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;
}
