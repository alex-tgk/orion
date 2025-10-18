import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { bootstrapService } from '@orion/shared';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Bootstrap the service with standard ORION setup
  const app = await bootstrapService({
    serviceName: 'admin-ui',
    AppModule,
  });

  // Configure Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('ORION Admin UI API')
    .setDescription(
      'Comprehensive observability and monitoring API for the ORION microservices platform. ' +
      'Provides endpoints for service discovery, health monitoring, metrics collection, event logging, and system statistics.',
    )
    .setVersion('1.0')
    .addTag('Observability', 'Endpoints for monitoring and observability')
    .addTag('Health', 'Service health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'ORION Admin UI API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
    },
  });

  logger.log('📚 API Documentation available at: /api/docs');
}

bootstrap();
