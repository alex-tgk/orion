import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { User } from '@prisma/user';
import { UpdateUserDto, UserProfileDto } from '../dto';
import { CacheService } from './cache.service';
import { EventPublisherService } from './event-publisher.service';
import { UserPrismaService } from './user-prisma.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: UserPrismaService,
    private readonly cache: CacheService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Get user by ID
   * Implements caching layer for performance
   */
  async findById(userId: string): Promise<UserProfileDto> {
    // Try cache first
    const cacheKey = `user:${userId}`;
    const cached = await this.cache.get<UserProfileDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user ${userId}`);
      return cached;
    }

    // Fetch from database
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const userDto = this.mapToDto(user);

    // Cache the result
    await this.cache.set(cacheKey, userDto, this.CACHE_TTL);

    return userDto;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return this.mapToDto(user);
  }

  /**
   * Create a new user profile
   * This is typically called after successful registration in Auth Service
   */
  async create(email: string, name: string): Promise<UserProfileDto> {
    this.logger.log(`Creating user profile for ${email}`);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        preferences: {
          create: {
            notifications: {
              email: true,
              sms: false,
              push: true,
            },
            privacy: {
              profileVisibility: 'public',
              showEmail: false,
              showLocation: true,
            },
            display: {
              theme: 'auto',
              language: 'en',
            },
          },
        },
      },
      include: {
        preferences: true,
      },
    });

    const userDto = this.mapToDto(user);

    // Publish event
    await this.eventPublisher.publishUserCreated(user.id, user.email, user.name);

    this.logger.log(`User profile created successfully: ${user.id}`);
    return userDto;
  }

  /**
   * Update user profile
   * Users can only update their own profile
   */
  async update(
    userId: string,
    updateDto: UpdateUserDto,
    requestingUserId: string,
  ): Promise<UserProfileDto> {
    // Authorization check: users can only update their own profile
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateDto,
    });

    const userDto = this.mapToDto(updatedUser);

    // Invalidate cache
    await this.cache.delete(`user:${userId}`);

    // Publish event
    const changes = Object.keys(updateDto);
    await this.eventPublisher.publishUserUpdated(userId, changes);

    this.logger.log(`User profile updated: ${userId}`);
    return userDto;
  }

  /**
   * Soft delete user profile
   * Users can only delete their own profile
   */
  async delete(userId: string, requestingUserId: string): Promise<void> {
    // Authorization check: users can only delete their own profile
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own profile');
    }

    // Check if user exists and not already deleted
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found or already deleted`);
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // Invalidate all user-related caches
    await this.cache.delete(`user:${userId}`);
    await this.cache.delete(`preferences:${userId}`);

    // Publish event
    await this.eventPublisher.publishUserDeleted(userId);

    this.logger.log(`User profile soft deleted: ${userId}`);
  }

  /**
   * Update user avatar URL
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    const userDto = this.mapToDto(user);

    // Invalidate cache
    await this.cache.delete(`user:${userId}`);

    // Publish update event
    await this.eventPublisher.publishUserUpdated(userId, ['avatar']);

    return userDto;
  }

  /**
   * Map Prisma User entity to DTO
   */
  private mapToDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar || undefined,
      bio: user.bio || undefined,
      location: user.location || undefined,
      website: user.website || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
