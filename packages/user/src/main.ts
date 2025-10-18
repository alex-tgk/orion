import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3002);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const env = configService.get<string>('app.env', 'development');

  // Global prefix for all routes
  app.setGlobalPrefix(apiPrefix);

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

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin', 'http://localhost:4200'),
    credentials: true,
  });

  // Swagger documentation
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ORION User Service')
      .setDescription('User profile and preferences management API')
      .setVersion('1.0.0')
      .addTag('users', 'User profile endpoints')
      .addTag('health', 'Health check endpoints')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Start server
  await app.listen(port);

  logger.log(`🚀 User Service is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📊 Health check available at: http://localhost:${port}/health`);
  logger.log(`🌍 Environment: ${env}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start User Service:', error);
  process.exit(1);
});
