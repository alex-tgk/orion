import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { IVectorProvider } from '../interfaces/vector-provider.interface';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { CollectionResponseDto } from '../dto/vector-response.dto';

/**
 * Collection Service
 * Manages vector collections (namespaces)
 */
@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(private readonly vectorProvider: IVectorProvider) {}

  /**
   * Create a new collection
   */
  async createCollection(
    dto: CreateCollectionDto,
  ): Promise<CollectionResponseDto> {
    try {
      // Check if collection already exists
      const existing = await this.vectorProvider.getCollection(dto.name);
      if (existing) {
        throw new ConflictException(`Collection '${dto.name}' already exists`);
      }

      const collection = await this.vectorProvider.createCollection(
        dto.name,
        dto.dimension,
        dto.description,
        dto.metadata,
      );

      this.logger.log(
        `Created collection: ${dto.name} with dimension ${dto.dimension}`,
      );

      return this.mapToResponseDto(collection);
    } catch (error) {
      this.logger.error('Failed to create collection', error);
      throw error;
    }
  }

  /**
   * Get a collection by name
   */
  async getCollection(name: string): Promise<CollectionResponseDto> {
    try {
      const collection = await this.vectorProvider.getCollection(name);
      if (!collection) {
        throw new NotFoundException(`Collection '${name}' not found`);
      }

      return this.mapToResponseDto(collection);
    } catch (error) {
      this.logger.error(`Failed to get collection ${name}`, error);
      throw error;
    }
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<CollectionResponseDto[]> {
    try {
      const collections = await this.vectorProvider.listCollections();
      return collections.map(this.mapToResponseDto);
    } catch (error) {
      this.logger.error('Failed to list collections', error);
      throw error;
    }
  }

  /**
   * Delete a collection and all its vectors
   */
  async deleteCollection(name: string): Promise<{ deleted: boolean }> {
    try {
      // Verify collection exists
      const collection = await this.vectorProvider.getCollection(name);
      if (!collection) {
        throw new NotFoundException(`Collection '${name}' not found`);
      }

      await this.vectorProvider.deleteCollection(name);

      this.logger.log(`Deleted collection: ${name}`);

      return { deleted: true };
    } catch (error) {
      this.logger.error(`Failed to delete collection ${name}`, error);
      throw error;
    }
  }

  /**
   * Get statistics for a collection
   */
  async getCollectionStats(name: string): Promise<{
    name: string;
    dimension: number;
    vectorCount: number;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      const collection = await this.vectorProvider.getCollection(name);
      if (!collection) {
        throw new NotFoundException(`Collection '${name}' not found`);
      }

      return {
        name: collection.name,
        dimension: collection.dimension,
        vectorCount: collection.vectorCount,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for collection ${name}`, error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private mapToResponseDto(collection: any): CollectionResponseDto {
    return {
      id: collection.id,
      name: collection.name,
      dimension: collection.dimension,
      description: collection.description,
      metadata: collection.metadata,
      vectorCount: collection.vectorCount,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }
}
