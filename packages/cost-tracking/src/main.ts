import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ORION Cost Tracking API')
    .setDescription('Cost tracking and analysis service for monitoring resource usage and costs')
    .setVersion('1.0')
    .addTag('Cost Tracking')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.COST_TRACKING_PORT || 20010;
  await app.listen(port);

  console.log(`Cost Tracking Service is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
