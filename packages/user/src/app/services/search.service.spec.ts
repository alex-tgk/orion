import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@orion/shared';
import { SearchService } from './search.service';
import { CacheService } from './cache.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;
  let cache: CacheService;

  const mockUsers = [
    {
      id: 'user-1',
      name: 'John Doe',
      avatar: '/avatar1.jpg',
      bio: 'Software engineer',
      location: 'San Francisco',
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      avatar: null,
      bio: 'Product manager',
      location: 'New York',
    },
  ];

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchUsers', () => {
    it('should return cached results if available', async () => {
      const cachedResults = {
        data: mockUsers,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      };
      mockCacheService.get.mockResolvedValue(cachedResults);

      const result = await service.searchUsers({ q: 'john' });

      expect(result).toEqual(cachedResults);
      expect(cache.get).toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should search users and return paginated results', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.searchUsers({ q: 'john', page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should filter by location', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([mockUsers[0]]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.searchUsers({ location: 'San Francisco' });

      expect(result.data).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: { contains: 'San Francisco', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(50);

      const result = await service.searchUsers({ page: 2, limit: 20 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(3); // Math.ceil(50 / 20) = 3
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (page - 1) * limit = (2 - 1) * 20
          take: 20,
        })
      );
    });
  });
});
