import { registerAs } from '@nestjs/config';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  Min,
  Max,
  validateSync,
} from 'class-validator';
import { plainToClass } from 'class-transformer';

export enum SearchProvider {
  POSTGRES = 'postgres',
  ELASTICSEARCH = 'elasticsearch',
  TYPESENSE = 'typesense',
}

/**
 * Search service configuration with validation
 */
export class SearchConfiguration {
  @IsEnum(SearchProvider)
  provider: SearchProvider = SearchProvider.POSTGRES;

  @IsString()
  databaseUrl: string;

  @IsNumber()
  @Min(1000)
  @Max(65535)
  port: number = 3011;

  @IsNumber()
  @Min(1)
  @Max(1000)
  maxResults: number = 100;

  @IsNumber()
  @Min(1000)
  @Max(30000)
  queryTimeout: number = 5000;

  @IsBoolean()
  enableSemanticSearch: boolean = true;

  @IsString()
  @IsOptional()
  vectorDbUrl?: string;

  @IsString()
  @IsOptional()
  redisUrl?: string;

  @IsString()
  @IsOptional()
  rabbitmqUrl?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  suggestionLimit: number = 10;

  @IsNumber()
  @Min(0)
  @Max(1)
  semanticSearchWeight: number = 0.2;

  @IsNumber()
  @Min(0)
  @Max(1)
  keywordSearchWeight: number = 0.4;

  @IsNumber()
  @Min(0)
  @Max(1)
  recencyWeight: number = 0.2;

  @IsNumber()
  @Min(0)
  @Max(1)
  popularityWeight: number = 0.2;

  @IsBoolean()
  enableFuzzyMatching: boolean = true;

  @IsNumber()
  @Min(1)
  @Max(3)
  maxEditDistance: number = 2;

  @IsBoolean()
  enableAnalytics: boolean = true;

  @IsNumber()
  @Min(1)
  @Max(3600)
  cacheResultsTTL: number = 300; // 5 minutes

  @IsNumber()
  @Min(1)
  @Max(3600)
  cacheSuggestionsTTL: number = 3600; // 1 hour
}

/**
 * Validate and export configuration
 */
export default registerAs('search', (): SearchConfiguration => {
  const config = plainToClass(SearchConfiguration, {
    provider: process.env['SEARCH_PROVIDER'] || SearchProvider.POSTGRES,
    databaseUrl:
      process.env['SEARCH_DATABASE_URL'] || process.env['DATABASE_URL'],
    port: parseInt(process.env['SEARCH_SERVICE_PORT'] || '3011', 10),
    maxResults: parseInt(process.env['SEARCH_MAX_RESULTS'] || '100', 10),
    queryTimeout: parseInt(process.env['SEARCH_QUERY_TIMEOUT'] || '5000', 10),
    enableSemanticSearch:
      process.env['SEARCH_ENABLE_SEMANTIC'] !== 'false',
    vectorDbUrl: process.env['VECTOR_DB_URL'],
    redisUrl: process.env['REDIS_URL'],
    rabbitmqUrl: process.env['RABBITMQ_URL'],
    suggestionLimit: parseInt(
      process.env['SEARCH_SUGGESTION_LIMIT'] || '10',
      10,
    ),
    semanticSearchWeight: parseFloat(
      process.env['SEARCH_SEMANTIC_WEIGHT'] || '0.2',
    ),
    keywordSearchWeight: parseFloat(
      process.env['SEARCH_KEYWORD_WEIGHT'] || '0.4',
    ),
    recencyWeight: parseFloat(process.env['SEARCH_RECENCY_WEIGHT'] || '0.2'),
    popularityWeight: parseFloat(
      process.env['SEARCH_POPULARITY_WEIGHT'] || '0.2',
    ),
    enableFuzzyMatching: process.env['SEARCH_ENABLE_FUZZY'] !== 'false',
    maxEditDistance: parseInt(
      process.env['SEARCH_MAX_EDIT_DISTANCE'] || '2',
      10,
    ),
    enableAnalytics: process.env['SEARCH_ENABLE_ANALYTICS'] !== 'false',
    cacheResultsTTL: parseInt(
      process.env['SEARCH_CACHE_RESULTS_TTL'] || '300',
      10,
    ),
    cacheSuggestionsTTL: parseInt(
      process.env['SEARCH_CACHE_SUGGESTIONS_TTL'] || '3600',
      10,
    ),
  });

  // Validate configuration
  const errors = validateSync(config, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Search Configuration validation failed: ${messages}`);
  }

  // Validate weights sum approximately to 1.0
  const totalWeight =
    config.semanticSearchWeight +
    config.keywordSearchWeight +
    config.recencyWeight +
    config.popularityWeight;

  if (Math.abs(totalWeight - 1.0) > 0.01) {
    throw new Error(
      `Search ranking weights must sum to 1.0, got ${totalWeight}`,
    );
  }

  return config;
});
