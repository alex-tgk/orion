import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve static files from frontend directory
  app.useStaticAssets(join(__dirname, 'frontend'));

  // Enable CORS
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('ORION Admin Dashboard API')
    .setDescription(`
      Backend API for the ORION Admin Dashboard providing:
      - Service monitoring and health checks
      - PM2 process management
      - RabbitMQ queue management
      - Real-time log aggregation
      - Feature flag management
      - AI integration proxy

      ## WebSocket Events
      Connect to \`ws://localhost:3004/admin\` for real-time updates:
      - \`service-health\` - Service health status updates (every 10s)
      - \`queue-stats\` - RabbitMQ queue statistics (every 5s)
      - \`pm2-update\` - PM2 process updates (every 5s)
      - \`log-stream\` - Real-time log streaming (every 2s)

      ## Features
      - RESTful API for all admin operations
      - Real-time WebSocket updates
      - Comprehensive service monitoring
      - Infrastructure health checks
    `)
    .setVersion('1.0.0')
    .addTag('Health', 'Health check endpoints')
    .addTag('Services', 'ORION microservice monitoring')
    .addTag('PM2', 'PM2 process management')
    .addTag('Logs', 'Log aggregation and streaming')
    .addTag('Queues', 'RabbitMQ queue management')
    .addTag('Feature Flags', 'Feature flag management')
    .addTag('AI Integration', 'AI service proxy endpoints')
    .addServer(`http://localhost:${configService.get('ADMIN_API_PORT', 3004)}`, 'Development server')
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
    },
  });

  // Add graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('ADMIN_API_PORT', 3004);
  await app.listen(port);

  logger.log(`🚀 Admin UI Backend is running on: http://localhost:${port}/`);
  logger.log(`📊 API Health check: http://localhost:${port}/api/health`);
  logger.log(`📊 Aggregated health: http://localhost:${port}/api/health/all`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🔌 WebSocket endpoint: ws://localhost:${port}/admin`);
  logger.log(`🌐 Dashboard UI: http://localhost:${port}/`);
  logger.log(`🔧 CORS enabled for: ${corsOrigin}`);
}

bootstrap();