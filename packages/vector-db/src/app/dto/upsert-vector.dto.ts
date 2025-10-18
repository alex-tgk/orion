import {
  IsString,
  IsArray,
  IsOptional,
  IsObject,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for upserting a single vector
 */
export class UpsertVectorDto {
  @ApiPropertyOptional({
    description: 'Optional ID for the vector (generated if not provided)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Collection name to upsert into',
    example: 'documents',
  })
  @IsString()
  collectionName!: string;

  @ApiProperty({
    description: 'Vector embedding array',
    example: [0.1, 0.2, 0.3],
    isArray: true,
    type: Number,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  embedding!: number[];

  @ApiPropertyOptional({
    description: 'Optional original text',
    example: 'This is the original document text',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for filtering',
    example: { category: 'technical', author: 'John Doe' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for batch upserting vectors
 */
export class BatchUpsertDto {
  @ApiProperty({
    description: 'Collection name to upsert into',
    example: 'documents',
  })
  @IsString()
  collectionName!: string;

  @ApiProperty({
    description: 'Array of vectors to upsert',
    type: [UpsertVectorDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  vectors!: Omit<UpsertVectorDto, 'collectionName'>[];
}
