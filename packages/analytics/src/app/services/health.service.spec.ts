import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from './prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get(PrismaService);
  });

  describe('getHealth', () => {
    it('should return healthy status when database is connected', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('analytics');
      expect(result.checks.database.status).toBe('healthy');
      expect(result.checks.database.latency).toBeDefined();
      expect(result.checks.memory.status).toBe('healthy');
    });

    it('should return unhealthy status when database fails', async () => {
      const dbError = new Error('Connection refused');
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(dbError);

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('unhealthy');
      expect(result.checks.database.error).toBe('Connection refused');
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when database is accessible', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.getReadiness();

      expect(result.status).toBe('ready');
      expect(result.service).toBe('analytics');
    });

    it('should return not ready status when database is not accessible', async () => {
      const dbError = new Error('Database not ready');
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(dbError);

      const result = await service.getReadiness();

      expect(result.status).toBe('not_ready');
      expect(result.error).toBe('Database not ready');
    });
  });
});
