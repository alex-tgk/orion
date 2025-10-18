import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { DatabaseService } from './database.service';
import { S3Service } from './s3.service';

describe('HealthService', () => {
  let service: HealthService;
  let databaseService: jest.Mocked<DatabaseService>;
  let s3Service: jest.Mocked<S3Service>;

  beforeEach(async () => {
    const mockDatabase = {
      healthCheck: jest.fn(),
    };

    const mockS3 = {
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DatabaseService, useValue: mockDatabase },
        { provide: S3Service, useValue: mockS3 },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    databaseService = module.get(DatabaseService) as jest.Mocked<DatabaseService>;
    s3Service = module.get(S3Service) as jest.Mocked<S3Service>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy status when all checks pass', async () => {
      databaseService.healthCheck.mockResolvedValue(true);
      s3Service.exists.mockResolvedValue(true);

      const result = await service.check();

      expect(result.status).toBe('healthy');
      expect(result.checks.database).toBe(true);
      expect(result.checks.s3).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThan(0);
    });

    it('should return unhealthy status when database check fails', async () => {
      databaseService.healthCheck.mockResolvedValue(false);
      s3Service.exists.mockResolvedValue(true);

      const result = await service.check();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database).toBe(false);
      expect(result.checks.s3).toBe(true);
    });

    it('should return unhealthy status when S3 check fails', async () => {
      databaseService.healthCheck.mockResolvedValue(true);
      s3Service.exists.mockRejectedValue(new Error('S3 error'));

      const result = await service.check();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database).toBe(true);
      expect(result.checks.s3).toBe(false);
    });

    it('should return healthy when S3 returns NotFound error', async () => {
      const notFoundError: any = new Error('Not found');
      notFoundError.name = 'NotFound';

      databaseService.healthCheck.mockResolvedValue(true);
      s3Service.exists.mockRejectedValue(notFoundError);

      const result = await service.check();

      expect(result.status).toBe('healthy');
      expect(result.checks.s3).toBe(true);
    });

    it('should return healthy when S3 returns 404 status code', async () => {
      const notFoundError: any = new Error('Not found');
      notFoundError.$metadata = { httpStatusCode: 404 };

      databaseService.healthCheck.mockResolvedValue(true);
      s3Service.exists.mockRejectedValue(notFoundError);

      const result = await service.check();

      expect(result.status).toBe('healthy');
      expect(result.checks.s3).toBe(true);
    });

    it('should handle database health check errors', async () => {
      databaseService.healthCheck.mockRejectedValue(new Error('Database error'));
      s3Service.exists.mockResolvedValue(true);

      const result = await service.check();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database).toBe(false);
    });
  });
});
