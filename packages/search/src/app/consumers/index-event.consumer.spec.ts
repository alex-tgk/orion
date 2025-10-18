import { Test, TestingModule } from '@nestjs/testing';
import { IndexEventConsumer } from './index-event.consumer';
import { SearchService } from '../services/search.service';

describe('IndexEventConsumer', () => {
  let consumer: IndexEventConsumer;
  let searchService: jest.Mocked<SearchService>;

  beforeEach(async () => {
    const mockSearchService = {
      indexDocument: jest.fn(),
      removeFromIndex: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndexEventConsumer,
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    consumer = module.get<IndexEventConsumer>(IndexEventConsumer);
    searchService = module.get(SearchService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleUserCreated', () => {
    it('should index user on creation', async () => {
      const event = {
        data: {
          id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      await consumer.handleUserCreated(event);

      expect(searchService.indexDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'User',
          entityId: 'user123',
          title: 'testuser',
        }),
      );
    });

    it('should handle missing optional fields', async () => {
      const event = {
        data: {
          id: 'user123',
          email: 'test@example.com',
        },
      };

      await consumer.handleUserCreated(event);

      expect(searchService.indexDocument).toHaveBeenCalled();
    });
  });

  describe('handleUserDeleted', () => {
    it('should remove user from index', async () => {
      const event = {
        data: {
          id: 'user123',
        },
      };

      await consumer.handleUserDeleted(event);

      expect(searchService.removeFromIndex).toHaveBeenCalledWith(
        'User',
        'user123',
      );
    });
  });

  describe('handleFileUploaded', () => {
    it('should index file on upload', async () => {
      const event = {
        data: {
          id: 'file123',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          metadata: {
            description: 'Test file',
            tags: ['test', 'document'],
          },
        },
      };

      await consumer.handleFileUploaded(event);

      expect(searchService.indexDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'File',
          entityId: 'file123',
          title: 'test.pdf',
        }),
      );
    });
  });

  describe('handleDocumentCreated', () => {
    it('should index document on creation', async () => {
      const event = {
        data: {
          id: 'doc123',
          title: 'Test Document',
          content: 'This is test content',
          author: 'user123',
          tags: ['nestjs', 'typescript'],
        },
      };

      await consumer.handleDocumentCreated(event);

      expect(searchService.indexDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Document',
          entityId: 'doc123',
          title: 'Test Document',
        }),
      );
    });
  });

  describe('handleEntityEvent', () => {
    it('should handle generic create event', async () => {
      await consumer.handleEntityEvent('created', 'CustomEntity', {
        id: 'custom123',
        title: 'Custom Entity',
        description: 'Test description',
      });

      expect(searchService.indexDocument).toHaveBeenCalled();
    });

    it('should handle generic delete event', async () => {
      await consumer.handleEntityEvent('deleted', 'CustomEntity', {
        id: 'custom123',
      });

      expect(searchService.removeFromIndex).toHaveBeenCalledWith(
        'CustomEntity',
        'custom123',
      );
    });
  });

  describe('extractSearchableContent', () => {
    it('should extract searchable fields', () => {
      const data = {
        title: 'Test Title',
        description: 'Test Description',
        content: 'Test Content',
        nonSearchable: 'Should not be included',
      };

      const result = consumer['extractSearchableContent'](data);

      expect(result).toContain('Test Title');
      expect(result).toContain('Test Description');
      expect(result).toContain('Test Content');
      expect(result).not.toContain('Should not be included');
    });

    it('should include tags in searchable content', () => {
      const data = {
        title: 'Test',
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const result = consumer['extractSearchableContent'](data);

      expect(result).toContain('tag1');
      expect(result).toContain('tag2');
      expect(result).toContain('tag3');
    });
  });
});
