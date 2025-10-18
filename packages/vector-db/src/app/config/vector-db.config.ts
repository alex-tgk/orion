import { registerAs } from '@nestjs/config';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';
import { plainToClass } from 'class-transformer';

export enum VectorDbProvider {
  POSTGRES = 'postgres',
  PINECONE = 'pinecone',
  QDRANT = 'qdrant',
  WEAVIATE = 'weaviate',
}

export enum DistanceMetric {
  COSINE = 'cosine',
  EUCLIDEAN = 'euclidean',
  DOT_PRODUCT = 'dot',
}

/**
 * Vector Database Configuration with validation
 */
export class VectorDbConfig {
  @IsEnum(VectorDbProvider)
  provider: VectorDbProvider = VectorDbProvider.POSTGRES;

  @IsString()
  @IsOptional()
  databaseUrl?: string;

  // Pinecone specific
  @IsString()
  @IsOptional()
  pineconeApiKey?: string;

  @IsString()
  @IsOptional()
  pineconeEnvironment?: string;

  @IsString()
  @IsOptional()
  pineconeIndexName?: string;

  // Qdrant specific
  @IsString()
  @IsOptional()
  qdrantUrl?: string;

  @IsString()
  @IsOptional()
  qdrantApiKey?: string;

  // Weaviate specific
  @IsString()
  @IsOptional()
  weaviateUrl?: string;

  @IsString()
  @IsOptional()
  weaviateApiKey?: string;

  // General configuration
  @IsNumber()
  @Min(1)
  defaultDimension: number = 1536;

  @IsEnum(DistanceMetric)
  defaultMetric: DistanceMetric = DistanceMetric.COSINE;

  @IsNumber()
  @Min(1)
  batchSize: number = 100;

  @IsNumber()
  @Min(1)
  maxRetries: number = 3;
}

/**
 * Validates and loads vector database configuration
 */
export const vectorDbConfig = registerAs('vectorDb', () => {
  const config = plainToClass(VectorDbConfig, {
    provider: process.env['VECTOR_DB_PROVIDER'] || VectorDbProvider.POSTGRES,
    databaseUrl: process.env['VECTOR_DB_URL'] || process.env['DATABASE_URL'],
    pineconeApiKey: process.env['PINECONE_API_KEY'],
    pineconeEnvironment: process.env['PINECONE_ENVIRONMENT'],
    pineconeIndexName: process.env['PINECONE_INDEX_NAME'],
    qdrantUrl: process.env['QDRANT_URL'],
    qdrantApiKey: process.env['QDRANT_API_KEY'],
    weaviateUrl: process.env['WEAVIATE_URL'],
    weaviateApiKey: process.env['WEAVIATE_API_KEY'],
    defaultDimension: parseInt(
      process.env['VECTOR_DEFAULT_DIMENSION'] || '1536',
      10,
    ),
    defaultMetric:
      process.env['VECTOR_DEFAULT_METRIC'] || DistanceMetric.COSINE,
    batchSize: parseInt(process.env['VECTOR_BATCH_SIZE'] || '100', 10),
    maxRetries: parseInt(process.env['VECTOR_MAX_RETRIES'] || '3', 10),
  });

  const errors = validateSync(config, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    throw new Error(
      `Vector DB Configuration validation failed: ${errors.toString()}`,
    );
  }

  return config;
});
