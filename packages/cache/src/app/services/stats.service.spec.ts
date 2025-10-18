import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { CacheService } from './cache.service';

describe('StatsService', () => {
  let service: StatsService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      getStats: jest.fn(),
      getRedisInfo: jest.fn(),
      getKeyCount: jest.fn(),
      resetStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return comprehensive cache statistics', async () => {
      const mockLocalStats = { hits: 100, misses: 20, sets: 50, deletes: 10 };
      const mockRedisInfo = {
        memory: { used_memory: '1048576' },
        server: { uptime_in_seconds: '86400' },
        clients: { connected_clients: '5' },
        stats: { total_commands_processed: '10500' },
      };
      const mockKeyCount = 1250;

      cacheService.getStats.mockReturnValue(mockLocalStats);
      cacheService.getRedisInfo.mockResolvedValue(mockRedisInfo);
      cacheService.getKeyCount.mockResolvedValue(mockKeyCount);

      const result = await service.getStats();

      expect(result).toMatchObject({
        totalKeys: 1250,
        hits: 100,
        misses: 20,
        hitRatio: 0.833, // 100 / (100 + 20)
        memoryUsage: 1048576,
        memoryUsageFormatted: '1 MB',
        uptime: 86400,
        connectedClients: 5,
        totalCommands: 10500,
      });
      expect(result.timestamp).toBeDefined();
    });

    it('should handle zero requests correctly', async () => {
      const mockLocalStats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
      const mockRedisInfo = {
        memory: { used_memory: '0' },
        server: { uptime_in_seconds: '0' },
        clients: { connected_clients: '0' },
        stats: { total_commands_processed: '0' },
      };

      cacheService.getStats.mockReturnValue(mockLocalStats);
      cacheService.getRedisInfo.mockResolvedValue(mockRedisInfo);
      cacheService.getKeyCount.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.hitRatio).toBe(0);
      expect(result.hits).toBe(0);
      expect(result.misses).toBe(0);
    });

    it('should format bytes correctly', async () => {
      const testCases = [
        { bytes: 0, expected: '0 B' },
        { bytes: 1024, expected: '1 KB' },
        { bytes: 1048576, expected: '1 MB' },
        { bytes: 1073741824, expected: '1 GB' },
        { bytes: 1536, expected: '1.5 KB' }, // Test non-whole numbers
      ];

      for (const testCase of testCases) {
        const mockRedisInfo = {
          memory: { used_memory: testCase.bytes.toString() },
          server: { uptime_in_seconds: '0' },
          clients: { connected_clients: '0' },
          stats: { total_commands_processed: '0' },
        };

        cacheService.getStats.mockReturnValue({
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
        });
        cacheService.getRedisInfo.mockResolvedValue(mockRedisInfo);
        cacheService.getKeyCount.mockResolvedValue(0);

        const result = await service.getStats();
        expect(result.memoryUsageFormatted).toBe(testCase.expected);
      }
    });

    it('should throw error if cache service fails', async () => {
      cacheService.getStats.mockImplementation(() => {
        throw new Error('Cache service error');
      });

      await expect(service.getStats()).rejects.toThrow('Cache service error');
    });
  });

  describe('getNamespaceStats', () => {
    it('should return stats for specific namespace', async () => {
      cacheService.getKeyCount.mockResolvedValue(500);

      const result = await service.getNamespaceStats('tenant:acme');

      expect(result.totalKeys).toBe(500);
      expect(result.timestamp).toBeDefined();
      expect(cacheService.getKeyCount).toHaveBeenCalledWith('tenant:acme');
    });

    it('should throw error if cache service fails', async () => {
      cacheService.getKeyCount.mockRejectedValue(new Error('Redis error'));

      await expect(service.getNamespaceStats('tenant:acme')).rejects.toThrow(
        'Redis error',
      );
    });
  });

  describe('resetStats', () => {
    it('should reset cache statistics', () => {
      service.resetStats();

      expect(cacheService.resetStats).toHaveBeenCalled();
    });
  });
});
