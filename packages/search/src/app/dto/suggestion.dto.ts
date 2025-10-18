import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request for search suggestions
 */
export class SuggestionRequestDto {
  @ApiProperty({
    description: 'Partial query text for auto-complete',
    example: 'micro',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Filter suggestions by entity type',
    example: 'Document',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions',
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;
}

/**
 * Single suggestion item
 */
export class SuggestionItemDto {
  @ApiProperty({
    description: 'Suggested term',
    example: 'microservices',
  })
  term: string;

  @ApiProperty({
    description: 'Suggestion relevance score',
    example: 0.85,
  })
  score: number;

  @ApiPropertyOptional({
    description: 'Associated entity type',
    example: 'Document',
  })
  entityType?: string;

  @ApiProperty({
    description: 'Frequency of searches for this term',
    example: 42,
  })
  frequency: number;
}

/**
 * Response with suggestions
 */
export class SuggestionResponseDto {
  @ApiProperty({
    description: 'List of suggestions',
    type: [SuggestionItemDto],
  })
  suggestions: SuggestionItemDto[];

  @ApiProperty({
    description: 'Query used for suggestions',
    example: 'micro',
  })
  query: string;
}
