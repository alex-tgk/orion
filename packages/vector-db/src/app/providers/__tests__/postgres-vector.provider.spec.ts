import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PostgresVectorProvider } from '../postgres-vector.provider';
import { DistanceMetric } from '../../config/vector-db.config';

// Mock PrismaClient
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
  $executeRaw: jest.fn(),
  $transaction: jest.fn(),
  collection: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  vector: {
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('PostgresVectorProvider', () => {
  let provider: PostgresVectorProvider;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresVectorProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<PostgresVectorProvider>(PostgresVectorProvider);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to PostgreSQL successfully', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);

      await provider.connect();

      expect(mockPrismaClient.$connect).toHaveBeenCalled();
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalled();
    });

    it('should throw error if database URL is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(provider.connect()).rejects.toThrow(
        'Database URL not configured for PostgreSQL vector provider',
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect from PostgreSQL successfully', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.$disconnect.mockResolvedValue(undefined);

      await provider.connect();
      await provider.disconnect();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });
  });

  describe('isHealthy', () => {
    it('should return true when connection is healthy', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      await provider.connect();
      const result = await provider.isHealthy();

      expect(result).toBe(true);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      const result = await provider.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('createCollection', () => {
    it('should create a collection successfully', async () => {
      const mockCollection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'test-collection',
        dimension: 1536,
        description: 'Test collection',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.create.mockResolvedValue(mockCollection);

      await provider.connect();
      const result = await provider.createCollection('test-collection', 1536, 'Test collection');

      expect(result).toBeDefined();
      expect(result.name).toBe('test-collection');
      expect(result.dimension).toBe(1536);
      expect(mockPrismaClient.collection.create).toHaveBeenCalledWith({
        data: {
          name: 'test-collection',
          dimension: 1536,
          description: 'Test collection',
          metadata: {},
        },
      });
    });
  });

  describe('getCollection', () => {
    it('should return a collection by name', async () => {
      const mockCollection = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'test-collection',
        dimension: 1536,
        description: 'Test collection',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { vectors: 100 },
      };

      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.findUnique.mockResolvedValue(mockCollection);

      await provider.connect();
      const result = await provider.getCollection('test-collection');

      expect(result).toBeDefined();
      expect(result?.name).toBe('test-collection');
      expect(result?.vectorCount).toBe(100);
    });

    it('should return null if collection does not exist', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.findUnique.mockResolvedValue(null);

      await provider.connect();
      const result = await provider.getCollection('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('listCollections', () => {
    it('should return all collections', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'collection1',
          dimension: 1536,
          description: 'Collection 1',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { vectors: 50 },
        },
        {
          id: '2',
          name: 'collection2',
          dimension: 768,
          description: 'Collection 2',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { vectors: 30 },
        },
      ];

      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.findMany.mockResolvedValue(mockCollections);

      await provider.connect();
      const result = await provider.listCollections();

      expect(result).toHaveLength(2);
      expect(result[0].vectorCount).toBe(50);
      expect(result[1].vectorCount).toBe(30);
    });
  });

  describe('deleteCollection', () => {
    it('should delete a collection successfully', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.delete.mockResolvedValue({});

      await provider.connect();
      await provider.deleteCollection('test-collection');

      expect(mockPrismaClient.collection.delete).toHaveBeenCalledWith({
        where: { name: 'test-collection' },
      });
    });
  });

  describe('upsertVector', () => {
    it('should upsert a vector successfully', async () => {
      const mockCollection = {
        id: 'collection-id',
        name: 'test-collection',
        dimension: 1536,
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { vectors: 0 },
      };

      const mockVector = {
        id: 'vector-id',
        collectionId: 'collection-id',
        embedding: Array(1536).fill(0.1),
        text: 'Test',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaClient.vector.upsert.mockResolvedValue(mockVector);

      await provider.connect();
      const result = await provider.upsertVector('test-collection', {
        id: 'vector-id',
        embedding: Array(1536).fill(0.1),
        text: 'Test',
      });

      expect(result).toBe('vector-id');
      expect(mockPrismaClient.vector.upsert).toHaveBeenCalled();
    });

    it('should throw error for invalid dimension', async () => {
      const mockCollection = {
        id: 'collection-id',
        name: 'test-collection',
        dimension: 1536,
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { vectors: 0 },
      };

      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.findUnique.mockResolvedValue(mockCollection);

      await provider.connect();

      await expect(
        provider.upsertVector('test-collection', {
          id: 'vector-id',
          embedding: Array(768).fill(0.1), // Wrong dimension
          text: 'Test',
        }),
      ).rejects.toThrow('Invalid embedding dimension');
    });
  });

  describe('searchSimilar', () => {
    it('should search similar vectors successfully', async () => {
      const mockCollection = {
        id: 'collection-id',
        name: 'test-collection',
        dimension: 1536,
        description: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { vectors: 100 },
      };

      const mockSearchResults = [
        {
          id: 'vector-1',
          embedding: Array(1536).fill(0.1),
          text: 'Result 1',
          metadata: {},
          distance: 0.1,
        },
        {
          id: 'vector-2',
          embedding: Array(1536).fill(0.2),
          text: 'Result 2',
          metadata: {},
          distance: 0.2,
        },
      ];

      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.collection.findUnique.mockResolvedValue(mockCollection);
      mockPrismaClient.$queryRawUnsafe.mockResolvedValue(mockSearchResults);

      await provider.connect();
      const result = await provider.searchSimilar(
        'test-collection',
        Array(1536).fill(0.1),
        {
          topK: 10,
          metric: DistanceMetric.COSINE,
        },
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('vector-1');
      expect(result[0].score).toBeDefined();
      expect(mockPrismaClient.$queryRawUnsafe).toHaveBeenCalled();
    });
  });

  describe('getTotalVectorCount', () => {
    it('should return total vector count', async () => {
      mockConfigService.get.mockReturnValue('postgresql://localhost:5432/vectordb');
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
      mockPrismaClient.vector.count.mockResolvedValue(150);

      await provider.connect();
      const result = await provider.getTotalVectorCount();

      expect(result).toBe(150);
      expect(mockPrismaClient.vector.count).toHaveBeenCalled();
    });
  });
});
