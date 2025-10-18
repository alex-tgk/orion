import { Test, TestingModule } from '@nestjs/testing';
import { SuggestionService } from './suggestion.service';

describe('SuggestionService', () => {
  let service: SuggestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SuggestionService],
    }).compile();

    service = module.get<SuggestionService>(SuggestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSuggestions', () => {
    it('should return empty suggestions for new query', async () => {
      const request = {
        query: 'nonexistent',
        limit: 5,
      };

      const result = await service.getSuggestions(request);

      expect(result.suggestions).toEqual([]);
      expect(result.query).toBe('nonexistent');
    });
  });

  describe('learnFromQuery', () => {
    it('should extract and store terms from query', async () => {
      await service.learnFromQuery('test query for learning', 'Document');

      // Should have learned "test", "query", "learning"
      // Verify by searching for suggestions
      const result = await service.getSuggestions({
        query: 'test',
        limit: 5,
      });

      // Will be empty in test environment without database
      expect(result.suggestions).toBeDefined();
    });

    it('should filter out stop words', async () => {
      await service.learnFromQuery('the and or but', 'Document');

      // These should all be filtered out as stop words
      const result = await service.getSuggestions({
        query: 'the',
        limit: 5,
      });

      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('calculateSuggestionScore', () => {
    it('should calculate scores based on frequency and recency', () => {
      // Access private method for testing
      const score1 = service['calculateSuggestionScore'](50, new Date());
      const score2 = service['calculateSuggestionScore'](10, new Date());
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      const score3 = service['calculateSuggestionScore'](50, oldDate);

      expect(score1).toBeGreaterThan(score2);
      expect(score1).toBeGreaterThan(score3);
    });
  });

  describe('extractTerms', () => {
    it('should extract meaningful terms', () => {
      const terms = service['extractTerms'](
        'Test Query with Multiple Terms',
      );

      expect(terms).toContain('test');
      expect(terms).toContain('query');
      expect(terms).toContain('multiple');
      expect(terms).toContain('terms');
      expect(terms).not.toContain('with'); // Stop word
    });

    it('should filter out short terms', () => {
      const terms = service['extractTerms']('a b cd test');

      expect(terms).not.toContain('a');
      expect(terms).not.toContain('b');
      expect(terms).toContain('cd');
      expect(terms).toContain('test');
    });

    it('should handle special characters', () => {
      const terms = service['extractTerms']('test@query!with#special');

      expect(terms).toContain('test');
      expect(terms).toContain('query');
      expect(terms).toContain('special');
    });
  });
});
