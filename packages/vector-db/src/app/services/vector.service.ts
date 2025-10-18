import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IVectorProvider,
  SearchResult,
} from '../interfaces/vector-provider.interface';
import { DistanceMetric } from '../config/vector-db.config';
import {
  UpsertVectorDto,
  BatchUpsertDto,
  SearchVectorDto,
  HybridSearchDto,
} from '../dto';
import {
  VectorResultDto,
  SearchResponseDto,
  BatchOperationResponseDto,
} from '../dto/vector-response.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Vector Service
 * Handles all vector operations including upsert, search, and deletion
 */
@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);

  constructor(
    private readonly vectorProvider: IVectorProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Upsert a single vector into a collection
   */
  async upsertVector(dto: UpsertVectorDto): Promise<{ id: string }> {
    try {
      // Generate ID if not provided
      const vectorId = dto.id || uuidv4();

      // Validate collection exists
      const collection = await this.vectorProvider.getCollection(
        dto.collectionName,
      );
      if (!collection) {
        throw new NotFoundException(
          `Collection '${dto.collectionName}' not found`,
        );
      }

      // Validate dimension
      if (dto.embedding.length !== collection.dimension) {
        throw new BadRequestException(
          `Invalid embedding dimension. Expected ${collection.dimension}, got ${dto.embedding.length}`,
        );
      }

      const id = await this.vectorProvider.upsertVector(dto.collectionName, {
        id: vectorId,
        embedding: dto.embedding,
        text: dto.text,
        metadata: dto.metadata,
      });

      this.logger.log(
        `Upserted vector ${id} in collection ${dto.collectionName}`,
      );

      return { id };
    } catch (error) {
      this.logger.error('Failed to upsert vector', error);
      throw error;
    }
  }

  /**
   * Batch upsert vectors into a collection
   */
  async batchUpsert(dto: BatchUpsertDto): Promise<BatchOperationResponseDto> {
    const startTime = Date.now();
    const successfulIds: string[] = [];
    const errors: Array<{ id?: string; error: string }> = [];

    try {
      // Validate collection exists
      const collection = await this.vectorProvider.getCollection(
        dto.collectionName,
      );
      if (!collection) {
        throw new NotFoundException(
          `Collection '${dto.collectionName}' not found`,
        );
      }

      // Prepare vectors with IDs
      const vectorsWithIds = dto.vectors.map((v) => ({
        id: v.id || uuidv4(),
        embedding: v.embedding,
        text: v.text,
        metadata: v.metadata,
      }));

      // Validate all dimensions
      for (const vector of vectorsWithIds) {
        if (vector.embedding.length !== collection.dimension) {
          errors.push({
            id: vector.id,
            error: `Invalid dimension: expected ${collection.dimension}, got ${vector.embedding.length}`,
          });
        }
      }

      // Filter out invalid vectors
      const validVectors = vectorsWithIds.filter(
        (v) => !errors.some((e) => e.id === v.id),
      );

      if (validVectors.length === 0) {
        throw new BadRequestException('No valid vectors to upsert');
      }

      // Batch upsert valid vectors
      const ids = await this.vectorProvider.batchUpsert(
        dto.collectionName,
        validVectors,
      );
      successfulIds.push(...ids);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Batch upserted ${successfulIds.length} vectors in ${duration}ms`,
      );

      return {
        successCount: successfulIds.length,
        failureCount: errors.length,
        successfulIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to batch upsert vectors', error);
      throw error;
    }
  }

  /**
   * Search for similar vectors using vector similarity
   */
  async searchSimilar(dto: SearchVectorDto): Promise<SearchResponseDto> {
    const startTime = Date.now();

    try {
      // Validate collection exists
      const collection = await this.vectorProvider.getCollection(
        dto.collectionName,
      );
      if (!collection) {
        throw new NotFoundException(
          `Collection '${dto.collectionName}' not found`,
        );
      }

      // Validate query vector dimension
      if (dto.queryVector.length !== collection.dimension) {
        throw new BadRequestException(
          `Invalid query vector dimension. Expected ${collection.dimension}, got ${dto.queryVector.length}`,
        );
      }

      // Perform similarity search
      const results = await this.vectorProvider.searchSimilar(
        dto.collectionName,
        dto.queryVector,
        {
          topK: dto.topK || 10,
          minScore: dto.minScore,
          metric: dto.metric || DistanceMetric.COSINE,
          filter: dto.filter,
          includeVectors: dto.includeVectors,
        },
      );

      const queryTime = Date.now() - startTime;

      return {
        collectionName: dto.collectionName,
        results: results.map(this.mapToVectorResultDto),
        total: results.length,
        queryTime,
      };
    } catch (error) {
      this.logger.error('Failed to search similar vectors', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector similarity and keyword search
   */
  async hybridSearch(dto: HybridSearchDto): Promise<SearchResponseDto> {
    const startTime = Date.now();

    try {
      // Perform vector search
      const vectorResults = await this.vectorProvider.searchSimilar(
        dto.collectionName,
        dto.queryVector,
        {
          topK: (dto.topK || 10) * 2, // Get more results for merging
          minScore: dto.minScore,
          metric: dto.metric || DistanceMetric.COSINE,
          filter: dto.filter,
          includeVectors: dto.includeVectors,
        },
      );

      // Perform keyword filtering (simple text matching)
      const keywordResults = this.filterByKeywords(vectorResults, dto.keywords);

      // Merge results with weighted scores
      const mergedResults = this.mergeSearchResults(
        vectorResults,
        keywordResults,
        dto.vectorWeight || 0.7,
      );

      // Take top K results
      const topResults = mergedResults.slice(0, dto.topK);

      const queryTime = Date.now() - startTime;

      return {
        collectionName: dto.collectionName,
        results: topResults.map(this.mapToVectorResultDto),
        total: topResults.length,
        queryTime,
      };
    } catch (error) {
      this.logger.error('Failed to perform hybrid search', error);
      throw error;
    }
  }

  /**
   * Delete a vector by ID
   */
  async deleteVector(
    collectionName: string,
    vectorId: string,
  ): Promise<{ deleted: boolean }> {
    try {
      await this.vectorProvider.deleteVector(collectionName, vectorId);
      this.logger.log(`Deleted vector ${vectorId} from ${collectionName}`);
      return { deleted: true };
    } catch (error) {
      this.logger.error('Failed to delete vector', error);
      throw error;
    }
  }

  /**
   * Batch delete vectors
   */
  async batchDelete(
    collectionName: string,
    vectorIds: string[],
  ): Promise<BatchOperationResponseDto> {
    try {
      await this.vectorProvider.batchDelete(collectionName, vectorIds);

      this.logger.log(
        `Batch deleted ${vectorIds.length} vectors from ${collectionName}`,
      );

      return {
        successCount: vectorIds.length,
        failureCount: 0,
        successfulIds: vectorIds,
      };
    } catch (error) {
      this.logger.error('Failed to batch delete vectors', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private mapToVectorResultDto(result: SearchResult): VectorResultDto {
    return {
      id: result.id,
      score: result.score,
      text: result.text,
      metadata: result.metadata,
      embedding: result.embedding,
    };
  }

  private filterByKeywords(
    results: SearchResult[],
    keywords: string,
  ): SearchResult[] {
    const keywordLower = keywords.toLowerCase();
    return results.filter((r) => {
      if (!r.text) return false;
      return r.text.toLowerCase().includes(keywordLower);
    });
  }

  private mergeSearchResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    vectorWeight: number,
  ): SearchResult[] {
    const keywordWeight = 1 - vectorWeight;
    const resultMap = new Map<string, SearchResult>();

    // Add vector results with weighted scores
    vectorResults.forEach((result) => {
      resultMap.set(result.id, {
        ...result,
        score: result.score * vectorWeight,
      });
    });

    // Add or update with keyword results
    keywordResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Boost score if found in both
        existing.score += keywordWeight;
      } else {
        // Add keyword-only result
        resultMap.set(result.id, {
          ...result,
          score: result.score * keywordWeight,
        });
      }
    });

    // Sort by combined score
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
  }
}
