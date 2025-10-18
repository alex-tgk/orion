import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export class AIConfiguration {
  // OpenAI Configuration
  @IsString()
  OPENAI_API_KEY!: string;

  @IsOptional()
  @IsString()
  OPENAI_ORGANIZATION?: string;

  @IsOptional()
  @IsString()
  OPENAI_DEFAULT_MODEL?: string;

  // Anthropic Configuration
  @IsString()
  ANTHROPIC_API_KEY!: string;

  @IsOptional()
  @IsString()
  ANTHROPIC_DEFAULT_MODEL?: string;

  // Redis Configuration (for caching)
  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsNumber()
  REDIS_DB?: number;

  // Cache Settings
  @IsOptional()
  @IsNumber()
  @Min(0)
  AI_CACHE_TTL?: number; // seconds

  @IsOptional()
  @IsNumber()
  AI_CACHE_ENABLED?: number; // 0 or 1

  // Rate Limiting
  @IsOptional()
  @IsNumber()
  @Min(1)
  AI_MAX_REQUESTS_PER_HOUR?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  AI_MAX_TOKENS_PER_REQUEST?: number;

  // Cost Limits
  @IsOptional()
  @IsNumber()
  AI_DAILY_COST_LIMIT?: number;

  @IsOptional()
  @IsNumber()
  AI_MONTHLY_COST_LIMIT?: number;

  // Retry Configuration
  @IsOptional()
  @IsNumber()
  @Min(0)
  AI_MAX_RETRIES?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  AI_RETRY_DELAY_MS?: number;
}

export function validateAIConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(AIConfiguration, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `AI Configuration validation failed:\n${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('\n')}`,
    );
  }

  return validatedConfig;
}

export default registerAs('ai', () => {
  const config = {
    // OpenAI
    OPENAI_API_KEY: process.env['OPENAI_API_KEY'] || '',
    OPENAI_ORGANIZATION: process.env['OPENAI_ORGANIZATION'],
    OPENAI_DEFAULT_MODEL: process.env['OPENAI_DEFAULT_MODEL'] || 'gpt-3.5-turbo',

    // Anthropic
    ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] || '',
    ANTHROPIC_DEFAULT_MODEL:
      process.env['ANTHROPIC_DEFAULT_MODEL'] || 'claude-3-5-sonnet-20241022',

    // Redis
    REDIS_HOST: process.env['REDIS_HOST'] || 'localhost',
    REDIS_PORT: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    REDIS_PASSWORD: process.env['REDIS_PASSWORD'],
    REDIS_DB: parseInt(process.env['REDIS_DB'] || '0', 10),

    // Cache Settings
    AI_CACHE_TTL: parseInt(process.env['AI_CACHE_TTL'] || '3600', 10), // 1 hour
    AI_CACHE_ENABLED: process.env['AI_CACHE_ENABLED'] === 'true' ? 1 : 0,

    // Rate Limiting
    AI_MAX_REQUESTS_PER_HOUR: parseInt(
      process.env['AI_MAX_REQUESTS_PER_HOUR'] || '100',
      10,
    ),
    AI_MAX_TOKENS_PER_REQUEST: parseInt(
      process.env['AI_MAX_TOKENS_PER_REQUEST'] || '4000',
      10,
    ),

    // Cost Limits
    AI_DAILY_COST_LIMIT: parseFloat(
      process.env['AI_DAILY_COST_LIMIT'] || '10.0',
    ),
    AI_MONTHLY_COST_LIMIT: parseFloat(
      process.env['AI_MONTHLY_COST_LIMIT'] || '100.0',
    ),

    // Retry Configuration
    AI_MAX_RETRIES: parseInt(process.env['AI_MAX_RETRIES'] || '3', 10),
    AI_RETRY_DELAY_MS: parseInt(
      process.env['AI_RETRY_DELAY_MS'] || '1000',
      10,
    ),
  };

  return validateAIConfig(config);
});
