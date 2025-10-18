import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new vector collection
 */
export class CreateCollectionDto {
  @ApiProperty({
    description: 'Unique name for the collection',
    example: 'documents',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Vector dimension (must match embedding model)',
    example: 1536,
    minimum: 1,
    maximum: 10000,
  })
  @IsInt()
  @Min(1)
  @Max(10000)
  dimension!: number;

  @ApiPropertyOptional({
    description: 'Optional description of the collection',
    example: 'Document embeddings for semantic search',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for the collection',
    example: { source: 'documents', model: 'text-embedding-ada-002' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
