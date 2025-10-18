import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchConfiguration } from '../config/search.config';
import axios, { AxiosInstance } from 'axios';

interface VectorDocument {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

interface VectorSearchQuery {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
}

interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Vector DB integration for semantic search
 * Communicates with the Vector DB microservice
 */
@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly config: SearchConfiguration;
  private readonly client: AxiosInstance;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.config = this.configService.get<SearchConfiguration>('search');
    this.enabled = this.config.enableSemanticSearch && !!this.config.vectorDbUrl;

    if (this.enabled) {
      this.client = axios.create({
        baseURL: this.config.vectorDbUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(
        `Vector DB integration enabled: ${this.config.vectorDbUrl}`,
      );
    } else {
      this.logger.warn('Vector DB integration disabled');
    }
  }

  /**
   * Check if semantic search is available
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Index a document with vector embedding
   */
  async indexDocument(document: VectorDocument): Promise<string> {
    if (!this.enabled) {
      throw new Error('Vector DB is not enabled');
    }

    try {
      const response = await this.client.post('/api/vectors/index', {
        id: document.id,
        text: document.text,
        metadata: document.metadata,
      });

      this.logger.log(`Indexed document in Vector DB: ${document.id}`);
      return response.data.vectorId || document.id;
    } catch (error) {
      this.logger.error(
        `Failed to index document in Vector DB: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Perform semantic search using vector similarity
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.enabled) {
      this.logger.warn('Semantic search called but Vector DB is disabled');
      return [];
    }

    try {
      const response = await this.client.post('/api/vectors/search', {
        query: query.query,
        limit: query.limit || 20,
        filters: query.filters,
      });

      const results = response.data.results || [];
      this.logger.log(
        `Semantic search returned ${results.length} results for: "${query.query}"`,
      );

      return results.map((result: any) => ({
        id: result.id || result.vectorId,
        score: result.score || result.similarity || 0,
        metadata: result.metadata,
      }));
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.logger.warn('Vector DB service unavailable, skipping semantic search');
        return [];
      }

      this.logger.error(`Semantic search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove document from vector index
   */
  async removeDocument(vectorId: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      await this.client.delete(`/api/vectors/${vectorId}`);
      this.logger.log(`Removed document from Vector DB: ${vectorId}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.warn(`Vector not found in Vector DB: ${vectorId}`);
        return false;
      }

      this.logger.error(
        `Failed to remove document from Vector DB: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(documents: VectorDocument[]): Promise<string[]> {
    if (!this.enabled) {
      throw new Error('Vector DB is not enabled');
    }

    try {
      const response = await this.client.post('/api/vectors/bulk-index', {
        documents: documents.map((doc) => ({
          id: doc.id,
          text: doc.text,
          metadata: doc.metadata,
        })),
      });

      const vectorIds = response.data.vectorIds || [];
      this.logger.log(`Bulk indexed ${vectorIds.length} documents in Vector DB`);
      return vectorIds;
    } catch (error) {
      this.logger.error(`Bulk indexing failed in Vector DB: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get similar documents by ID
   */
  async getSimilarDocuments(
    vectorId: string,
    limit = 10,
  ): Promise<VectorSearchResult[]> {
    if (!this.enabled) {
      return [];
    }

    try {
      const response = await this.client.get(`/api/vectors/${vectorId}/similar`, {
        params: { limit },
      });

      return response.data.results || [];
    } catch (error) {
      this.logger.error(
        `Failed to get similar documents: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Health check for Vector DB service
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await this.client.get('/api/health');
      return response.status === 200 && response.data.status === 'ok';
    } catch (error) {
      this.logger.error(`Vector DB health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get Vector DB statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    dimensions: number;
    indexSize: number;
  } | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await this.client.get('/api/vectors/stats');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get Vector DB stats: ${error.message}`);
      return null;
    }
  }
}
