import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);

    // Mock Prisma methods
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.$disconnect = jest.fn().mockResolvedValue(undefined);
    service.$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to database on module init', async () => {
      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalled();
    });

    it('should throw error if connection fails', async () => {
      const error = new Error('Connection failed');
      (service.$connect as jest.Mock).mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database on module destroy', async () => {
      await service.onModuleDestroy();

      expect(service.$disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      (service.$disconnect as jest.Mock).mockRejectedValue(error);

      // Should not throw
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('should return true when query succeeds', async () => {
      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(service.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when query fails', async () => {
      (service.$queryRaw as jest.Mock).mockRejectedValue(new Error('Query failed'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });
});
