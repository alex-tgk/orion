import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/user';
import { SearchUsersDto, SearchUsersResponseDto, UserSearchResultDto } from '../dto';
import { CacheService } from './cache.service';
import { UserPrismaService } from './user-prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly CACHE_TTL = 60; // 1 minute for search results

  constructor(
    private readonly prisma: UserPrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Search for users with pagination
   * Email addresses are excluded from results for privacy
   */
  async searchUsers(searchDto: SearchUsersDto): Promise<SearchUsersResponseDto> {
    const { q, location, page = 1, limit = 20 } = searchDto;

    // Generate cache key from search parameters
    const cacheKey = `search:${JSON.stringify(searchDto)}`;
    const cached = await this.cache.get<SearchUsersResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for search query');
      return cached;
    }

    // Build where clause
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    // Add search conditions
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with count
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
          location: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Map to DTO
    const data: UserSearchResultDto[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      avatar: user.avatar || undefined,
      bio: user.bio || undefined,
      location: user.location || undefined,
    }));

    const totalPages = Math.ceil(total / limit);

    const response: SearchUsersResponseDto = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    // Cache the result
    await this.cache.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }
}
