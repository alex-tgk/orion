import {
  IsString,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistanceMetric } from '../config/vector-db.config';

/**
 * DTO for vector similarity search
 */
export class SearchVectorDto {
  @ApiProperty({
    description: 'Collection name to search in',
    example: 'documents',
  })
  @IsString()
  collectionName!: string;

  @ApiProperty({
    description: 'Query vector embedding',
    example: [0.1, 0.2, 0.3],
    isArray: true,
    type: Number,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  queryVector!: number[];

  @ApiPropertyOptional({
    description: 'Number of top results to return',
    example: 10,
    minimum: 1,
    maximum: 1000,
    default: 10,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  topK?: number = 10;

  @ApiPropertyOptional({
    description: 'Minimum similarity threshold (0-1)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  minScore?: number;

  @ApiPropertyOptional({
    description: 'Distance metric to use',
    enum: DistanceMetric,
    example: DistanceMetric.COSINE,
  })
  @IsEnum(DistanceMetric)
  @IsOptional()
  metric?: DistanceMetric = DistanceMetric.COSINE;

  @ApiPropertyOptional({
    description: 'Metadata filters (exact match)',
    example: { category: 'technical' },
  })
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Include embedding vectors in response',
    example: false,
    default: false,
  })
  @IsOptional()
  includeVectors?: boolean = false;
}

/**
 * DTO for hybrid search (vector + keyword)
 */
export class HybridSearchDto extends SearchVectorDto {
  @ApiProperty({
    description: 'Keyword search query',
    example: 'machine learning algorithms',
  })
  @IsString()
  keywords!: string;

  @ApiPropertyOptional({
    description:
      'Weight for vector search (0-1, remaining weight goes to keyword)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
    default: 0.7,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  vectorWeight?: number = 0.7;
}
