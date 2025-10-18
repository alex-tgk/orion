import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';

export enum AnalyticsPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/**
 * Request for search analytics
 */
export class AnalyticsRequestDto {
  @ApiPropertyOptional({
    description: 'Analytics period',
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.DAY,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.DAY;

  @ApiPropertyOptional({
    description: 'Start date (ISO 8601)',
    example: '2025-10-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601)',
    example: '2025-10-18T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Popular query item
 */
export class PopularQueryDto {
  @ApiProperty({
    description: 'Search query',
    example: 'nestjs tutorial',
  })
  query: string;

  @ApiProperty({
    description: 'Number of times searched',
    example: 125,
  })
  count: number;

  @ApiProperty({
    description: 'Average number of results',
    example: 15.5,
  })
  avgResults: number;
}

/**
 * Zero result query item
 */
export class ZeroResultQueryDto {
  @ApiProperty({
    description: 'Search query with zero results',
    example: 'quantum computing nestjs',
  })
  query: string;

  @ApiProperty({
    description: 'Number of times this query returned zero results',
    example: 8,
  })
  count: number;

  @ApiProperty({
    description: 'Last occurrence',
    example: '2025-10-18T12:00:00Z',
  })
  lastOccurrence: Date;
}

/**
 * Search analytics response
 */
export class SearchAnalyticsDto {
  @ApiProperty({
    description: 'Total number of searches in period',
    example: 1250,
  })
  totalSearches: number;

  @ApiProperty({
    description: 'Average query execution time in ms',
    example: 125.5,
  })
  avgExecutionTime: number;

  @ApiProperty({
    description: 'Percentage of searches with zero results',
    example: 5.2,
  })
  zeroResultRate: number;

  @ApiProperty({
    description: 'Most popular queries',
    type: [PopularQueryDto],
  })
  popularQueries: PopularQueryDto[];

  @ApiProperty({
    description: 'Queries with zero results',
    type: [ZeroResultQueryDto],
  })
  zeroResultQueries: ZeroResultQueryDto[];

  @ApiProperty({
    description: 'Search distribution by entity type',
    example: { User: 300, Document: 750, File: 200 },
  })
  entityTypeDistribution: Record<string, number>;

  @ApiProperty({
    description: 'Searches per hour distribution',
    example: { '00': 10, '12': 150, '18': 200 },
  })
  hourlyDistribution: Record<string, number>;
}
