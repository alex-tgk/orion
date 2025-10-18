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
        target: false, // Don't include target object in error response
        value: false, // Don't include values in error response
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
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('ORION Authentication Service')
    .setDescription(`
      The ORION Authentication Service provides secure JWT-based authentication
      with refresh token rotation, session management via Redis, and comprehensive
      health monitoring.

      ## Features
      - JWT access tokens (15 min expiry) with refresh token rotation
      - bcrypt password hashing (12 rounds)
      - Redis session management with graceful degradation
      - Rate limiting on sensitive endpoints
      - Comprehensive health checks

      ## Rate Limits
      - Login: 5 attempts per minute
      - Refresh: 10 attempts per minute
      - Other endpoints: 100 requests per minute
    `)
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and session management')
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
    },
  });

  // Add graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Auth service is running on: http://localhost:${port}/api`);
  Logger.log(`📊 Health check: http://localhost:${port}/api/auth/health`);
  Logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  Logger.log(`🔒 Rate limits configured for sensitive endpoints`);
}

bootstrap();
