import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { HealthService } from '../../services/health.service';
import { VectorHealthResponseDto } from '../../dto/vector-response.dto';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthService = {
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);

    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when provider is connected', async () => {
      const healthyResponse: VectorHealthResponseDto = {
        status: 'healthy',
        provider: 'postgres',
        connected: true,
        collectionCount: 5,
        totalVectors: 1000,
        uptime: 3600,
        timestamp: '2025-10-18T14:30:00.000Z',
      };

      mockHealthService.checkHealth.mockResolvedValue(healthyResponse);

      const result = await controller.checkHealth();

      expect(result).toEqual(healthyResponse);
      expect(result.status).toBe('healthy');
      expect(result.connected).toBe(true);
      expect(service.checkHealth).toHaveBeenCalledTimes(1);
    });

    it('should return unhealthy status when provider is disconnected', async () => {
      const unhealthyResponse: VectorHealthResponseDto = {
        status: 'unhealthy',
        provider: 'postgres',
        connected: false,
        uptime: 100,
        timestamp: '2025-10-18T14:30:00.000Z',
      };

      mockHealthService.checkHealth.mockResolvedValue(unhealthyResponse);

      const result = await controller.checkHealth();

      expect(result).toEqual(unhealthyResponse);
      expect(result.status).toBe('unhealthy');
      expect(result.connected).toBe(false);
    });

    it('should return degraded status when provider has issues', async () => {
      const degradedResponse: VectorHealthResponseDto = {
        status: 'degraded',
        provider: 'postgres',
        connected: true,
        collectionCount: 0,
        totalVectors: 0,
        uptime: 3600,
        timestamp: '2025-10-18T14:30:00.000Z',
      };

      mockHealthService.checkHealth.mockResolvedValue(degradedResponse);

      const result = await controller.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.connected).toBe(true);
    });
  });
});
