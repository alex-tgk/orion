import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  USER_EVENT_PATTERNS,
  UserUpdatedEvent,
  UserDeletedEvent,
  AUTH_EVENT_PATTERNS,
  LogoutEvent,
} from '@orion/shared';
import { CacheService } from '../services/cache.service';

/**
 * Cache Invalidation Listener
 *
 * Listens for domain events and invalidates relevant cache entries.
 * This ensures cache consistency across the platform.
 */
@Injectable()
export class CacheInvalidationListener {
  private readonly logger = new Logger(CacheInvalidationListener.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Handle user updated events
   * Invalidates all user-related cache entries
   */
  @OnEvent(USER_EVENT_PATTERNS.USER_UPDATED)
  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    try {
      this.logger.log(
        `Handling user.updated event for userId: ${event.userId}`,
      );

      // Invalidate user cache by pattern
      const pattern = `user:${event.userId}:*`;
      const count = await this.cacheService.invalidateByPattern(pattern);

      // Also invalidate by tags
      const tags = ['user', `user:${event.userId}`];
      const tagCount = await this.cacheService.invalidateByTags(tags);

      this.logger.log(
        `Invalidated ${count + tagCount} cache entries for user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for user.updated event:`,
        error,
      );
    }
  }

  /**
   * Handle user deleted events
   * Invalidates all user-related cache entries
   */
  @OnEvent(USER_EVENT_PATTERNS.USER_DELETED)
  async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
    try {
      this.logger.log(
        `Handling user.deleted event for userId: ${event.userId}`,
      );

      // Invalidate all user-related cache
      const pattern = `user:${event.userId}:*`;
      const count = await this.cacheService.invalidateByPattern(pattern);

      // Clean up tags
      const tags = ['user', `user:${event.userId}`];
      const tagCount = await this.cacheService.invalidateByTags(tags);

      this.logger.log(
        `Invalidated ${count + tagCount} cache entries for deleted user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for user.deleted event:`,
        error,
      );
    }
  }

  /**
   * Handle logout events
   * Invalidates session cache
   */
  @OnEvent(AUTH_EVENT_PATTERNS.LOGOUT)
  async handleLogout(event: LogoutEvent): Promise<void> {
    try {
      this.logger.log(`Handling logout event for userId: ${event.userId}`);

      // Invalidate session cache
      const pattern = `session:${event.userId}:*`;
      const count = await this.cacheService.invalidateByPattern(pattern);

      // Invalidate auth-related tags
      const tags = ['session', `session:${event.userId}`];
      const tagCount = await this.cacheService.invalidateByTags(tags);

      this.logger.log(
        `Invalidated ${count + tagCount} session cache entries for user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for logout event:`, error);
    }
  }

  /**
   * Handle generic cache invalidation events
   * Allows other services to trigger cache invalidation
   */
  @OnEvent('cache.invalidate')
  async handleCacheInvalidate(event: {
    pattern?: string;
    tags?: string[];
    namespace?: string;
  }): Promise<void> {
    try {
      this.logger.log(`Handling cache.invalidate event`);

      let totalInvalidated = 0;

      if (event.pattern) {
        const count = await this.cacheService.invalidateByPattern(
          event.pattern,
          event.namespace,
        );
        totalInvalidated += count;
      }

      if (event.tags && event.tags.length > 0) {
        const count = await this.cacheService.invalidateByTags(
          event.tags,
          event.namespace,
        );
        totalInvalidated += count;
      }

      this.logger.log(
        `Cache invalidation completed: ${totalInvalidated} entries removed`,
      );
    } catch (error) {
      this.logger.error(`Failed to invalidate cache:`, error);
    }
  }
}
