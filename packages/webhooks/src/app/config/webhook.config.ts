import { registerAs } from '@nestjs/config';
import { IsInt, IsString, Min, Max } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

/**
 * Webhook configuration class with validation
 */
export class WebhookConfig {
  @IsInt()
  @Min(1)
  @Max(10)
  maxRetryAttempts: number;

  @IsInt()
  @Min(100)
  @Max(60000)
  retryDelayMs: number;

  @IsInt()
  @Min(1)
  @Max(10)
  retryMultiplier: number;

  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  maxWebhooksPerUser: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimitPerMinute: number;

  @IsString()
  rabbitmqUrl: string;

  @IsString()
  rabbitmqExchange: string;

  @IsString()
  rabbitmqQueue: string;

  @IsString()
  rabbitmqRoutingKey: string;

  @IsString()
  databaseUrl: string;

  @IsString()
  redisHost: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  redisPort: number;

  @IsInt()
  @Min(0)
  @Max(15)
  redisDb: number;
}

/**
 * Validate and return webhook configuration
 */
function validateConfig(config: Record<string, unknown>): WebhookConfig {
  const validatedConfig = plainToClass(WebhookConfig, config);
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Webhook configuration validation failed:\n${errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}

/**
 * Webhook configuration factory
 */
export default registerAs('webhook', () => {
  const config = {
    maxRetryAttempts: parseInt(
      process.env['WEBHOOK_MAX_RETRY_ATTEMPTS'] || '3',
      10,
    ),
    retryDelayMs: parseInt(process.env['WEBHOOK_RETRY_DELAY_MS'] || '1000', 10),
    retryMultiplier: parseInt(
      process.env['WEBHOOK_RETRY_MULTIPLIER'] || '2',
      10,
    ),
    timeoutMs: parseInt(process.env['WEBHOOK_TIMEOUT_MS'] || '10000', 10),
    maxWebhooksPerUser: parseInt(
      process.env['WEBHOOK_MAX_PER_USER'] || '50',
      10,
    ),
    rateLimitPerMinute: parseInt(
      process.env['WEBHOOK_RATE_LIMIT_PER_MINUTE'] || '60',
      10,
    ),
    rabbitmqUrl:
      process.env['RABBITMQ_URL'] ||
      'amqp://orion:orion_dev_password@localhost:5672',
    rabbitmqExchange: process.env['RABBITMQ_EXCHANGE'] || 'orion.events',
    rabbitmqQueue: process.env['RABBITMQ_QUEUE'] || 'webhooks.events',
    rabbitmqRoutingKey: process.env['RABBITMQ_ROUTING_KEY'] || '#',
    databaseUrl:
      process.env['WEBHOOKS_DATABASE_URL'] ||
      'postgresql://orion:orion_dev_password@localhost:5432/orion_webhooks',
    redisHost: process.env['REDIS_HOST'] || 'localhost',
    redisPort: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    redisDb: parseInt(process.env['REDIS_DB'] || '3', 10),
  };

  return validateConfig(config);
});
