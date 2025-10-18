import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for indexing a document
 */
export class IndexDocumentDto {
  @ApiProperty({
    description: 'Entity type',
    example: 'Document',
  })
  @IsString()
  entityType: string;

  @ApiProperty({
    description: 'Entity ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  entityId: string;

  @ApiProperty({
    description: 'Document title',
    example: 'Building Microservices with NestJS',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Document content for full-text search',
    example: 'A comprehensive guide to building scalable microservices...',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for filtering',
    example: { author: 'John Doe', tags: ['nestjs', 'architecture'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Initial rank/popularity score',
    example: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  rank?: number;
}

/**
 * DTO for bulk indexing
 */
export class BulkIndexDto {
  @ApiProperty({
    description: 'Documents to index',
    type: [IndexDocumentDto],
  })
  documents: IndexDocumentDto[];

  @ApiPropertyOptional({
    description: 'Batch size for processing',
    example: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize?: number = 100;
}

/**
 * Response for indexing operations
 */
export class IndexResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Index ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  indexId: string;

  @ApiPropertyOptional({
    description: 'Error message if failed',
    example: 'Failed to generate vector embedding',
  })
  error?: string;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 50,
  })
  processingTime: number;
}

/**
 * Response for bulk indexing
 */
export class BulkIndexResponseDto {
  @ApiProperty({
    description: 'Number of documents processed',
    example: 100,
  })
  processed: number;

  @ApiProperty({
    description: 'Number of successful indexes',
    example: 98,
  })
  successful: number;

  @ApiProperty({
    description: 'Number of failed indexes',
    example: 2,
  })
  failed: number;

  @ApiPropertyOptional({
    description: 'Failed document IDs',
    example: ['id1', 'id2'],
  })
  failedIds?: string[];

  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 5000,
  })
  processingTime: number;
}
