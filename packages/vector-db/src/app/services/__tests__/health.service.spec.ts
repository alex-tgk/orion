import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../health.service';
import { IVectorProvider, CollectionEntity } from '../../interfaces/vector-provider.interface';

describe('HealthService', () => {
  let service: HealthService;
  let vectorProvider: jest.Mocked<IVectorProvider>;
  let configService: jest.Mocked<ConfigService>;

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
        HealthService,
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

    service = module.get<HealthService>(HealthService);
    vectorProvider = module.get('IVectorProvider');
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when provider is connected', async () => {
      const mockCollections: CollectionEntity[] = [
        {
          id: '1',
          name: 'collection1',
          dimension: 1536,
          vectorCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'collection2',
          dimension: 768,
          vectorCount: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockVectorProvider.isHealthy.mockResolvedValue(true);
      mockVectorProvider.listCollections.mockResolvedValue(mockCollections);
      mockVectorProvider.getTotalVectorCount.mockResolvedValue(150);
      mockConfigService.get.mockReturnValue('postgres');

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.provider).toBe('postgres');
      expect(result.connected).toBe(true);
      expect(result.collectionCount).toBe(2);
      expect(result.totalVectors).toBe(150);
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy status when provider is disconnected', async () => {
      mockVectorProvider.isHealthy.mockResolvedValue(false);
      mockConfigService.get.mockReturnValue('postgres');

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
      expect(result.collectionCount).toBeUndefined();
      expect(result.totalVectors).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      mockVectorProvider.isHealthy.mockRejectedValue(new Error('Connection failed'));
      mockConfigService.get.mockReturnValue('postgres');

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
    });

    it('should continue if collection stats fail', async () => {
      mockVectorProvider.isHealthy.mockResolvedValue(true);
      mockVectorProvider.listCollections.mockRejectedValue(new Error('Stats failed'));
      mockConfigService.get.mockReturnValue('postgres');

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
      expect(result.collectionCount).toBeUndefined();
      expect(result.totalVectors).toBeUndefined();
    });
  });

  describe('getUptime', () => {
    it('should return uptime in seconds', () => {
      const uptime = service.getUptime();

      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(typeof uptime).toBe('number');
    });
  });
});
