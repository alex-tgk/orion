import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceDiscoveryService } from './service-discovery.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('ServiceDiscoveryService', () => {
  let service: ServiceDiscoveryService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceDiscoveryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'gateway.healthCheckInterval') return 5000;
              return defaultValue;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ServiceDiscoveryService>(ServiceDiscoveryService);
    httpService = module.get<HttpService>(HttpService);

    // Prevent automatic initialization
    jest.spyOn(service, 'onModuleInit').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    service.onModuleDestroy();
  });

  describe('service registration', () => {
    it('should register a new service instance', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: { healthy: true } } as any)
      );

      // Act
      await service.register('test-service', 'http://localhost:3001', '/health');

      // Assert
      const instances = service.getAllInstances('test-service');
      expect(instances).toHaveLength(1);
      expect(instances[0].name).toBe('test-service');
      expect(instances[0].host).toBe('localhost');
      expect(instances[0].port).toBe(3001);
    });

    it('should perform initial health check on registration', async () => {
      // Arrange
      const getSpy = jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      // Act
      await service.register('test-service', 'http://localhost:3001', '/health');

      // Assert
      expect(getSpy).toHaveBeenCalledWith(
        'http://localhost:3001/health',
        expect.any(Object)
      );
    });

    it('should mark instance as healthy when health check passes', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      // Act
      await service.register('test-service', 'http://localhost:3001');

      // Assert
      const instances = service.getHealthyInstances('test-service');
      expect(instances).toHaveLength(1);
      expect(instances[0].healthy).toBe(true);
    });

    it('should mark instance as unhealthy when health check fails', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => new Error('Connection refused'))
      );

      // Act
      await service.register('test-service', 'http://localhost:3001');

      // Assert
      const healthyInstances = service.getHealthyInstances('test-service');
      const allInstances = service.getAllInstances('test-service');

      expect(healthyInstances).toHaveLength(0);
      expect(allInstances).toHaveLength(1);
      expect(allInstances[0].healthy).toBe(false);
    });

    it('should update existing instance on re-registration', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      // Act
      await service.register('test-service', 'http://localhost:3001');
      await service.register('test-service', 'http://localhost:3001');

      // Assert - Should still have only one instance
      const instances = service.getAllInstances('test-service');
      expect(instances).toHaveLength(1);
    });
  });

  describe('getHealthyInstances', () => {
    it('should return only healthy instances', async () => {
      // Arrange
      jest.spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ status: 200, data: {} } as any)) // Healthy
        .mockReturnValueOnce(throwError(() => new Error('Error'))); // Unhealthy

      await service.register('test-service', 'http://localhost:3001');
      await service.register('test-service', 'http://localhost:3002');

      // Act
      const healthy = service.getHealthyInstances('test-service');

      // Assert
      expect(healthy).toHaveLength(1);
      expect(healthy[0].port).toBe(3001);
    });

    it('should return empty array for unknown service', () => {
      // Act
      const instances = service.getHealthyInstances('unknown-service');

      // Assert
      expect(instances).toEqual([]);
    });

    it('should return empty array when all instances are unhealthy', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => new Error('Connection refused'))
      );

      await service.register('test-service', 'http://localhost:3001');

      // Act
      const healthy = service.getHealthyInstances('test-service');

      // Assert
      expect(healthy).toHaveLength(0);
    });
  });

  describe('getAllInstances', () => {
    it('should return all instances regardless of health', async () => {
      // Arrange
      jest.spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ status: 200, data: {} } as any))
        .mockReturnValueOnce(throwError(() => new Error('Error')));

      await service.register('test-service', 'http://localhost:3001');
      await service.register('test-service', 'http://localhost:3002');

      // Act
      const all = service.getAllInstances('test-service');

      // Assert
      expect(all).toHaveLength(2);
    });
  });

  describe('getInstance', () => {
    it('should return a healthy instance', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      await service.register('test-service', 'http://localhost:3001');

      // Act
      const instance = service.getInstance('test-service');

      // Assert
      expect(instance).not.toBeNull();
      expect(instance?.healthy).toBe(true);
    });

    it('should return null when no healthy instances available', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => new Error('Error'))
      );

      await service.register('test-service', 'http://localhost:3001');

      // Act
      const instance = service.getInstance('test-service');

      // Assert
      expect(instance).toBeNull();
    });

    it('should return null for unknown service', () => {
      // Act
      const instance = service.getInstance('unknown-service');

      // Assert
      expect(instance).toBeNull();
    });
  });

  describe('isServiceAvailable', () => {
    it('should return true when healthy instances exist', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      await service.register('test-service', 'http://localhost:3001');

      // Act
      const available = service.isServiceAvailable('test-service');

      // Assert
      expect(available).toBe(true);
    });

    it('should return false when no healthy instances exist', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => new Error('Error'))
      );

      await service.register('test-service', 'http://localhost:3001');

      // Act
      const available = service.isServiceAvailable('test-service');

      // Assert
      expect(available).toBe(false);
    });

    it('should return false for unknown service', () => {
      // Act
      const available = service.isServiceAvailable('unknown-service');

      // Assert
      expect(available).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return statistics for all services', async () => {
      // Arrange
      jest.spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ status: 200, data: {} } as any))
        .mockReturnValueOnce(throwError(() => new Error('Error')))
        .mockReturnValueOnce(of({ status: 200, data: {} } as any));

      await service.register('service-1', 'http://localhost:3001');
      await service.register('service-1', 'http://localhost:3002');
      await service.register('service-2', 'http://localhost:3003');

      // Act
      const stats = service.getStats();

      // Assert
      expect(stats['service-1']).toEqual({
        totalInstances: 2,
        healthyInstances: 1,
        unhealthyInstances: 1,
      });
      expect(stats['service-2']).toEqual({
        totalInstances: 1,
        healthyInstances: 1,
        unhealthyInstances: 0,
      });
    });
  });

  describe('deregister', () => {
    it('should remove instance from service', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      await service.register('test-service', 'http://localhost:3001');
      const instances = service.getAllInstances('test-service');
      const instanceId = instances[0].id;

      // Act
      service.deregister('test-service', instanceId);

      // Assert
      const remainingInstances = service.getAllInstances('test-service');
      expect(remainingInstances).toHaveLength(0);
    });

    it('should handle deregistering from unknown service', () => {
      // Act & Assert - Should not throw
      expect(() => {
        service.deregister('unknown-service', 'instance-id');
      }).not.toThrow();
    });

    it('should handle deregistering unknown instance', async () => {
      // Arrange
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      await service.register('test-service', 'http://localhost:3001');

      // Act
      service.deregister('test-service', 'unknown-instance-id');

      // Assert - Should still have the original instance
      const instances = service.getAllInstances('test-service');
      expect(instances).toHaveLength(1);
    });
  });
});
