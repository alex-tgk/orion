import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from frontend directory
  app.useStaticAssets(join(__dirname, 'frontend'));

  // Enable CORS
  app.enableCors();

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env['PORT'] || 20003;
  await app.listen(port);

  logger.log(`🚀 Admin UI is running on: http://localhost:${port}/`);
  logger.log(`📊 API Health check: http://localhost:${port}/api/health`);
  logger.log(`🌐 Dashboard UI: http://localhost:${port}/`);
}

bootstrap();