import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CollectionService } from '../collection.service';
import { IVectorProvider, CollectionEntity } from '../../interfaces/vector-provider.interface';
import { CreateCollectionDto } from '../../dto/create-collection.dto';

describe('CollectionService', () => {
  let service: CollectionService;
  let vectorProvider: jest.Mocked<IVectorProvider>;

  const mockCollection: CollectionEntity = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'test-collection',
    dimension: 1536,
    description: 'Test collection',
    metadata: { source: 'test' },
    vectorCount: 100,
    createdAt: new Date('2025-10-18T12:00:00.000Z'),
    updatedAt: new Date('2025-10-18T14:00:00.000Z'),
  };

  const mockVectorProvider = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isHealthy: jest.fn(),
    createCollection: jest.fn(),
    getCollection: jest.fn(),
    listCollections: jest.fn(),
    deleteCollection: jest.fn(),
    upsertVector: jest.fn(),
    batchUpsert: jest.fn(),
    searchSimilar: jest.fn(),
    deleteVector: jest.fn(),
    batchDelete: jest.fn(),
    getTotalVectorCount: jest.fn(),
    getCollectionVectorCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: 'IVectorProvider',
          useValue: mockVectorProvider,
        },
      ],
    }).compile();

    service = module.get<CollectionService>(CollectionService);
    vectorProvider = module.get('IVectorProvider');

    jest.clearAllMocks();
  });

  describe('createCollection', () => {
    it('should create a new collection successfully', async () => {
      const dto: CreateCollectionDto = {
        name: 'new-collection',
        dimension: 1536,
        description: 'New collection',
        metadata: { source: 'api' },
      };

      mockVectorProvider.getCollection.mockResolvedValue(null);
      mockVectorProvider.createCollection.mockResolvedValue(mockCollection);

      const result = await service.createCollection(dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockCollection.name);
      expect(vectorProvider.getCollection).toHaveBeenCalledWith(dto.name);
      expect(vectorProvider.createCollection).toHaveBeenCalledWith(
        dto.name,
        dto.dimension,
        dto.description,
        dto.metadata,
      );
    });

    it('should throw ConflictException if collection already exists', async () => {
      const dto: CreateCollectionDto = {
        name: 'existing-collection',
        dimension: 1536,
      };

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);

      await expect(service.createCollection(dto)).rejects.toThrow(ConflictException);
      expect(vectorProvider.getCollection).toHaveBeenCalledWith(dto.name);
      expect(vectorProvider.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('getCollection', () => {
    it('should return a collection by name', async () => {
      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);

      const result = await service.getCollection('test-collection');

      expect(result).toBeDefined();
      expect(result.name).toBe('test-collection');
      expect(vectorProvider.getCollection).toHaveBeenCalledWith('test-collection');
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      mockVectorProvider.getCollection.mockResolvedValue(null);

      await expect(service.getCollection('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listCollections', () => {
    it('should return all collections', async () => {
      const collections = [mockCollection];
      mockVectorProvider.listCollections.mockResolvedValue(collections);

      const result = await service.listCollections();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-collection');
      expect(vectorProvider.listCollections).toHaveBeenCalled();
    });

    it('should return empty array when no collections exist', async () => {
      mockVectorProvider.listCollections.mockResolvedValue([]);

      const result = await service.listCollections();

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteCollection', () => {
    it('should delete a collection successfully', async () => {
      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.deleteCollection.mockResolvedValue();

      const result = await service.deleteCollection('test-collection');

      expect(result).toEqual({ deleted: true });
      expect(vectorProvider.getCollection).toHaveBeenCalledWith('test-collection');
      expect(vectorProvider.deleteCollection).toHaveBeenCalledWith('test-collection');
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      mockVectorProvider.getCollection.mockResolvedValue(null);

      await expect(service.deleteCollection('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(vectorProvider.deleteCollection).not.toHaveBeenCalled();
    });
  });

  describe('getCollectionStats', () => {
    it('should return collection statistics', async () => {
      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);

      const result = await service.getCollectionStats('test-collection');

      expect(result.name).toBe('test-collection');
      expect(result.dimension).toBe(1536);
      expect(result.vectorCount).toBe(100);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException for non-existent collection', async () => {
      mockVectorProvider.getCollection.mockResolvedValue(null);

      await expect(service.getCollectionStats('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
