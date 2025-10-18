import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from '../services/search.service';
import { SuggestionService } from '../services/suggestion.service';
import { AnalyticsService } from '../services/analytics.service';
import { SearchMode } from '../dto/search-request.dto';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: jest.Mocked<SearchService>;
  let suggestionService: jest.Mocked<SuggestionService>;
  let analyticsService: jest.Mocked<AnalyticsService>;

  beforeEach(async () => {
    const mockSearchService = {
      executeSearch: jest.fn(),
      indexDocument: jest.fn(),
      removeFromIndex: jest.fn(),
      reindexAll: jest.fn(),
    };

    const mockSuggestionService = {
      getSuggestions: jest.fn(),
      learnFromQuery: jest.fn(),
    };

    const mockAnalyticsService = {
      getAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: SuggestionService,
          useValue: mockSuggestionService,
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get(SearchService);
    suggestionService = module.get(SuggestionService);
    analyticsService = module.get(AnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should execute search and return results', async () => {
      const mockResponse = {
        results: [
          {
            entityType: 'Document',
            entityId: '1',
            title: 'Test',
            excerpt: 'Test content',
            score: 0.9,
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        executionTime: 100,
      };

      searchService.executeSearch.mockResolvedValue(mockResponse);

      const request = {
        query: 'test query',
        mode: SearchMode.KEYWORD,
        page: 1,
        limit: 20,
      };

      const result = await controller.search(request);

      expect(result).toEqual(mockResponse);
      expect(searchService.executeSearch).toHaveBeenCalledWith(request);
    });

    it('should learn from successful queries', async () => {
      const mockResponse = {
        results: [],
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
        executionTime: 100,
      };

      searchService.executeSearch.mockResolvedValue(mockResponse);

      const request = {
        query: 'learning test',
        entityTypes: ['Document'],
        page: 1,
        limit: 20,
      };

      await controller.search(request);

      expect(suggestionService.learnFromQuery).toHaveBeenCalledWith(
        'learning test',
        'Document',
      );
    });

    it('should not learn from zero-result queries', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        executionTime: 100,
      };

      searchService.executeSearch.mockResolvedValue(mockResponse);

      const request = {
        query: 'nonexistent',
        page: 1,
        limit: 20,
      };

      await controller.search(request);

      expect(suggestionService.learnFromQuery).not.toHaveBeenCalled();
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions', async () => {
      const mockSuggestions = {
        suggestions: [
          {
            term: 'test',
            score: 0.9,
            frequency: 10,
          },
        ],
        query: 'tes',
      };

      suggestionService.getSuggestions.mockResolvedValue(mockSuggestions);

      const request = {
        query: 'tes',
        limit: 5,
      };

      const result = await controller.getSuggestions(request);

      expect(result).toEqual(mockSuggestions);
      expect(suggestionService.getSuggestions).toHaveBeenCalledWith(request);
    });
  });

  describe('indexDocument', () => {
    it('should index document successfully', async () => {
      searchService.indexDocument.mockResolvedValue('index123');

      const document = {
        entityType: 'Document',
        entityId: 'doc1',
        title: 'Test Document',
        content: 'Test content',
      };

      const result = await controller.indexDocument(document);

      expect(result.success).toBe(true);
      expect(result.indexId).toBe('index123');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle indexing errors', async () => {
      searchService.indexDocument.mockRejectedValue(new Error('Index failed'));

      const document = {
        entityType: 'Document',
        entityId: 'doc1',
        title: 'Test',
        content: 'Content',
      };

      const result = await controller.indexDocument(document);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Index failed');
    });
  });

  describe('removeFromIndex', () => {
    it('should remove document from index', async () => {
      searchService.removeFromIndex.mockResolvedValue(true);

      await controller.removeFromIndex('Document', 'doc1');

      expect(searchService.removeFromIndex).toHaveBeenCalledWith(
        'Document',
        'doc1',
      );
    });
  });

  describe('reindex', () => {
    it('should bulk reindex documents', async () => {
      const mockResult = {
        successful: 2,
        failed: 0,
        failedIds: [],
      };

      searchService.reindexAll.mockResolvedValue(mockResult);

      const request = {
        documents: [
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
        ],
        batchSize: 100,
      };

      const result = await controller.reindex(request);

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      const mockAnalytics = {
        totalSearches: 100,
        avgExecutionTime: 125.5,
        zeroResultRate: 5.2,
        popularQueries: [],
        zeroResultQueries: [],
        entityTypeDistribution: {},
        hourlyDistribution: {},
      };

      analyticsService.getAnalytics.mockResolvedValue(mockAnalytics);

      const request = {
        period: 'day' as any,
      };

      const result = await controller.getAnalytics(request);

      expect(result).toEqual(mockAnalytics);
      expect(analyticsService.getAnalytics).toHaveBeenCalledWith(request);
    });
  });
});
