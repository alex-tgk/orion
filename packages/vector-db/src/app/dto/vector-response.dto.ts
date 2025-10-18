import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for a vector search result
 */
export class VectorResultDto {
  @ApiProperty({
    description: 'Vector ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Similarity score (0-1, higher is more similar)',
    example: 0.95,
  })
  score: number;

  @ApiPropertyOptional({
    description: 'Original text',
    example: 'This is the document text',
  })
  text?: string;

  @ApiPropertyOptional({
    description: 'Vector metadata',
    example: { category: 'technical', author: 'John Doe' },
  })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Vector embedding (only if includeVectors=true)',
    example: [0.1, 0.2, 0.3],
  })
  embedding?: number[];
}

/**
 * Response DTO for search operations
 */
export class SearchResponseDto {
  @ApiProperty({
    description: 'Collection name searched',
    example: 'documents',
  })
  collectionName!: string;

  @ApiProperty({
    description: 'Search results',
    type: [VectorResultDto],
  })
  results: VectorResultDto[];

  @ApiProperty({
    description: 'Total number of results',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Query execution time in milliseconds',
    example: 45,
  })
  queryTime: number;
}

/**
 * Response DTO for collection info
 */
export class CollectionResponseDto {
  @ApiProperty({
    description: 'Collection ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Collection name',
    example: 'documents',
  })
  name: string;

  @ApiProperty({
    description: 'Vector dimension',
    example: 1536,
  })
  dimension: number;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Document embeddings for semantic search',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Collection metadata',
    example: { source: 'documents', model: 'text-embedding-ada-002' },
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Number of vectors in collection',
    example: 1500,
  })
  vectorCount: number;

  @ApiProperty({
    description: 'Collection creation timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Collection last update timestamp',
    example: '2025-10-18T14:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Response DTO for batch operations
 */
export class BatchOperationResponseDto {
  @ApiProperty({
    description: 'Number of vectors processed successfully',
    example: 98,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of vectors that failed',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'IDs of successfully processed vectors',
    example: ['id1', 'id2', 'id3'],
  })
  successfulIds: string[];

  @ApiPropertyOptional({
    description: 'Error messages for failed vectors',
    example: [{ id: 'id4', error: 'Invalid dimension' }],
  })
  errors?: Array<{ id?: string; error: string }>;
}

/**
 * Health check response for vector DB
 */
export class VectorHealthResponseDto {
  @ApiProperty({
    description: 'Overall health status',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'Vector database provider',
    example: 'postgres',
  })
  provider: string;

  @ApiProperty({
    description: 'Whether provider connection is active',
    example: true,
  })
  connected: boolean;

  @ApiPropertyOptional({
    description: 'Total number of collections',
    example: 5,
  })
  collectionCount?: number;

  @ApiPropertyOptional({
    description: 'Total number of vectors across all collections',
    example: 15000,
  })
  totalVectors?: number;

  @ApiProperty({
    description: 'Service uptime in seconds',
    example: 86400,
  })
  uptime: number;

  @ApiProperty({
    description: 'Timestamp of health check',
    example: '2025-10-18T14:30:00.000Z',
  })
  timestamp: string;
}
