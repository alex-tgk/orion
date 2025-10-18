import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Individual search result
 */
export class SearchResultDto {
  @ApiProperty({
    description: 'Entity type',
    example: 'Document',
  })
  entityType: string;

  @ApiProperty({
    description: 'Entity ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  entityId: string;

  @ApiProperty({
    description: 'Result title',
    example: 'Building Microservices with NestJS',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Content excerpt',
    example: 'A comprehensive guide to building scalable microservices...',
  })
  excerpt?: string;

  @ApiProperty({
    description: 'Relevance score (0-1)',
    example: 0.85,
  })
  score: number;

  @ApiPropertyOptional({
    description: 'Highlighted text with matching terms',
    example: 'Building <mark>Microservices</mark> with NestJS',
  })
  highlighted?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { author: 'John Doe', tags: ['nestjs', 'architecture'] },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Result creation date',
    example: '2025-10-18T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Result last update date',
    example: '2025-10-18T14:30:00Z',
  })
  updatedAt: Date;
}

/**
 * Search response with pagination
 */
export class SearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: [SearchResultDto],
  })
  results: SearchResultDto[];

  @ApiProperty({
    description: 'Total number of results',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Results per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Query execution time in milliseconds',
    example: 125,
  })
  executionTime: number;

  @ApiPropertyOptional({
    description: 'Search suggestions for typos or zero results',
    example: ['microservice', 'micro-services'],
  })
  suggestions?: string[];

  @ApiPropertyOptional({
    description: 'Available facets for filtering',
    example: {
      entityTypes: { User: 10, Document: 32 },
      tags: { nestjs: 15, typescript: 20 },
    },
  })
  facets?: Record<string, Record<string, number>>;
}
