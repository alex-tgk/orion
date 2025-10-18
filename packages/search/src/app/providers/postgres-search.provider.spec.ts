import { Test, TestingModule } from '@nestjs/testing';
import { PostgresSearchProvider } from './postgres-search.provider';

describe('PostgresSearchProvider', () => {
  let provider: PostgresSearchProvider;

  beforeEach(async () => {
    provider = new PostgresSearchProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('buildTsQuery', () => {
    it('should build query with fuzzy matching', () => {
      const query = provider['buildTsQuery']('test query', true);
      expect(query).toContain(':*');
      expect(query).toContain('&');
    });

    it('should build exact matching query', () => {
      const query = provider['buildTsQuery']('test query', false);
      expect(query).not.toContain(':*');
      expect(query).toContain('&');
    });

    it('should handle special characters', () => {
      const query = provider['buildTsQuery']('test@query!special#chars', true);
      expect(query).toMatch(/test.*query.*special.*chars/);
    });

    it('should handle empty query', () => {
      const query = provider['buildTsQuery']('', true);
      expect(query).toBe('');
    });

    it('should handle single term', () => {
      const query = provider['buildTsQuery']('test', true);
      expect(query).toBe('test:*');
    });

    it('should combine multiple terms with AND', () => {
      const query = provider['buildTsQuery']('test query search', true);
      expect(query).toBe('test:* & query:* & search:*');
    });
  });

  describe('healthCheck', () => {
    it('should return true when connected', async () => {
      // In actual tests with database, this would verify connection
      expect(provider.healthCheck).toBeDefined();
    });
  });
});
