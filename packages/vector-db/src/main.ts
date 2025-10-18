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

  // Register global exception filters
  app.useGlobalFilters(
    new ValidationExceptionFilter(),
    new HttpExceptionFilter(),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  });

  // Setup Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('ORION Vector Database Service')
    .setDescription(
      `
      The ORION Vector Database Service provides semantic search and vector storage
      capabilities for AI applications, supporting RAG (Retrieval-Augmented Generation)
      and similarity search use cases.

      ## Features
      - Vector storage with multiple dimension support (768, 1536, 3072)
      - Similarity search (cosine, euclidean, dot product)
      - Collection management (namespaces for vectors)
      - Batch operations for efficient processing
      - Metadata filtering in queries
      - Hybrid search (vector + keyword)
      - Health monitoring

      ## Supported Providers
      - PostgreSQL with pgvector
      - Pinecone (cloud-native)
      - Qdrant (open-source)
      - Weaviate (graph-based)
    `,
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Vectors', 'Vector operations: upsert, search, delete')
    .addTag('Collections', 'Collection management')
    .addTag('Health', 'Health monitoring')
    .addServer('http://localhost:3012', 'Development server')
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

  const port = process.env.PORT || 3012;
  await app.listen(port);

  Logger.log(
    `🚀 Vector DB service is running on: http://localhost:${port}/api`,
  );
  Logger.log(`📊 Health check: http://localhost:${port}/api/health`);
  Logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  Logger.log(`🔍 Provider: ${process.env.VECTOR_DB_PROVIDER || 'postgres'}`);
}

bootstrap();
