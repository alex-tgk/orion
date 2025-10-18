import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { VectorSearchService } from './vector-search.service';
import { AnalyticsService } from './analytics.service';
import { ISearchProvider } from '../providers/search-provider.interface';
import { SearchMode, SortOrder } from '../dto/search-request.dto';

describe('SearchService', () => {
  let service: SearchService;
  let searchProvider: jest.Mocked<ISearchProvider>;
  let vectorSearchService: jest.Mocked<VectorSearchService>;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockConfig = {
    provider: 'postgres',
    databaseUrl: 'postgresql://test',
    enableSemanticSearch: true,
    keywordSearchWeight: 0.4,
    semanticSearchWeight: 0.2,
    recencyWeight: 0.2,
    popularityWeight: 0.2,
    maxResults: 100,
  };

  beforeEach(async () => {
    const mockSearchProvider = {
      search: jest.fn(),
      indexDocument: jest.fn(),
      removeDocument: jest.fn(),
      bulkIndex: jest.fn(),
      updateRank: jest.fn(),
      getDocument: jest.fn(),
      healthCheck: jest.fn(),
    };

    const mockVectorSearchService = {
      search: jest.fn(),
      indexDocument: jest.fn(),
      removeDocument: jest.fn(),
      bulkIndex: jest.fn(),
      healthCheck: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(true),
    };

    const mockAnalyticsService = {
      trackQuery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: 'SEARCH_PROVIDER',
          useValue: mockSearchProvider,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockConfig),
          },
        },
        {
          provide: VectorSearchService,
          useValue: mockVectorSearchService,
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    searchProvider = module.get('SEARCH_PROVIDER');
    vectorSearchService = module.get(VectorSearchService);
    analyticsService = module.get(AnalyticsService);
  });

  describe('executeSearch', () => {
    it('should execute keyword search successfully', async () => {
      const mockResults = [
        {
          entityType: 'Document',
          entityId: '1',
          title: 'Test Document',
          content: 'Test content',
          score: 0.9,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      searchProvider.search.mockResolvedValue(mockResults);

      const request = {
        query: 'test query',
        mode: SearchMode.KEYWORD,
        page: 1,
        limit: 20,
      };

      const result = await service.executeSearch(request);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Test Document');
      expect(result.total).toBe(1);
      expect(searchProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query',
          limit: 20,
          offset: 0,
        }),
      );
      expect(analyticsService.trackQuery).toHaveBeenCalled();
    });

    it('should execute hybrid search combining keyword and semantic', async () => {
      const keywordResults = [
        {
          entityType: 'Document',
          entityId: '1',
          title: 'Keyword Match',
          content: 'Content',
          score: 0.8,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const semanticResults = [
        {
          id: 'vec1',
          score: 0.9,
          metadata: {},
        },
      ];

      searchProvider.search.mockResolvedValue(keywordResults);
      vectorSearchService.search.mockResolvedValue(semanticResults);

      const request = {
        query: 'test query',
        mode: SearchMode.HYBRID,
        page: 1,
        limit: 20,
      };

      const result = await service.executeSearch(request);

      expect(searchProvider.search).toHaveBeenCalled();
      expect(vectorSearchService.search).toHaveBeenCalled();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should handle pagination correctly', async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) => ({
        entityType: 'Document',
        entityId: `${i}`,
        title: `Document ${i}`,
        content: 'Content',
        score: 0.9 - i * 0.01,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      searchProvider.search.mockResolvedValue(mockResults);

      const request = {
        query: 'test',
        page: 2,
        limit: 10,
      };

      const result = await service.executeSearch(request);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.results.length).toBeLessThanOrEqual(10);
      expect(searchProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
        }),
      );
    });

    it('should return suggestions when no results found', async () => {
      searchProvider.search.mockResolvedValue([]);

      const request = {
        query: 'nonexistent',
        page: 1,
        limit: 20,
      };

      const result = await service.executeSearch(request);

      expect(result.total).toBe(0);
      expect(result.suggestions).toBeDefined();
    });

    it('should track analytics for searches', async () => {
      searchProvider.search.mockResolvedValue([]);

      const request = {
        query: 'test',
        userId: 'user123',
        entityTypes: ['Document'],
      };

      await service.executeSearch(request);

      expect(analyticsService.trackQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test',
          userId: 'user123',
          resultsCount: 0,
        }),
      );
    });
  });

  describe('indexDocument', () => {
    it('should index document successfully', async () => {
      const mockIndexId = 'index123';
      searchProvider.indexDocument.mockResolvedValue(mockIndexId);
      vectorSearchService.indexDocument.mockResolvedValue('vec123');

      const document = {
        entityType: 'Document',
        entityId: 'doc1',
        title: 'Test Document',
        content: 'Test content',
      };

      const result = await service.indexDocument(document);

      expect(result).toBe(mockIndexId);
      expect(searchProvider.indexDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Document',
          entityId: 'doc1',
        }),
      );
    });

    it('should handle indexing errors gracefully', async () => {
      searchProvider.indexDocument.mockRejectedValue(
        new Error('Index failed'),
      );

      const document = {
        entityType: 'Document',
        entityId: 'doc1',
        title: 'Test',
        content: 'Content',
      };

      await expect(service.indexDocument(document)).rejects.toThrow(
        'Index failed',
      );
    });

    it('should index without vector DB if disabled', async () => {
      const mockIndexId = 'index123';
      searchProvider.indexDocument.mockResolvedValue(mockIndexId);
      vectorSearchService.isEnabled.mockReturnValue(false);

      const document = {
        entityType: 'Document',
        entityId: 'doc1',
        title: 'Test',
        content: 'Content',
      };

      const result = await service.indexDocument(document);

      expect(result).toBe(mockIndexId);
      expect(vectorSearchService.indexDocument).not.toHaveBeenCalled();
    });
  });

  describe('removeFromIndex', () => {
    it('should remove document from index', async () => {
      searchProvider.getDocument.mockResolvedValue({
        entityType: 'Document',
        entityId: 'doc1',
        title: 'Test',
        content: 'Content',
        score: 0,
        metadata: { vectorId: 'vec123' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      searchProvider.removeDocument.mockResolvedValue(true);
      vectorSearchService.removeDocument.mockResolvedValue(true);

      const result = await service.removeFromIndex('Document', 'doc1');

      expect(result).toBe(true);
      expect(searchProvider.removeDocument).toHaveBeenCalledWith(
        'Document',
        'doc1',
      );
    });

    it('should handle document not found', async () => {
      searchProvider.getDocument.mockResolvedValue(null);
      searchProvider.removeDocument.mockResolvedValue(false);

      const result = await service.removeFromIndex('Document', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('reindexAll', () => {
    it('should bulk reindex documents successfully', async () => {
      searchProvider.indexDocument.mockResolvedValue('index1');

      const documents = [
        {
          entityType: 'Document',
          entityId: 'doc1',
          title: 'Doc 1',
          content: 'Content 1',
        },
        {
          entityType: 'Document',
          entityId: 'doc2',
          title: 'Doc 2',
          content: 'Content 2',
        },
      ];

      const result = await service.reindexAll(documents);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.failedIds).toHaveLength(0);
    });

    it('should handle partial failures in bulk reindex', async () => {
      searchProvider.indexDocument
        .mockResolvedValueOnce('index1')
        .mockRejectedValueOnce(new Error('Failed'));

      const documents = [
        {
          entityType: 'Document',
          entityId: 'doc1',
          title: 'Doc 1',
          content: 'Content 1',
        },
        {
          entityType: 'Document',
          entityId: 'doc2',
          title: 'Doc 2',
          content: 'Content 2',
        },
      ];

      const result = await service.reindexAll(documents);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failedIds).toContain('Document/doc2');
    });
  });
});
