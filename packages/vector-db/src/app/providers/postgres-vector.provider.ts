import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import {
  IVectorProvider,
  VectorEntity,
  CollectionEntity,
  SearchResult,
  SearchOptions,
  VectorMetadata,
} from '../interfaces/vector-provider.interface';
import { DistanceMetric } from '../config/vector-db.config';

/**
 * PostgreSQL + pgvector implementation of the vector provider
 * Uses Prisma for database operations and pgvector for similarity search
 */
@Injectable()
export class PostgresVectorProvider
  implements IVectorProvider, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostgresVectorProvider.name);
  private prisma!: PrismaClient;
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      const databaseUrl = this.configService.get<string>(
        'vectorDb.databaseUrl',
      );

      if (!databaseUrl) {
        throw new Error(
          'Database URL not configured for PostgreSQL vector provider',
        );
      }

      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });

      await this.prisma.$connect();

      // Enable pgvector extension if not already enabled
      await this.ensurePgvectorExtension();

      this.connected = true;
      this.logger.log('Connected to PostgreSQL with pgvector');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.connected = false;
      this.logger.log('Disconnected from PostgreSQL');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.connected || !this.prisma) {
        return false;
      }
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  async createCollection(
    name: string,
    dimension: number,
    description?: string,
    metadata?: VectorMetadata,
  ): Promise<CollectionEntity> {
    try {
      const collection = await this.prisma.collection.create({
        data: {
          name,
          dimension,
          description,
          metadata: metadata || {},
        },
      });

      return this.mapCollectionToEntity(collection, 0);
    } catch (error) {
      this.logger.error(`Failed to create collection ${name}`, error);
      throw error;
    }
  }

  async getCollection(name: string): Promise<CollectionEntity | null> {
    try {
      const collection = await this.prisma.collection.findUnique({
        where: { name },
        include: {
          _count: {
            select: { vectors: true },
          },
        },
      });

      if (!collection) {
        return null;
      }

      return this.mapCollectionToEntity(collection, collection._count.vectors);
    } catch (error) {
      this.logger.error(`Failed to get collection ${name}`, error);
      throw error;
    }
  }

  async listCollections(): Promise<CollectionEntity[]> {
    try {
      const collections = await this.prisma.collection.findMany({
        include: {
          _count: {
            select: { vectors: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return collections.map((c) =>
        this.mapCollectionToEntity(c, c._count.vectors),
      );
    } catch (error) {
      this.logger.error('Failed to list collections', error);
      throw error;
    }
  }

  async deleteCollection(name: string): Promise<void> {
    try {
      await this.prisma.collection.delete({
        where: { name },
      });
      this.logger.log(`Deleted collection: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to delete collection ${name}`, error);
      throw error;
    }
  }

  async upsertVector(
    collectionName: string,
    vector: VectorEntity,
  ): Promise<string> {
    try {
      const collection = await this.getCollectionOrThrow(collectionName);

      // Validate dimension
      if (vector.embedding.length !== collection.dimension) {
        throw new Error(
          `Invalid embedding dimension. Expected ${collection.dimension}, got ${vector.embedding.length}`,
        );
      }

      const result = await this.prisma.vector.upsert({
        where: { id: vector.id },
        create: {
          id: vector.id,
          collectionId: collection.id,
          embedding: vector.embedding,
          text: vector.text,
          metadata: vector.metadata || {},
        },
        update: {
          embedding: vector.embedding,
          text: vector.text,
          metadata: vector.metadata || {},
        },
      });

      return result.id;
    } catch (error) {
      this.logger.error(`Failed to upsert vector in ${collectionName}`, error);
      throw error;
    }
  }

  async batchUpsert(
    collectionName: string,
    vectors: VectorEntity[],
  ): Promise<string[]> {
    try {
      const collection = await this.getCollectionOrThrow(collectionName);
      const ids: string[] = [];

      // Process in batches to avoid overwhelming the database
      const batchSize = this.configService.get<number>(
        'vectorDb.batchSize',
        100,
      );

      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        const results = await this.prisma.$transaction(
          batch.map((vector) => {
            // Validate dimension
            if (vector.embedding.length !== collection.dimension) {
              throw new Error(
                `Invalid embedding dimension for vector ${vector.id}. Expected ${collection.dimension}, got ${vector.embedding.length}`,
              );
            }

            return this.prisma.vector.upsert({
              where: { id: vector.id },
              create: {
                id: vector.id,
                collectionId: collection.id,
                embedding: vector.embedding,
                text: vector.text,
                metadata: vector.metadata || {},
              },
              update: {
                embedding: vector.embedding,
                text: vector.text,
                metadata: vector.metadata || {},
              },
            });
          }),
        );

        ids.push(...results.map((r) => r.id));
      }

      return ids;
    } catch (error) {
      this.logger.error(
        `Failed to batch upsert vectors in ${collectionName}`,
        error,
      );
      throw error;
    }
  }

  async searchSimilar(
    collectionName: string,
    queryVector: number[],
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    try {
      const collection = await this.getCollectionOrThrow(collectionName);

      // Validate dimension
      if (queryVector.length !== collection.dimension) {
        throw new Error(
          `Invalid query vector dimension. Expected ${collection.dimension}, got ${queryVector.length}`,
        );
      }

      // Build the distance operator based on metric
      const distanceOp = this.getDistanceOperator(options.metric);

      // Convert embedding array to pgvector format
      const vectorStr = `[${queryVector.join(',')}]`;

      // Build metadata filter if provided
      let metadataFilter = '';
      if (options.filter && Object.keys(options.filter).length > 0) {
        const conditions = Object.entries(options.filter).map(
          ([key, value]) => `metadata->>'${key}' = '${value}'`,
        );
        metadataFilter = ` AND ${conditions.join(' AND ')}`;
      }

      // Execute similarity search
      const query = `
        SELECT
          id,
          embedding,
          text,
          metadata,
          (embedding ${distanceOp} '${vectorStr}'::vector) as distance
        FROM vectors
        WHERE "collectionId" = '${collection.id}'
        ${metadataFilter}
        ORDER BY distance ${options.metric === DistanceMetric.EUCLIDEAN ? 'ASC' : 'DESC'}
        LIMIT ${options.topK}
      `;

      const results = await this.prisma.$queryRawUnsafe<any[]>(query);

      // Convert distance to similarity score and filter by threshold
      return results
        .map((r) => ({
          id: r.id,
          score: this.convertDistanceToScore(r.distance, options.metric),
          text: r.text,
          metadata: r.metadata,
          embedding: options.includeVectors ? r.embedding : undefined,
        }))
        .filter((r) => !options.minScore || r.score >= options.minScore);
    } catch (error) {
      this.logger.error(`Failed to search in ${collectionName}`, error);
      throw error;
    }
  }

  async deleteVector(collectionName: string, vectorId: string): Promise<void> {
    try {
      const collection = await this.getCollectionOrThrow(collectionName);

      await this.prisma.vector.delete({
        where: {
          id: vectorId,
          collectionId: collection.id,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to delete vector ${vectorId}`, error);
      throw error;
    }
  }

  async batchDelete(
    collectionName: string,
    vectorIds: string[],
  ): Promise<void> {
    try {
      const collection = await this.getCollectionOrThrow(collectionName);

      await this.prisma.vector.deleteMany({
        where: {
          id: { in: vectorIds },
          collectionId: collection.id,
        },
      });
    } catch (error) {
      this.logger.error('Failed to batch delete vectors', error);
      throw error;
    }
  }

  async getTotalVectorCount(): Promise<number> {
    try {
      return await this.prisma.vector.count();
    } catch (error) {
      this.logger.error('Failed to get total vector count', error);
      throw error;
    }
  }

  async getCollectionVectorCount(collectionName: string): Promise<number> {
    try {
      const collection = await this.getCollectionOrThrow(collectionName);

      return await this.prisma.vector.count({
        where: { collectionId: collection.id },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get vector count for ${collectionName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async ensurePgvectorExtension(): Promise<void> {
    try {
      await this.prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
      this.logger.log('pgvector extension verified');
    } catch (error) {
      this.logger.warn(
        'Could not create pgvector extension (may already exist)',
        error,
      );
    }
  }

  private async getCollectionOrThrow(name: string): Promise<CollectionEntity> {
    const collection = await this.getCollection(name);
    if (!collection) {
      throw new Error(`Collection not found: ${name}`);
    }
    return collection;
  }

  private mapCollectionToEntity(
    collection: any,
    vectorCount: number,
  ): CollectionEntity {
    return {
      id: collection.id,
      name: collection.name,
      dimension: collection.dimension,
      description: collection.description,
      metadata: collection.metadata as VectorMetadata,
      vectorCount,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  private getDistanceOperator(metric: DistanceMetric): string {
    switch (metric) {
      case DistanceMetric.COSINE:
        return '<=>'; // Cosine distance
      case DistanceMetric.EUCLIDEAN:
        return '<->'; // L2 distance
      case DistanceMetric.DOT_PRODUCT:
        return '<#>'; // Negative inner product
      default:
        return '<=>'; // Default to cosine
    }
  }

  private convertDistanceToScore(
    distance: number,
    metric: DistanceMetric,
  ): number {
    switch (metric) {
      case DistanceMetric.COSINE:
        // Cosine distance is 1 - cosine similarity, so similarity = 1 - distance
        return Math.max(0, Math.min(1, 1 - distance));
      case DistanceMetric.EUCLIDEAN:
        // Convert L2 distance to similarity score (inverse relationship)
        // Using 1 / (1 + distance) to normalize to 0-1 range
        return 1 / (1 + distance);
      case DistanceMetric.DOT_PRODUCT:
        // Negative inner product, so flip the sign
        return Math.max(0, -distance);
      default:
        return distance;
    }
  }
}
