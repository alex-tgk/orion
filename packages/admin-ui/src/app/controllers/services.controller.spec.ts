import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from './services.controller';
import { ObservabilityService } from '../services/observability.service';
import { HealthAggregationService } from '../services/health-aggregation.service';
import { MetricsService } from '../services/metrics.service';
import { ServiceStatus } from '../dto/service-health.dto';
import { NotFoundException } from '@nestjs/common';

describe('ServicesController', () => {
  let controller: ServicesController;
  let observabilityService: jest.Mocked<ObservabilityService>;
  let healthAggregationService: jest.Mocked<HealthAggregationService>;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        {
          provide: ObservabilityService,
          useValue: {
            getServicesList: jest.fn(),
            getServiceHealth: jest.fn(),
            discoverServices: jest.fn(),
          },
        },
        {
          provide: HealthAggregationService,
          useValue: {
            checkServiceHealth: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            getServiceMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    observabilityService = module.get(ObservabilityService);
    healthAggregationService = module.get(HealthAggregationService);
    metricsService = module.get(MetricsService);
  });

  describe('GET /api/services', () => {
    it('should return list of all services', async () => {
      const mockServices = {
        services: [
          {
            serviceName: 'auth',
            status: ServiceStatus.HEALTHY,
            host: 'localhost',
            port: 3001,
            url: 'http://localhost:3001',
            startedAt: '2025-01-01T00:00:00Z',
            lastCheck: '2025-01-01T12:00:00Z',
          },
        ],
        total: 1,
        healthy: 1,
        degraded: 0,
        unhealthy: 0,
        unknown: 0,
        timestamp: '2025-01-01T12:00:00Z',
      };

      observabilityService.getServicesList.mockResolvedValue(mockServices);

      const result = await controller.listServices();

      expect(result).toEqual(mockServices);
      expect(observabilityService.getServicesList).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      observabilityService.getServicesList.mockRejectedValue(new Error('Service unavailable'));

      await expect(controller.listServices()).rejects.toThrow('Service unavailable');
    });
  });

  describe('GET /api/services/:name', () => {
    it('should return service details', async () => {
      const mockService = {
        serviceName: 'auth',
        status: ServiceStatus.HEALTHY,
        timestamp: '2025-01-01T12:00:00Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'development',
        url: 'http://localhost:3001',
      };

      observabilityService.getServiceHealth.mockResolvedValue(mockService);

      const result = await controller.getServiceDetails('auth');

      expect(result).toEqual(mockService);
      expect(observabilityService.getServiceHealth).toHaveBeenCalledWith('auth');
    });

    it('should throw NotFoundException for non-existent service', async () => {
      observabilityService.getServiceHealth.mockResolvedValue({
        serviceName: 'nonexistent',
        status: ServiceStatus.UNKNOWN,
        timestamp: '2025-01-01T12:00:00Z',
        uptime: 0,
        version: 'unknown',
        environment: 'unknown',
        error: 'Service not registered',
      });

      await expect(controller.getServiceDetails('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /api/services/:name/health', () => {
    it('should return service health', async () => {
      const mockHealth = {
        serviceName: 'auth',
        status: ServiceStatus.HEALTHY,
        timestamp: '2025-01-01T12:00:00Z',
        uptime: 3600,
        version: '1.0.0',
        environment: 'development',
      };

      healthAggregationService.checkServiceHealth.mockResolvedValue(mockHealth);

      const result = await controller.getServiceHealth('auth');

      expect(result).toEqual(mockHealth);
    });
  });

  describe('GET /api/services/:name/metrics', () => {
    it('should return service metrics', async () => {
      const mockMetrics = {
        serviceName: 'auth',
        requests: {
          total: 1000,
          success: 950,
          clientErrors: 40,
          serverErrors: 10,
          avgResponseTime: 50,
          p95ResponseTime: 120,
          p99ResponseTime: 200,
          requestsPerSecond: 10,
        },
        resources: {
          memoryUsage: 256,
          memoryLimit: 512,
          cpuUsage: 25,
          heapUsed: 200,
          heapTotal: 256,
          external: 10,
        },
        topEndpoints: [],
        timestamp: '2025-01-01T12:00:00Z',
        timeRange: 60,
      };

      metricsService.getServiceMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getServiceMetrics('auth');

      expect(result).toEqual(mockMetrics);
    });

    it('should handle service with no metrics', async () => {
      metricsService.getServiceMetrics.mockResolvedValue(null);

      await expect(controller.getServiceMetrics('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
