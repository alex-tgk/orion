import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CollectionController } from '../collection.controller';
import { CollectionService } from '../../services/collection.service';
import { CreateCollectionDto, CollectionResponseDto } from '../../dto';

describe('CollectionController', () => {
  let controller: CollectionController;
  let service: CollectionService;

  const mockCollectionResponse: CollectionResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'test-collection',
    dimension: 1536,
    description: 'Test collection',
    metadata: { source: 'test' },
    vectorCount: 0,
    createdAt: new Date('2025-10-18T12:00:00.000Z'),
    updatedAt: new Date('2025-10-18T12:00:00.000Z'),
  };

  const mockCollectionService = {
    createCollection: jest.fn(),
    listCollections: jest.fn(),
    getCollection: jest.fn(),
    getCollectionStats: jest.fn(),
    deleteCollection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        {
          provide: CollectionService,
          useValue: mockCollectionService,
        },
      ],
    }).compile();

    controller = module.get<CollectionController>(CollectionController);
    service = module.get<CollectionService>(CollectionService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createCollection', () => {
    it('should create a new collection successfully', async () => {
      const dto: CreateCollectionDto = {
        name: 'test-collection',
        dimension: 1536,
        description: 'Test collection',
        metadata: { source: 'test' },
      };

      mockCollectionService.createCollection.mockResolvedValue(mockCollectionResponse);

      const result = await controller.createCollection(dto);

      expect(result).toEqual(mockCollectionResponse);
      expect(service.createCollection).toHaveBeenCalledWith(dto);
      expect(service.createCollection).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if collection already exists', async () => {
      const dto: CreateCollectionDto = {
        name: 'existing-collection',
        dimension: 1536,
      };

      mockCollectionService.createCollection.mockRejectedValue(
        new ConflictException('Collection already exists'),
      );

      await expect(controller.createCollection(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.createCollection).toHaveBeenCalledWith(dto);
    });
  });

  describe('listCollections', () => {
    it('should return an array of collections', async () => {
      const collections = [mockCollectionResponse];
      mockCollectionService.listCollections.mockResolvedValue(collections);

      const result = await controller.listCollections();

      expect(result).toEqual(collections);
      expect(service.listCollections).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no collections exist', async () => {
      mockCollectionService.listCollections.mockResolvedValue([]);

      const result = await controller.listCollections();

      expect(result).toEqual([]);
      expect(service.listCollections).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCollection', () => {
    it('should return a collection by name', async () => {
      const name = 'test-collection';
      mockCollectionService.getCollection.mockResolvedValue(mockCollectionResponse);

      const result = await controller.getCollection(name);

      expect(result).toEqual(mockCollectionResponse);
      expect(service.getCollection).toHaveBeenCalledWith(name);
      expect(service.getCollection).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      const name = 'non-existent';
      mockCollectionService.getCollection.mockRejectedValue(
        new NotFoundException('Collection not found'),
      );

      await expect(controller.getCollection(name)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getCollection).toHaveBeenCalledWith(name);
    });
  });

  describe('getCollectionStats', () => {
    it('should return collection statistics', async () => {
      const name = 'test-collection';
      const stats = {
        name: 'test-collection',
        dimension: 1536,
        vectorCount: 100,
        createdAt: new Date('2025-10-18T12:00:00.000Z'),
        updatedAt: new Date('2025-10-18T14:00:00.000Z'),
      };

      mockCollectionService.getCollectionStats.mockResolvedValue(stats);

      const result = await controller.getCollectionStats(name);

      expect(result).toEqual(stats);
      expect(service.getCollectionStats).toHaveBeenCalledWith(name);
    });

    it('should throw NotFoundException for non-existent collection', async () => {
      const name = 'non-existent';
      mockCollectionService.getCollectionStats.mockRejectedValue(
        new NotFoundException('Collection not found'),
      );

      await expect(controller.getCollectionStats(name)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCollection', () => {
    it('should delete a collection successfully', async () => {
      const name = 'test-collection';
      mockCollectionService.deleteCollection.mockResolvedValue({ deleted: true });

      const result = await controller.deleteCollection(name);

      expect(result).toEqual({ deleted: true });
      expect(service.deleteCollection).toHaveBeenCalledWith(name);
      expect(service.deleteCollection).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      const name = 'non-existent';
      mockCollectionService.deleteCollection.mockRejectedValue(
        new NotFoundException('Collection not found'),
      );

      await expect(controller.deleteCollection(name)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.deleteCollection).toHaveBeenCalledWith(name);
    });
  });
});
