import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { vectorDbConfig } from './config/vector-db.config';
import { PostgresVectorProvider } from './providers/postgres-vector.provider';
import { VectorService } from './services/vector.service';
import { CollectionService } from './services/collection.service';
import { HealthService } from './services/health.service';
import { VectorController } from './controllers/vector.controller';
import { CollectionController } from './controllers/collection.controller';
import { HealthController } from './controllers/health.controller';

/**
 * Vector Database Application Module
 * Main module for the ORION Vector Database Service
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [vectorDbConfig],
      isGlobal: true,
      cache: true,
    }),
  ],
  controllers: [
    VectorController,
    CollectionController,
    HealthController,
  ],
  providers: [
    // Vector provider (can be swapped for Pinecone, Qdrant, etc.)
    PostgresVectorProvider,
    {
      provide: 'IVectorProvider',
      useExisting: PostgresVectorProvider,
    },
    VectorService,
    CollectionService,
    HealthService,
  ],
  exports: [
    VectorService,
    CollectionService,
    HealthService,
  ],
})
export class AppModule {}
