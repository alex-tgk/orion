import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class UsageQueryDto {
  @ApiPropertyOptional({
    example: '2025-10-01',
    description: 'Start date for usage query (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-10-31',
    description: 'End date for usage query (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UsageByProviderDto {
  @ApiProperty({
    example: 'openai',
    description: 'AI provider name',
  })
  provider!: string;

  @ApiProperty({
    example: 150,
    description: 'Number of requests',
  })
  requestCount!: number;

  @ApiProperty({
    example: 45000,
    description: 'Total tokens used',
  })
  totalTokens!: number;

  @ApiProperty({
    example: 1.25,
    description: 'Total cost in USD',
  })
  totalCost!: number;
}

export class UsageByModelDto {
  @ApiProperty({
    example: 'gpt-4',
    description: 'Model name',
  })
  model!: string;

  @ApiProperty({
    example: 50,
    description: 'Number of requests',
  })
  requestCount!: number;

  @ApiProperty({
    example: 25000,
    description: 'Total tokens used',
  })
  totalTokens!: number;

  @ApiProperty({
    example: 0.75,
    description: 'Total cost in USD',
  })
  totalCost!: number;
}

export class UsageResponseDto {
  @ApiProperty({
    example: 'user-123',
    description: 'User identifier',
  })
  userId!: string;

  @ApiProperty({
    example: 200,
    description: 'Total number of AI requests',
  })
  totalRequests!: number;

  @ApiProperty({
    example: 50000,
    description: 'Total tokens consumed',
  })
  totalTokens!: number;

  @ApiProperty({
    example: 2.50,
    description: 'Total cost in USD',
  })
  totalCost!: number;

  @ApiProperty({
    example: 50,
    description: 'Number of cached responses',
  })
  cachedResponses!: number;

  @ApiProperty({
    example: 25.0,
    description: 'Cache hit rate percentage',
  })
  cacheHitRate!: number;

  @ApiProperty({
    type: [UsageByProviderDto],
    description: 'Usage breakdown by provider',
  })
  byProvider!: UsageByProviderDto[];

  @ApiProperty({
    type: [UsageByModelDto],
    description: 'Usage breakdown by model',
  })
  byModel!: UsageByModelDto[];

  @ApiProperty({
    example: '2025-10-01T00:00:00.000Z',
    description: 'Start of usage period',
  })
  periodStart!: string;

  @ApiProperty({
    example: '2025-10-31T23:59:59.999Z',
    description: 'End of usage period',
  })
  periodEnd!: string;
}
