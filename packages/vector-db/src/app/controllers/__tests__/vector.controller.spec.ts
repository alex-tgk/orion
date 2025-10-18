import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VectorController } from '../vector.controller';
import { VectorService } from '../../services/vector.service';
import {
  UpsertVectorDto,
  BatchUpsertDto,
  SearchVectorDto,
  HybridSearchDto,
  SearchResponseDto,
  BatchOperationResponseDto,
} from '../../dto';
import { DistanceMetric } from '../../config/vector-db.config';

describe('VectorController', () => {
  let controller: VectorController;
  let service: VectorService;

  const mockVectorService = {
    upsertVector: jest.fn(),
    batchUpsert: jest.fn(),
    searchSimilar: jest.fn(),
    hybridSearch: jest.fn(),
    deleteVector: jest.fn(),
    batchDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VectorController],
      providers: [
        {
          provide: VectorService,
          useValue: mockVectorService,
        },
      ],
    }).compile();

    controller = module.get<VectorController>(VectorController);
    service = module.get<VectorService>(VectorService);

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

      const expectedResult = { id: '550e8400-e29b-41d4-a716-446655440000' };
      mockVectorService.upsertVector.mockResolvedValue(expectedResult);

      const result = await controller.upsertVector(dto);

      expect(result).toEqual(expectedResult);
      expect(service.upsertVector).toHaveBeenCalledWith(dto);
      expect(service.upsertVector).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      const dto: UpsertVectorDto = {
        collectionName: 'non-existent',
        embedding: Array(1536).fill(0.1),
      };

      mockVectorService.upsertVector.mockRejectedValue(
        new NotFoundException('Collection not found'),
      );

      await expect(controller.upsertVector(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid dimension', async () => {
      const dto: UpsertVectorDto = {
        collectionName: 'test-collection',
        embedding: Array(768).fill(0.1), // Wrong dimension
      };

      mockVectorService.upsertVector.mockRejectedValue(
        new BadRequestException('Invalid embedding dimension'),
      );

      await expect(controller.upsertVector(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('batchUpsert', () => {
    it('should batch upsert vectors successfully', async () => {
      const dto: BatchUpsertDto = {
        collectionName: 'test-collection',
        vectors: [
          { embedding: Array(1536).fill(0.1), text: 'Doc 1' },
          { embedding: Array(1536).fill(0.2), text: 'Doc 2' },
        ],
      };

      const expectedResult: BatchOperationResponseDto = {
        successCount: 2,
        failureCount: 0,
        successfulIds: ['id1', 'id2'],
      };

      mockVectorService.batchUpsert.mockResolvedValue(expectedResult);

      const result = await controller.batchUpsert(dto);

      expect(result).toEqual(expectedResult);
      expect(service.batchUpsert).toHaveBeenCalledWith(dto);
    });

    it('should handle partial failures in batch upsert', async () => {
      const dto: BatchUpsertDto = {
        collectionName: 'test-collection',
        vectors: [
          { embedding: Array(1536).fill(0.1) },
          { embedding: Array(768).fill(0.2) }, // Invalid dimension
        ],
      };

      const expectedResult: BatchOperationResponseDto = {
        successCount: 1,
        failureCount: 1,
        successfulIds: ['id1'],
        errors: [{ id: 'id2', error: 'Invalid dimension' }],
      };

      mockVectorService.batchUpsert.mockResolvedValue(expectedResult);

      const result = await controller.batchUpsert(dto);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toBeDefined();
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

      const expectedResult: SearchResponseDto = {
        collectionName: 'test-collection',
        results: [
          {
            id: 'id1',
            score: 0.95,
            text: 'Similar document',
            metadata: { category: 'test' },
          },
        ],
        total: 1,
        queryTime: 45,
      };

      mockVectorService.searchSimilar.mockResolvedValue(expectedResult);

      const result = await controller.searchSimilar(dto);

      expect(result).toEqual(expectedResult);
      expect(service.searchSimilar).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException for invalid query vector dimension', async () => {
      const dto: SearchVectorDto = {
        collectionName: 'test-collection',
        queryVector: Array(768).fill(0.1), // Wrong dimension
        topK: 10,
      };

      mockVectorService.searchSimilar.mockRejectedValue(
        new BadRequestException('Invalid query vector dimension'),
      );

      await expect(controller.searchSimilar(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty results when no matches found', async () => {
      const dto: SearchVectorDto = {
        collectionName: 'test-collection',
        queryVector: Array(1536).fill(0.1),
        topK: 10,
        minScore: 0.9,
      };

      const expectedResult: SearchResponseDto = {
        collectionName: 'test-collection',
        results: [],
        total: 0,
        queryTime: 30,
      };

      mockVectorService.searchSimilar.mockResolvedValue(expectedResult);

      const result = await controller.searchSimilar(dto);

      expect(result.results).toHaveLength(0);
    });
  });

  describe('hybridSearch', () => {
    it('should perform hybrid search successfully', async () => {
      const dto: HybridSearchDto = {
        collectionName: 'test-collection',
        queryVector: Array(1536).fill(0.1),
        keywords: 'machine learning',
        topK: 10,
        vectorWeight: 0.7,
      };

      const expectedResult: SearchResponseDto = {
        collectionName: 'test-collection',
        results: [
          {
            id: 'id1',
            score: 0.92,
            text: 'Machine learning document',
            metadata: {},
          },
        ],
        total: 1,
        queryTime: 60,
      };

      mockVectorService.hybridSearch.mockResolvedValue(expectedResult);

      const result = await controller.hybridSearch(dto);

      expect(result).toEqual(expectedResult);
      expect(service.hybridSearch).toHaveBeenCalledWith(dto);
    });
  });

  describe('deleteVector', () => {
    it('should delete a vector successfully', async () => {
      const collectionName = 'test-collection';
      const vectorId = '550e8400-e29b-41d4-a716-446655440000';

      mockVectorService.deleteVector.mockResolvedValue({ deleted: true });

      const result = await controller.deleteVector(collectionName, vectorId);

      expect(result).toEqual({ deleted: true });
      expect(service.deleteVector).toHaveBeenCalledWith(collectionName, vectorId);
    });

    it('should throw NotFoundException if vector does not exist', async () => {
      const collectionName = 'test-collection';
      const vectorId = 'non-existent';

      mockVectorService.deleteVector.mockRejectedValue(
        new NotFoundException('Vector not found'),
      );

      await expect(
        controller.deleteVector(collectionName, vectorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchDelete', () => {
    it('should batch delete vectors successfully', async () => {
      const collectionName = 'test-collection';
      const ids = ['id1', 'id2', 'id3'];

      const expectedResult: BatchOperationResponseDto = {
        successCount: 3,
        failureCount: 0,
        successfulIds: ids,
      };

      mockVectorService.batchDelete.mockResolvedValue(expectedResult);

      const result = await controller.batchDelete(collectionName, { ids });

      expect(result).toEqual(expectedResult);
      expect(service.batchDelete).toHaveBeenCalledWith(collectionName, ids);
    });
  });
});
