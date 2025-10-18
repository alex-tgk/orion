import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  ISearchProvider,
  SearchQuery,
  SearchResult,
  IndexDocument,
} from './search-provider.interface';

/**
 * PostgreSQL Full-Text Search Provider
 * Uses PostgreSQL's tsvector and tsquery for full-text search
 */
@Injectable()
export class PostgresSearchProvider implements ISearchProvider {
  private readonly logger = new Logger(PostgresSearchProvider.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env['SEARCH_DATABASE_URL'] || process.env['DATABASE_URL'],
        },
      },
    });
  }

  async onModuleInit() {
    await this.prisma.$connect();
    await this.ensureSearchIndexes();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Execute full-text search with PostgreSQL
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const {
      query: searchTerm,
      entityTypes,
      fuzzy = true,
      filters,
      limit = 100,
      offset = 0,
    } = query;

    try {
      // Build the tsquery with proper formatting
      const tsQuery = this.buildTsQuery(searchTerm, fuzzy);

      // Build WHERE conditions
      const whereConditions: any = {};
      if (entityTypes && entityTypes.length > 0) {
        whereConditions.entityType = { in: entityTypes };
      }

      // Apply metadata filters if provided
      if (filters && Object.keys(filters).length > 0) {
        // PostgreSQL JSON query for metadata
        whereConditions.metadata = {
          path: Object.keys(filters),
          equals: filters,
        };
      }

      // Execute search with raw SQL for tsvector
      const results = await this.prisma.$queryRaw<any[]>`
        SELECT
          id,
          entity_type as "entityType",
          entity_id as "entityId",
          title,
          content,
          metadata,
          rank,
          created_at as "createdAt",
          updated_at as "updatedAt",
          ts_rank_cd(
            to_tsvector('english', title || ' ' || content),
            to_tsquery('english', ${tsQuery})
          ) as score
        FROM search_index
        WHERE
          to_tsvector('english', title || ' ' || content) @@ to_tsquery('english', ${tsQuery})
          ${entityTypes && entityTypes.length > 0 ? this.prisma.$queryRaw`AND entity_type = ANY(${entityTypes})` : this.prisma.$queryRaw``}
        ORDER BY score DESC, rank DESC, updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return results.map((row) => ({
        entityType: row.entityType,
        entityId: row.entityId,
        title: row.title,
        content: row.content,
        score: parseFloat(row.score) || 0,
        metadata: row.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Index a document for full-text search
   */
  async indexDocument(document: IndexDocument): Promise<string> {
    const { entityType, entityId, title, content, metadata, rank } = document;

    try {
      const result = await this.prisma.searchIndex.upsert({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
        create: {
          entityType,
          entityId,
          title,
          content,
          metadata: metadata || {},
          rank: rank || 0,
        },
        update: {
          title,
          content,
          metadata: metadata || {},
          rank: rank || 0,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Indexed document: ${entityType}/${entityId} (ID: ${result.id})`,
      );
      return result.id;
    } catch (error) {
      this.logger.error(
        `Failed to index document ${entityType}/${entityId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Remove document from search index
   */
  async removeDocument(entityType: string, entityId: string): Promise<boolean> {
    try {
      await this.prisma.searchIndex.delete({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
      });

      this.logger.log(`Removed document from index: ${entityType}/${entityId}`);
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        // Record not found
        this.logger.warn(
          `Document not found in index: ${entityType}/${entityId}`,
        );
        return false;
      }
      this.logger.error(
        `Failed to remove document ${entityType}/${entityId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Bulk index multiple documents
   */
  async bulkIndex(documents: IndexDocument[]): Promise<string[]> {
    const ids: string[] = [];

    // Process in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        const results = await Promise.allSettled(
          batch.map((doc) => this.indexDocument(doc)),
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            ids.push(result.value);
          } else {
            this.logger.error(
              `Failed to index document in batch: ${batch[index].entityType}/${batch[index].entityId}`,
            );
          }
        });
      } catch (error) {
        this.logger.error(`Batch indexing failed: ${error.message}`);
      }
    }

    return ids;
  }

  /**
   * Update document rank/score
   */
  async updateRank(
    entityType: string,
    entityId: string,
    rank: number,
  ): Promise<boolean> {
    try {
      await this.prisma.searchIndex.update({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
        data: {
          rank,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update rank for ${entityType}/${entityId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Get document by entity
   */
  async getDocument(
    entityType: string,
    entityId: string,
  ): Promise<SearchResult | null> {
    try {
      const doc = await this.prisma.searchIndex.findUnique({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
      });

      if (!doc) {
        return null;
      }

      return {
        entityType: doc.entityType,
        entityId: doc.entityId,
        title: doc.title,
        content: doc.content,
        score: doc.rank,
        metadata: doc.metadata as Record<string, any>,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get document ${entityType}/${entityId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Health check for PostgreSQL connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Build tsquery string with proper formatting
   */
  private buildTsQuery(query: string, fuzzy: boolean): string {
    // Clean and tokenize the query
    const terms = query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 0);

    if (terms.length === 0) {
      return '';
    }

    // Build tsquery with & (AND) operator
    if (fuzzy) {
      // Add prefix matching with :* for fuzzy search
      return terms.map((term) => `${term}:*`).join(' & ');
    } else {
      // Exact matching
      return terms.join(' & ');
    }
  }

  /**
   * Ensure required database indexes exist
   */
  private async ensureSearchIndexes(): Promise<void> {
    try {
      // Create GIN index for full-text search if it doesn't exist
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_search_index_fulltext
        ON search_index
        USING GIN (to_tsvector('english', title || ' ' || content))
      `;

      this.logger.log('Search indexes verified');
    } catch (error) {
      this.logger.error(`Failed to create indexes: ${error.message}`);
    }
  }
}
