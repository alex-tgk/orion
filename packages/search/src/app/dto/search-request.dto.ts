import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchMode {
  KEYWORD = 'keyword',
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid',
}

export enum SortOrder {
  RELEVANCE = 'relevance',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  POPULARITY = 'popularity',
}

/**
 * Main search request DTO
 */
export class SearchRequestDto {
  @ApiProperty({
    description: 'Search query string',
    example: 'microservices architecture',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Filter by entity types',
    example: ['User', 'Document'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entityTypes?: string[];

  @ApiPropertyOptional({
    description: 'Search mode',
    enum: SearchMode,
    example: SearchMode.HYBRID,
  })
  @IsOptional()
  @IsEnum(SearchMode)
  mode?: SearchMode = SearchMode.HYBRID;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortBy?: SortOrder = SortOrder.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Results per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Enable fuzzy matching for typo tolerance',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  fuzzy?: boolean = true;

  @ApiPropertyOptional({
    description: 'Additional metadata filters',
    example: { tags: ['nestjs', 'typescript'] },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'User ID for personalized results',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Highlight matching terms in results',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  highlight?: boolean = false;
}
