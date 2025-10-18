import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ABTestingModule } from './app/app.module';

async function bootstrap() {
  const logger = new Logger('ABTesting');
  const app = await NestFactory.create(ABTestingModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS
  app.enableCors();

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('ORION A/B Testing Service')
    .setDescription('A/B Testing and Experimentation Platform API')
    .setVersion('1.0')
    .addTag('experiments', 'Experiment management')
    .addTag('metrics', 'Metric tracking')
    .addTag('analysis', 'Statistical analysis')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = process.env.AB_TESTING_PORT || 3007;
  await app.listen(port);

  logger.log(`A/B Testing Service running on port ${port}`);
  logger.log(`API Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
