import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import {
  SearchRequestDto,
  SearchResponseDto,
  SearchResultDto,
  SearchMode,
  SortOrder,
} from '../dto/search-request.dto';
import { IndexDocumentDto } from '../dto/index-document.dto';
import { ISearchProvider } from '../providers/search-provider.interface';
import { VectorSearchService } from './vector-search.service';
import { AnalyticsService } from './analytics.service';
import { SearchConfiguration } from '../config/search.config';

/**
 * Core search service orchestrating keyword and semantic search
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly config: SearchConfiguration;
  private prisma: PrismaClient;

  constructor(
    @Inject('SEARCH_PROVIDER') private searchProvider: ISearchProvider,
    private configService: ConfigService,
    private vectorSearchService: VectorSearchService,
    private analyticsService: AnalyticsService,
  ) {
    this.config = this.configService.get<SearchConfiguration>('search');
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.config.databaseUrl,
        },
      },
    });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Execute search with hybrid keyword + semantic capabilities
   */
  async executeSearch(
    request: SearchRequestDto,
  ): Promise<SearchResponseDto> {
    const startTime = Date.now();

    try {
      let results: SearchResultDto[] = [];
      let total = 0;

      // Determine search mode
      const mode = request.mode || SearchMode.HYBRID;
      const offset = ((request.page || 1) - 1) * (request.limit || 20);

      if (mode === SearchMode.KEYWORD || mode === SearchMode.HYBRID) {
        // Execute keyword search
        const keywordResults = await this.keywordSearch(request, offset);
        results = keywordResults;
        total = keywordResults.length;
      }

      if (
        (mode === SearchMode.SEMANTIC || mode === SearchMode.HYBRID) &&
        this.config.enableSemanticSearch
      ) {
        // Execute semantic search in parallel
        try {
          const semanticResults = await this.semanticSearch(request, offset);

          if (mode === SearchMode.HYBRID) {
            // Merge and re-rank results
            results = this.mergeAndRankResults(
              results,
              semanticResults,
              request,
            );
          } else {
            results = semanticResults;
          }

          total = Math.max(total, results.length);
        } catch (error) {
          this.logger.warn(
            `Semantic search failed, falling back to keyword only: ${error.message}`,
          );
          // Already have keyword results
        }
      }

      // Apply sorting
      results = this.sortResults(results, request.sortBy || SortOrder.RELEVANCE);

      // Paginate results
      const limit = request.limit || 20;
      const paginatedResults = results.slice(0, limit);

      // Generate suggestions if few/no results
      const suggestions =
        results.length < 3 ? await this.generateSuggestions(request.query) : [];

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      const executionTime = Date.now() - startTime;

      // Track analytics
      await this.analyticsService.trackQuery({
        query: request.query,
        userId: request.userId,
        resultsCount: total,
        executionTime,
        filters: {
          entityTypes: request.entityTypes,
          mode,
          ...request.filters,
        },
        entityType: request.entityTypes?.[0],
      });

      return {
        results: paginatedResults,
        total,
        page: request.page || 1,
        limit,
        totalPages,
        executionTime,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Search execution failed: ${error.message}`, error.stack);

      // Track failed query
      await this.analyticsService.trackQuery({
        query: request.query,
        userId: request.userId,
        resultsCount: 0,
        executionTime,
        filters: request.filters || {},
      });

      throw error;
    }
  }

  /**
   * Index a document for searching
   */
  async indexDocument(document: IndexDocumentDto): Promise<string> {
    const startTime = Date.now();

    try {
      // Index in search provider (PostgreSQL)
      const indexId = await this.searchProvider.indexDocument({
        entityType: document.entityType,
        entityId: document.entityId,
        title: document.title,
        content: document.content,
        metadata: document.metadata,
        rank: document.rank,
      });

      // Generate and store vector embedding if semantic search is enabled
      if (this.config.enableSemanticSearch) {
        try {
          const vectorId = await this.vectorSearchService.indexDocument({
            id: indexId,
            text: `${document.title} ${document.content}`,
            metadata: {
              entityType: document.entityType,
              entityId: document.entityId,
              ...document.metadata,
            },
          });

          // Update search index with vector ID
          await this.prisma.searchIndex.update({
            where: { id: indexId },
            data: { vectorId },
          });
        } catch (error) {
          this.logger.warn(
            `Failed to generate vector embedding for ${document.entityType}/${document.entityId}: ${error.message}`,
          );
          // Continue without vector - keyword search will still work
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Indexed document ${document.entityType}/${document.entityId} in ${processingTime}ms`,
      );

      return indexId;
    } catch (error) {
      this.logger.error(`Failed to index document: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove document from search index
   */
  async removeFromIndex(entityType: string, entityId: string): Promise<boolean> {
    try {
      // Get the document to find vector ID
      const doc = await this.searchProvider.getDocument(entityType, entityId);

      // Remove from search provider
      const removed = await this.searchProvider.removeDocument(
        entityType,
        entityId,
      );

      // Remove vector embedding if exists
      if (doc?.metadata?.vectorId && this.config.enableSemanticSearch) {
        try {
          await this.vectorSearchService.removeDocument(doc.metadata.vectorId as string);
        } catch (error) {
          this.logger.warn(
            `Failed to remove vector embedding: ${error.message}`,
          );
        }
      }

      return removed;
    } catch (error) {
      this.logger.error(
        `Failed to remove document ${entityType}/${entityId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Bulk reindex operation
   */
  async reindexAll(
    documents: IndexDocumentDto[],
    batchSize = 100,
  ): Promise<{ successful: number; failed: number; failedIds: string[] }> {
    let successful = 0;
    let failed = 0;
    const failedIds: string[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((doc) => this.indexDocument(doc)),
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful++;
        } else {
          failed++;
          const doc = batch[index];
          failedIds.push(`${doc.entityType}/${doc.entityId}`);
        }
      });
    }

    this.logger.log(
      `Reindex complete: ${successful} successful, ${failed} failed`,
    );

    return { successful, failed, failedIds };
  }

  /**
   * Keyword-based search using search provider
   */
  private async keywordSearch(
    request: SearchRequestDto,
    offset: number,
  ): Promise<SearchResultDto[]> {
    const results = await this.searchProvider.search({
      query: request.query,
      entityTypes: request.entityTypes,
      fuzzy: request.fuzzy !== false,
      filters: request.filters,
      limit: request.limit || 20,
      offset,
    });

    return results.map((result) => ({
      entityType: result.entityType,
      entityId: result.entityId,
      title: result.title,
      excerpt: this.generateExcerpt(result.content),
      score: result.score,
      metadata: result.metadata,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));
  }

  /**
   * Semantic search using vector embeddings
   */
  private async semanticSearch(
    request: SearchRequestDto,
    offset: number,
  ): Promise<SearchResultDto[]> {
    const vectorResults = await this.vectorSearchService.search({
      query: request.query,
      limit: request.limit || 20,
      filters: {
        entityType: request.entityTypes,
        ...request.filters,
      },
    });

    // Fetch full documents from search index
    const results: SearchResultDto[] = [];
    for (const vectorResult of vectorResults) {
      const doc = await this.prisma.searchIndex.findFirst({
        where: {
          vectorId: vectorResult.id,
        },
      });

      if (doc) {
        results.push({
          entityType: doc.entityType,
          entityId: doc.entityId,
          title: doc.title,
          excerpt: this.generateExcerpt(doc.content),
          score: vectorResult.score,
          metadata: doc.metadata as Record<string, any>,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
      }
    }

    return results;
  }

  /**
   * Merge keyword and semantic results with weighted scoring
   */
  private mergeAndRankResults(
    keywordResults: SearchResultDto[],
    semanticResults: SearchResultDto[],
    request: SearchRequestDto,
  ): SearchResultDto[] {
    const merged = new Map<string, SearchResultDto>();

    // Process keyword results
    keywordResults.forEach((result) => {
      const key = `${result.entityType}:${result.entityId}`;
      merged.set(key, {
        ...result,
        score: result.score * this.config.keywordSearchWeight,
      });
    });

    // Merge semantic results
    semanticResults.forEach((result) => {
      const key = `${result.entityType}:${result.entityId}`;
      const existing = merged.get(key);

      if (existing) {
        // Combine scores
        existing.score +=
          result.score * this.config.semanticSearchWeight;
      } else {
        merged.set(key, {
          ...result,
          score: result.score * this.config.semanticSearchWeight,
        });
      }
    });

    // Convert to array and sort by combined score
    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Sort results by specified order
   */
  private sortResults(
    results: SearchResultDto[],
    sortBy: SortOrder,
  ): SearchResultDto[] {
    switch (sortBy) {
      case SortOrder.DATE_DESC:
        return results.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        );
      case SortOrder.DATE_ASC:
        return results.sort(
          (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime(),
        );
      case SortOrder.POPULARITY:
        return results.sort((a, b) => {
          const aRank = (a.metadata?.rank as number) || 0;
          const bRank = (b.metadata?.rank as number) || 0;
          return bRank - aRank;
        });
      case SortOrder.RELEVANCE:
      default:
        return results.sort((a, b) => b.score - a.score);
    }
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string, maxLength = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Generate query suggestions for typos or zero results
   */
  private async generateSuggestions(query: string): Promise<string[]> {
    // Get similar terms from suggestions table
    const suggestions = await this.prisma.searchSuggestion.findMany({
      where: {
        term: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: {
        frequency: 'desc',
      },
      take: 5,
    });

    return suggestions.map((s) => s.term);
  }
}
