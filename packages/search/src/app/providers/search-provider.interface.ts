/**
 * Abstract interface for search providers
 * Allows switching between PostgreSQL, Elasticsearch, Typesense, etc.
 */

export interface SearchQuery {
  query: string;
  entityTypes?: string[];
  fuzzy?: boolean;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entityType: string;
  entityId: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndexDocument {
  entityType: string;
  entityId: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  rank?: number;
}

export abstract class ISearchProvider {
  /**
   * Execute a search query
   */
  abstract search(query: SearchQuery): Promise<SearchResult[]>;

  /**
   * Index a document for searching
   */
  abstract indexDocument(document: IndexDocument): Promise<string>;

  /**
   * Remove a document from the search index
   */
  abstract removeDocument(
    entityType: string,
    entityId: string,
  ): Promise<boolean>;

  /**
   * Bulk index multiple documents
   */
  abstract bulkIndex(documents: IndexDocument[]): Promise<string[]>;

  /**
   * Update the rank/score of a document
   */
  abstract updateRank(
    entityType: string,
    entityId: string,
    rank: number,
  ): Promise<boolean>;

  /**
   * Get document by entity
   */
  abstract getDocument(
    entityType: string,
    entityId: string,
  ): Promise<SearchResult | null>;

  /**
   * Check provider health
   */
  abstract healthCheck(): Promise<boolean>;
}
