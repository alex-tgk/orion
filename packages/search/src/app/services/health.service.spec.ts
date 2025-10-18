import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { ISearchProvider } from '../providers/search-provider.interface';
import { VectorSearchService } from './vector-search.service';

describe('HealthService', () => {
  let service: HealthService;
  let searchProvider: jest.Mocked<ISearchProvider>;
  let vectorSearchService: jest.Mocked<VectorSearchService>;

  beforeEach(async () => {
    const mockSearchProvider = {
      healthCheck: jest.fn(),
    };

    const mockVectorSearchService = {
      healthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: 'SEARCH_PROVIDER',
          useValue: mockSearchProvider,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              enableSemanticSearch: true,
              databaseUrl: 'postgresql://test',
            }),
          },
        },
        {
          provide: VectorSearchService,
          useValue: mockVectorSearchService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    searchProvider = module.get('SEARCH_PROVIDER');
    vectorSearchService = module.get(VectorSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return ok status when all checks pass', async () => {
      searchProvider.healthCheck.mockResolvedValue(true);
      vectorSearchService.healthCheck.mockResolvedValue(true);

      // Mock database check
      service['checkDatabase'] = jest.fn().mockResolvedValue(true);

      const result = await service.getHealth();

      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe(true);
      expect(result.checks.searchProvider).toBe(true);
      expect(result.checks.vectorDb).toBe(true);
    });

    it('should return degraded status when vector DB is down', async () => {
      searchProvider.healthCheck.mockResolvedValue(true);
      vectorSearchService.healthCheck.mockResolvedValue(false);

      service['checkDatabase'] = jest.fn().mockResolvedValue(true);

      const result = await service.getHealth();

      expect(result.status).toBe('degraded');
    });

    it('should return down status when database fails', async () => {
      searchProvider.healthCheck.mockResolvedValue(true);
      vectorSearchService.healthCheck.mockResolvedValue(true);

      service['checkDatabase'] = jest.fn().mockResolvedValue(false);

      const result = await service.getHealth();

      expect(result.status).toBe('down');
    });

    it('should include service stats', async () => {
      searchProvider.healthCheck.mockResolvedValue(true);
      vectorSearchService.healthCheck.mockResolvedValue(true);

      service['checkDatabase'] = jest.fn().mockResolvedValue(true);
      service['getStats'] = jest.fn().mockResolvedValue({
        totalIndexed: 100,
        totalQueries: 50,
        vectorDbEnabled: true,
      });

      const result = await service.getHealth();

      expect(result.stats).toBeDefined();
      expect(result.stats.totalIndexed).toBe(100);
    });
  });
});
