import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/user';
import { UserPreferencesDto, UpdateUserPreferencesDto } from '../dto';
import { CacheService } from './cache.service';
import { EventPublisherService } from './event-publisher.service';
import { UserPrismaService } from './user-prisma.service';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    private readonly prisma: UserPrismaService,
    private readonly cache: CacheService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Get user preferences by user ID
   */
  async findByUserId(userId: string, requestingUserId: string): Promise<UserPreferencesDto> {
    // Users can only view their own preferences
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only view your own preferences');
    }

    // Try cache first
    const cacheKey = `preferences:${userId}`;
    const cached = await this.cache.get<UserPreferencesDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for preferences ${userId}`);
      return cached;
    }

    // Fetch from database
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      throw new NotFoundException(`Preferences for user ${userId} not found`);
    }

    const preferencesDto = this.mapToDto(preferences);

    // Cache the result
    await this.cache.set(cacheKey, preferencesDto, this.CACHE_TTL);

    return preferencesDto;
  }

  /**
   * Update user preferences
   */
  async update(
    userId: string,
    updateDto: UpdateUserPreferencesDto,
    requestingUserId: string,
  ): Promise<UserPreferencesDto> {
    // Authorization check
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own preferences');
    }

    // Check if preferences exist
    const existing = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException(`Preferences for user ${userId} not found`);
    }

    // Merge updates with existing preferences
    const updatedData: Prisma.UserPreferencesUpdateInput = {};

    if (updateDto.notifications) {
      const currentNotifications = existing.notifications as Record<string, boolean>;
      updatedData.notifications = {
        ...currentNotifications,
        ...updateDto.notifications,
      };
    }

    if (updateDto.privacy) {
      const currentPrivacy = existing.privacy as Record<string, string | boolean>;
      updatedData.privacy = {
        ...currentPrivacy,
        ...updateDto.privacy,
      };
    }

    if (updateDto.display) {
      const currentDisplay = existing.display as Record<string, string>;
      updatedData.display = {
        ...currentDisplay,
        ...updateDto.display,
      };
    }

    // Update preferences
    const updated = await this.prisma.userPreferences.update({
      where: { userId },
      data: updatedData,
    });

    const preferencesDto = this.mapToDto(updated);

    // Invalidate cache
    await this.cache.delete(`preferences:${userId}`);

    // Publish event
    await this.eventPublisher.publishUserPreferencesUpdated(userId, updateDto);

    this.logger.log(`Preferences updated for user: ${userId}`);
    return preferencesDto;
  }

  /**
   * Map Prisma UserPreferences entity to DTO
   */
  private mapToDto(preferences: {
    notifications: Prisma.JsonValue;
    privacy: Prisma.JsonValue;
    display: Prisma.JsonValue;
  }): UserPreferencesDto {
    return {
      notifications: preferences.notifications as UserPreferencesDto['notifications'],
      privacy: preferences.privacy as UserPreferencesDto['privacy'],
      display: preferences.display as UserPreferencesDto['display'],
    };
  }
}
