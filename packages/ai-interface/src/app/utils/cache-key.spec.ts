import { CacheKeyGenerator } from './cache-key';
import { ChatRole } from '../dto';

describe('CacheKeyGenerator', () => {
  describe('forChat', () => {
    it('should generate consistent cache keys for same inputs', () => {
      const messages = [
        { role: ChatRole.USER, content: 'Hello' },
        { role: ChatRole.ASSISTANT, content: 'Hi there!' },
      ];

      const key1 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages, 0.7);
      const key2 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages, 0.7);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different messages', () => {
      const messages1 = [{ role: ChatRole.USER, content: 'Hello' }];
      const messages2 = [{ role: ChatRole.USER, content: 'Goodbye' }];

      const key1 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages1);
      const key2 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages2);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different temperatures', () => {
      const messages = [{ role: ChatRole.USER, content: 'Hello' }];

      const key1 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages, 0.5);
      const key2 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages, 0.9);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different providers', () => {
      const messages = [{ role: ChatRole.USER, content: 'Hello' }];

      const key1 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages);
      const key2 = CacheKeyGenerator.forChat('anthropic', 'gpt-4', messages);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different models', () => {
      const messages = [{ role: ChatRole.USER, content: 'Hello' }];

      const key1 = CacheKeyGenerator.forChat('openai', 'gpt-4', messages);
      const key2 = CacheKeyGenerator.forChat('openai', 'gpt-3.5-turbo', messages);

      expect(key1).not.toBe(key2);
    });

    it('should have ai:chat prefix', () => {
      const messages = [{ role: ChatRole.USER, content: 'Hello' }];
      const key = CacheKeyGenerator.forChat('openai', 'gpt-4', messages);

      expect(key).toMatch(/^ai:chat:openai:/);
    });
  });

  describe('forCompletion', () => {
    it('should generate consistent cache keys for same inputs', () => {
      const key1 = CacheKeyGenerator.forCompletion(
        'openai',
        'gpt-4',
        'Write a poem',
        0.7,
      );
      const key2 = CacheKeyGenerator.forCompletion(
        'openai',
        'gpt-4',
        'Write a poem',
        0.7,
      );

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different prompts', () => {
      const key1 = CacheKeyGenerator.forCompletion(
        'openai',
        'gpt-4',
        'Write a poem',
      );
      const key2 = CacheKeyGenerator.forCompletion(
        'openai',
        'gpt-4',
        'Write a story',
      );

      expect(key1).not.toBe(key2);
    });

    it('should have ai:completion prefix', () => {
      const key = CacheKeyGenerator.forCompletion(
        'openai',
        'gpt-4',
        'Write a poem',
      );

      expect(key).toMatch(/^ai:completion:openai:/);
    });
  });

  describe('forEmbedding', () => {
    it('should generate consistent cache keys for same inputs', () => {
      const key1 = CacheKeyGenerator.forEmbedding(
        'openai',
        'text-embedding-ada-002',
        'Sample text',
      );
      const key2 = CacheKeyGenerator.forEmbedding(
        'openai',
        'text-embedding-ada-002',
        'Sample text',
      );

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different texts', () => {
      const key1 = CacheKeyGenerator.forEmbedding(
        'openai',
        'text-embedding-ada-002',
        'Text 1',
      );
      const key2 = CacheKeyGenerator.forEmbedding(
        'openai',
        'text-embedding-ada-002',
        'Text 2',
      );

      expect(key1).not.toBe(key2);
    });

    it('should have ai:embedding prefix', () => {
      const key = CacheKeyGenerator.forEmbedding(
        'openai',
        'text-embedding-ada-002',
        'Sample text',
      );

      expect(key).toMatch(/^ai:embedding:openai:/);
    });
  });

  describe('forUsage', () => {
    it('should generate consistent cache keys for same date range', () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const key1 = CacheKeyGenerator.forUsage('user-123', startDate, endDate);
      const key2 = CacheKeyGenerator.forUsage('user-123', startDate, endDate);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different users', () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const key1 = CacheKeyGenerator.forUsage('user-123', startDate, endDate);
      const key2 = CacheKeyGenerator.forUsage('user-456', startDate, endDate);

      expect(key1).not.toBe(key2);
    });

    it('should include date range in key', () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const key = CacheKeyGenerator.forUsage('user-123', startDate, endDate);

      expect(key).toContain('2025-10-01');
      expect(key).toContain('2025-10-31');
    });
  });

  describe('forConversation', () => {
    it('should generate consistent cache keys', () => {
      const key1 = CacheKeyGenerator.forConversation('conv-123');
      const key2 = CacheKeyGenerator.forConversation('conv-123');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different conversations', () => {
      const key1 = CacheKeyGenerator.forConversation('conv-123');
      const key2 = CacheKeyGenerator.forConversation('conv-456');

      expect(key1).not.toBe(key2);
    });

    it('should have ai:conversation prefix', () => {
      const key = CacheKeyGenerator.forConversation('conv-123');

      expect(key).toBe('ai:conversation:conv-123');
    });
  });
});
