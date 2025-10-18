import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VectorService } from '../vector.service';
import { IVectorProvider, CollectionEntity, SearchResult } from '../../interfaces/vector-provider.interface';
import { UpsertVectorDto, BatchUpsertDto, SearchVectorDto, HybridSearchDto } from '../../dto';
import { DistanceMetric } from '../../config/vector-db.config';

describe('VectorService', () => {
  let service: VectorService;
  let vectorProvider: jest.Mocked<IVectorProvider>;
  let configService: jest.Mocked<ConfigService>;

  const mockCollection: CollectionEntity = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'test-collection',
    dimension: 1536,
    description: 'Test collection',
    metadata: {},
    vectorCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        {
          provide: 'IVectorProvider',
          useValue: mockVectorProvider,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    vectorProvider = module.get('IVectorProvider');
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('upsertVector', () => {
    it('should upsert a vector successfully', async () => {
      const dto: UpsertVectorDto = {
        collectionName: 'test-collection',
        embedding: Array(1536).fill(0.1),
        text: 'Test document',
        metadata: { category: 'test' },
      };

      const vectorId = '550e8400-e29b-41d4-a716-446655440001';

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.upsertVector.mockResolvedValue(vectorId);

      const result = await service.upsertVector(dto);

      expect(result).toEqual({ id: vectorId });
      expect(vectorProvider.getCollection).toHaveBeenCalledWith(dto.collectionName);
      expect(vectorProvider.upsertVector).toHaveBeenCalled();
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      const dto: UpsertVectorDto = {
        collectionName: 'non-existent',
        embedding: Array(1536).fill(0.1),
      };

      mockVectorProvider.getCollection.mockResolvedValue(null);

      await expect(service.upsertVector(dto)).rejects.toThrow(NotFoundException);
      expect(vectorProvider.getCollection).toHaveBeenCalledWith(dto.collectionName);
    });

    it('should throw BadRequestException for invalid dimension', async () => {
      const dto: UpsertVectorDto = {
        collectionName: 'test-collection',
        embedding: Array(768).fill(0.1), // Wrong dimension
      };

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);

      await expect(service.upsertVector(dto)).rejects.toThrow(BadRequestException);
    });

    it('should generate ID if not provided', async () => {
      const dto: UpsertVectorDto = {
        collectionName: 'test-collection',
        embedding: Array(1536).fill(0.1),
        // No ID provided
      };

      const generatedId = '550e8400-e29b-41d4-a716-446655440002';

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.upsertVector.mockResolvedValue(generatedId);

      const result = await service.upsertVector(dto);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });
  });

  describe('batchUpsert', () => {
    it('should batch upsert vectors successfully', async () => {
      const dto: BatchUpsertDto = {
        collectionName: 'test-collection',
        vectors: [
          { embedding: Array(1536).fill(0.1), text: 'Doc 1' },
          { embedding: Array(1536).fill(0.2), text: 'Doc 2' },
          { embedding: Array(1536).fill(0.3), text: 'Doc 3' },
        ],
      };

      const vectorIds = ['id1', 'id2', 'id3'];

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.batchUpsert.mockResolvedValue(vectorIds);
      mockConfigService.get.mockReturnValue(100); // batchSize

      const result = await service.batchUpsert(dto);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.successfulIds).toEqual(vectorIds);
      expect(vectorProvider.batchUpsert).toHaveBeenCalled();
    });

    it('should handle partial failures in batch upsert', async () => {
      const dto: BatchUpsertDto = {
        collectionName: 'test-collection',
        vectors: [
          { embedding: Array(1536).fill(0.1) },
          { embedding: Array(768).fill(0.2) }, // Invalid dimension
          { embedding: Array(1536).fill(0.3) },
        ],
      };

      const validVectorIds = ['id1', 'id3'];

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.batchUpsert.mockResolvedValue(validVectorIds);
      mockConfigService.get.mockReturnValue(100);

      const result = await service.batchUpsert(dto);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBe(1);
    });

    it('should throw NotFoundException for non-existent collection', async () => {
      const dto: BatchUpsertDto = {
        collectionName: 'non-existent',
        vectors: [{ embedding: Array(1536).fill(0.1) }],
      };

      mockVectorProvider.getCollection.mockResolvedValue(null);

      await expect(service.batchUpsert(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchSimilar', () => {
    it('should search similar vectors successfully', async () => {
      const dto: SearchVectorDto = {
        collectionName: 'test-collection',
        queryVector: Array(1536).fill(0.1),
        topK: 10,
        metric: DistanceMetric.COSINE,
      };

      const searchResults: SearchResult[] = [
        {
          id: 'id1',
          score: 0.95,
          text: 'Similar document 1',
          metadata: { category: 'test' },
        },
        {
          id: 'id2',
          score: 0.85,
          text: 'Similar document 2',
          metadata: { category: 'test' },
        },
      ];

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.searchSimilar.mockResolvedValue(searchResults);

      const result = await service.searchSimilar(dto);

      expect(result.collectionName).toBe(dto.collectionName);
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.queryTime).toBeGreaterThan(0);
      expect(vectorProvider.searchSimilar).toHaveBeenCalledWith(
        dto.collectionName,
        dto.queryVector,
        expect.objectContaining({
          topK: 10,
          metric: DistanceMetric.COSINE,
        }),
      );
    });

    it('should throw BadRequestException for invalid query vector dimension', async () => {
      const dto: SearchVectorDto = {
        collectionName: 'test-collection',
        queryVector: Array(768).fill(0.1), // Wrong dimension
        topK: 10,
      };

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);

      await expect(service.searchSimilar(dto)).rejects.toThrow(BadRequestException);
    });

    it('should return empty results when no matches found', async () => {
      const dto: SearchVectorDto = {
        collectionName: 'test-collection',
        queryVector: Array(1536).fill(0.1),
        topK: 10,
        minScore: 0.99, // Very high threshold
      };

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.searchSimilar.mockResolvedValue([]);

      const result = await service.searchSimilar(dto);

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should apply metadata filters', async () => {
      const dto: SearchVectorDto = {
        collectionName: 'test-collection',
        queryVector: Array(1536).fill(0.1),
        topK: 10,
        filter: { category: 'technical' },
      };

      const searchResults: SearchResult[] = [
        {
          id: 'id1',
          score: 0.90,
          text: 'Technical document',
          metadata: { category: 'technical' },
        },
      ];

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.searchSimilar.mockResolvedValue(searchResults);

      const result = await service.searchSimilar(dto);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].metadata?.category).toBe('technical');
      expect(vectorProvider.searchSimilar).toHaveBeenCalledWith(
        dto.collectionName,
        dto.queryVector,
        expect.objectContaining({
          filter: { category: 'technical' },
        }),
      );
    });
  });

  describe('hybridSearch', () => {
    it('should perform hybrid search successfully', async () => {
      const dto: HybridSearchDto = {
        collectionName: 'test-collection',
        queryVector: Array(1536).fill(0.1),
        keywords: 'machine learning',
        topK: 5,
        vectorWeight: 0.7,
      };

      const searchResults: SearchResult[] = [
        {
          id: 'id1',
          score: 0.90,
          text: 'Machine learning algorithms',
          metadata: {},
        },
        {
          id: 'id2',
          score: 0.80,
          text: 'Deep learning tutorial',
          metadata: {},
        },
      ];

      mockVectorProvider.getCollection.mockResolvedValue(mockCollection);
      mockVectorProvider.searchSimilar.mockResolvedValue(searchResults);

      const result = await service.hybridSearch(dto);

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.collectionName).toBe(dto.collectionName);
      expect(result.queryTime).toBeGreaterThan(0);
    });
  });

  describe('deleteVector', () => {
    it('should delete a vector successfully', async () => {
      const collectionName = 'test-collection';
      const vectorId = '550e8400-e29b-41d4-a716-446655440000';

      mockVectorProvider.deleteVector.mockResolvedValue();

      const result = await service.deleteVector(collectionName, vectorId);

      expect(result).toEqual({ deleted: true });
      expect(vectorProvider.deleteVector).toHaveBeenCalledWith(collectionName, vectorId);
    });
  });

  describe('batchDelete', () => {
    it('should batch delete vectors successfully', async () => {
      const collectionName = 'test-collection';
      const vectorIds = ['id1', 'id2', 'id3'];

      mockVectorProvider.batchDelete.mockResolvedValue();

      const result = await service.batchDelete(collectionName, vectorIds);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.successfulIds).toEqual(vectorIds);
      expect(vectorProvider.batchDelete).toHaveBeenCalledWith(collectionName, vectorIds);
    });
  });
});
