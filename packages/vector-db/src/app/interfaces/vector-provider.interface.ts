import { DistanceMetric } from '../config/vector-db.config';

/**
 * Vector metadata interface
 */
export interface VectorMetadata {
  [key: string]: string | number | boolean | null;
}

/**
 * Vector entity interface
 */
export interface VectorEntity {
  id: string;
  embedding: number[];
  text?: string;
  metadata?: VectorMetadata;
}

/**
 * Collection entity interface
 */
export interface CollectionEntity {
  id: string;
  name: string;
  dimension: number;
  description?: string;
  metadata?: VectorMetadata;
  vectorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search result interface
 */
export interface SearchResult {
  id: string;
  score: number;
  text?: string;
  metadata?: VectorMetadata;
  embedding?: number[];
}

/**
 * Search options interface
 */
export interface SearchOptions {
  topK: number;
  minScore?: number;
  metric: DistanceMetric;
  filter?: VectorMetadata;
  includeVectors?: boolean;
}

/**
 * Abstract interface for vector database providers
 * Supports multiple backends: PostgreSQL+pgvector, Pinecone, Qdrant, Weaviate
 */
export interface IVectorProvider {
  /**
   * Initialize connection to the vector database
   */
  connect(): Promise<void>;

  /**
   * Close connection to the vector database
   */
  disconnect(): Promise<void>;

  /**
   * Check if the provider is connected and healthy
   */
  isHealthy(): Promise<boolean>;

  /**
   * Create a new collection with specified dimension
   */
  createCollection(
    name: string,
    dimension: number,
    description?: string,
    metadata?: VectorMetadata,
  ): Promise<CollectionEntity>;

  /**
   * Get collection by name
   */
  getCollection(name: string): Promise<CollectionEntity | null>;

  /**
   * List all collections
   */
  listCollections(): Promise<CollectionEntity[]>;

  /**
   * Delete a collection and all its vectors
   */
  deleteCollection(name: string): Promise<void>;

  /**
   * Upsert a single vector into a collection
   */
  upsertVector(collectionName: string, vector: VectorEntity): Promise<string>;

  /**
   * Upsert multiple vectors in batch
   */
  batchUpsert(
    collectionName: string,
    vectors: VectorEntity[],
  ): Promise<string[]>;

  /**
   * Search for similar vectors
   */
  searchSimilar(
    collectionName: string,
    queryVector: number[],
    options: SearchOptions,
  ): Promise<SearchResult[]>;

  /**
   * Delete a vector by ID
   */
  deleteVector(collectionName: string, vectorId: string): Promise<void>;

  /**
   * Delete multiple vectors by IDs
   */
  batchDelete(collectionName: string, vectorIds: string[]): Promise<void>;

  /**
   * Get total vector count across all collections
   */
  getTotalVectorCount(): Promise<number>;

  /**
   * Get vector count for a specific collection
   */
  getCollectionVectorCount(collectionName: string): Promise<number>;
}
