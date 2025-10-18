import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { IndexDocumentDto } from '../dto/index-document.dto';

/**
 * Event consumer for auto-indexing entities
 * Listens to RabbitMQ events and updates search index
 */
@Injectable()
export class IndexEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(IndexEventConsumer.name);

  constructor(private readonly searchService: SearchService) {}

  async onModuleInit() {
    // Initialize RabbitMQ consumers
    // TODO: Connect to RabbitMQ and subscribe to events
    this.logger.log('Index event consumer initialized');
  }

  /**
   * Handle user.created event
   */
  async handleUserCreated(event: any): Promise<void> {
    try {
      const { id, username, email, firstName, lastName, profile } = event.data;

      const document: IndexDocumentDto = {
        entityType: 'User',
        entityId: id,
        title: username || email,
        content: [
          username,
          email,
          firstName,
          lastName,
          profile?.bio,
        ]
          .filter(Boolean)
          .join(' '),
        metadata: {
          email,
          username,
          firstName,
          lastName,
        },
      };

      await this.searchService.indexDocument(document);
      this.logger.log(`Indexed user: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to index user from event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle user.updated event
   */
  async handleUserUpdated(event: any): Promise<void> {
    // Same as created - upsert operation
    await this.handleUserCreated(event);
  }

  /**
   * Handle user.deleted event
   */
  async handleUserDeleted(event: any): Promise<void> {
    try {
      const { id } = event.data;
      await this.searchService.removeFromIndex('User', id);
      this.logger.log(`Removed user from index: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove user from index: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle file.uploaded event
   */
  async handleFileUploaded(event: any): Promise<void> {
    try {
      const { id, filename, mimeType, size, metadata, uploadedBy } = event.data;

      const document: IndexDocumentDto = {
        entityType: 'File',
        entityId: id,
        title: filename,
        content: [
          filename,
          metadata?.description,
          metadata?.tags?.join(' '),
        ]
          .filter(Boolean)
          .join(' '),
        metadata: {
          filename,
          mimeType,
          size,
          uploadedBy,
          ...metadata,
        },
      };

      await this.searchService.indexDocument(document);
      this.logger.log(`Indexed file: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to index file from event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle file.updated event
   */
  async handleFileUpdated(event: any): Promise<void> {
    await this.handleFileUploaded(event);
  }

  /**
   * Handle file.deleted event
   */
  async handleFileDeleted(event: any): Promise<void> {
    try {
      const { id } = event.data;
      await this.searchService.removeFromIndex('File', id);
      this.logger.log(`Removed file from index: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove file from index: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle document.created event
   */
  async handleDocumentCreated(event: any): Promise<void> {
    try {
      const { id, title, content, author, tags, category } = event.data;

      const document: IndexDocumentDto = {
        entityType: 'Document',
        entityId: id,
        title,
        content: [content, tags?.join(' ')].filter(Boolean).join(' '),
        metadata: {
          author,
          tags,
          category,
        },
      };

      await this.searchService.indexDocument(document);
      this.logger.log(`Indexed document: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to index document from event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle document.updated event
   */
  async handleDocumentUpdated(event: any): Promise<void> {
    await this.handleDocumentCreated(event);
  }

  /**
   * Handle document.deleted event
   */
  async handleDocumentDeleted(event: any): Promise<void> {
    try {
      const { id } = event.data;
      await this.searchService.removeFromIndex('Document', id);
      this.logger.log(`Removed document from index: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove document from index: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Generic handler for any entity event
   */
  async handleEntityEvent(
    eventType: string,
    entityType: string,
    data: any,
  ): Promise<void> {
    try {
      if (eventType === 'deleted') {
        await this.searchService.removeFromIndex(entityType, data.id);
      } else {
        // created or updated
        const document: IndexDocumentDto = {
          entityType,
          entityId: data.id,
          title: data.title || data.name || data.id,
          content: this.extractSearchableContent(data),
          metadata: data.metadata || {},
        };

        await this.searchService.indexDocument(document);
      }

      this.logger.log(`Handled ${eventType} event for ${entityType}/${data.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle ${eventType} event for ${entityType}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Extract searchable content from entity data
   */
  private extractSearchableContent(data: any): string {
    const searchableFields = [
      'title',
      'name',
      'description',
      'content',
      'bio',
      'summary',
      'notes',
    ];

    const content = searchableFields
      .map((field) => data[field])
      .filter(Boolean)
      .join(' ');

    // Add array fields
    if (data.tags && Array.isArray(data.tags)) {
      return `${content} ${data.tags.join(' ')}`;
    }

    return content;
  }
}
