import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });
  
  const port = process.env.PORT || 3200;
  await app.listen(port);
  
  console.log('AI Wrapper Service running on port ' + port);
  console.log('Endpoints:');
  console.log('  GET  /ai/providers - List available AI providers');
  console.log('  POST /ai/generate - Generate with fallback');
  console.log('  POST /ai/generate/parallel - Parallel generation');
  console.log('  POST /ai/chat - Simple chat interface');
}

bootstrap();
