import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './app/filters/http-exception.filter';
import { ValidationExceptionFilter } from './app/filters/validation-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Register global exception filters (order matters: most specific first)
  app.useGlobalFilters(
    new ValidationExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env['PORT'] || 3006;

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('ORION Webhooks Service')
    .setDescription(`
      The ORION Webhooks Service enables external systems to subscribe to platform events
      in real-time. It provides webhook registration, event delivery with retry logic,
      payload signing, and comprehensive delivery tracking.

      ## Features
      - Webhook registration and management
      - Event subscription system with wildcard support
      - HMAC-SHA256 payload signing for security
      - Automatic retry with exponential backoff (up to 3 attempts)
      - Delivery status tracking and history
      - Rate limiting per webhook
      - Webhook endpoint verification
      - Test webhook functionality

      ## Webhook Payload Format
      All webhooks receive POST requests with the following JSON payload:
      \`\`\`json
      {
        "id": "evt_123456789",
        "event": "user.created",
        "timestamp": "2025-10-18T12:00:00.000Z",
        "data": { ... }
      }
      \`\`\`

      ## Signature Verification
      All webhook payloads are signed using HMAC-SHA256. The signature is included
      in the \`X-Webhook-Signature\` header in the format \`sha256=<hex>\`.

      To verify the signature:
      1. Extract the signature from the header
      2. Generate HMAC-SHA256 hash of the raw request body using your webhook secret
      3. Compare using timing-safe comparison

      ## Event Types
      Common event types include:
      - \`user.*\` - User-related events
      - \`order.*\` - Order-related events
      - \`payment.*\` - Payment-related events
      - \`webhook.test\` - Test events

      ## Rate Limits
      - Maximum 50 webhooks per user
      - Configurable rate limiting per webhook (default: 60 req/min)
      - Webhook timeout: 10 seconds (configurable)

      ## Retry Policy
      Failed deliveries are automatically retried:
      - Attempt 1: Immediate
      - Attempt 2: After 1 second
      - Attempt 3: After 2 seconds
      - After 3 failures: Marked as failed
    `)
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Webhooks', 'Webhook registration and management')
    .addServer(`http://localhost:${port}`, 'Development server')
    .addServer('https://api.orion.com', 'Production server')
    .setContact('ORION Team', 'https://github.com/orion', 'support@orion.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      filter: true,
      deepLinking: true,
      displayRequestDuration: true,
    },
  });

  // Add graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  Logger.log(`🚀 Webhooks service is running on: http://localhost:${port}/api`);
  Logger.log(`📊 Health check: http://localhost:${port}/api/webhooks/health/check`);
  Logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  Logger.log(`🔔 Event consumer active and listening for platform events`);
}

bootstrap();
