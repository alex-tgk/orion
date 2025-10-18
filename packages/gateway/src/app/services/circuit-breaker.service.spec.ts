import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with CLOSED state for default services', () => {
      expect(service.getState('auth')).toBe('CLOSED');
      expect(service.getState('user')).toBe('CLOSED');
      expect(service.getState('notification')).toBe('CLOSED');
    });

    it('should create circuit for new service', () => {
      const state = service.getState('new-service');
      expect(state).toBe('CLOSED');
    });
  });

  describe('execute - success flow', () => {
    it('should execute function successfully when circuit is CLOSED', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act
      const result = await service.execute('test-service', mockFn);

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(service.getState('test-service')).toBe('CLOSED');
    });

    it('should track consecutive successes', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act
      await service.execute('test-service', mockFn);
      await service.execute('test-service', mockFn);
      await service.execute('test-service', mockFn);

      // Assert
      const stats = service.getAllStats()['test-service'];
      expect(stats.successes).toBe(3);
      expect(stats.consecutiveSuccesses).toBe(3);
      expect(stats.totalRequests).toBe(3);
    });
  });

  describe('execute - failure flow', () => {
    it('should throw error when function fails', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Act & Assert
      await expect(service.execute('test-service', mockFn)).rejects.toThrow(
        'Service error'
      );
    });

    it('should track failures', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

      // Act
      try {
        await service.execute('test-service', mockFn);
      } catch (error) {
        // Expected
      }

      // Assert
      const stats = service.getAllStats()['test-service'];
      expect(stats.failures).toBe(1);
      expect(stats.consecutiveFailures).toBe(1);
    });

    it('should open circuit after threshold failures', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));
      const failureThreshold = 5;

      // Act - First ensure we meet volume threshold
      for (let i = 0; i < failureThreshold + 5; i++) {
        try {
          await service.execute('test-service', mockFn);
        } catch (error) {
          // Expected
        }
      }

      // Assert
      expect(service.getState('test-service')).toBe('OPEN');
      expect(service.isOpen('test-service')).toBe(true);
    });

    it('should fail fast when circuit is OPEN', async () => {
      // Arrange
      service.forceState('test-service', 'OPEN' as any);
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act & Assert
      await expect(service.execute('test-service', mockFn)).rejects.toThrow(
        'Circuit breaker is OPEN for service: test-service'
      );
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('circuit recovery', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      // Arrange
      service.forceState('test-service', 'OPEN' as any);
      const mockFn = jest.fn().mockResolvedValue('success');

      // Wait for timeout (mocking time)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);

      // Act
      const result = await service.execute('test-service', mockFn);

      // Assert
      expect(result).toBe('success');
      expect(service.getState('test-service')).toBe('HALF_OPEN');
    });

    it('should close circuit after successful requests in HALF_OPEN', async () => {
      // Arrange
      service.forceState('test-service', 'HALF_OPEN' as any);
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act - Execute enough successful requests to close circuit
      await service.execute('test-service', mockFn);
      await service.execute('test-service', mockFn);

      // Assert
      expect(service.getState('test-service')).toBe('CLOSED');
    });

    it('should reopen circuit if failure occurs in HALF_OPEN', async () => {
      // Arrange
      service.forceState('test-service', 'HALF_OPEN' as any);
      const mockFn = jest.fn().mockRejectedValue(new Error('Still failing'));

      // Act
      try {
        await service.execute('test-service', mockFn);
      } catch (error) {
        // Expected
      }

      // Assert
      expect(service.getState('test-service')).toBe('OPEN');
    });
  });

  describe('getAllStats', () => {
    it('should return statistics for all circuits', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act
      await service.execute('service-1', mockFn);
      await service.execute('service-2', mockFn);

      const stats = service.getAllStats();

      // Assert
      expect(stats['service-1']).toBeDefined();
      expect(stats['service-2']).toBeDefined();
      expect(stats['service-1'].totalRequests).toBe(1);
      expect(stats['service-2'].totalRequests).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset circuit to initial state', async () => {
      // Arrange
      service.forceState('test-service', 'OPEN' as any);

      // Act
      service.reset('test-service');

      // Assert
      expect(service.getState('test-service')).toBe('CLOSED');
      const stats = service.getAllStats()['test-service'];
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.consecutiveFailures).toBe(0);
    });
  });

  describe('forceState', () => {
    it('should force circuit to specific state', () => {
      // Arrange
      expect(service.getState('test-service')).toBe('CLOSED');

      // Act
      service.forceState('test-service', 'OPEN' as any);

      // Assert
      expect(service.getState('test-service')).toBe('OPEN');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive requests', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');
      const requests = Array(100).fill(null);

      // Act
      await Promise.all(requests.map(() => service.execute('test-service', mockFn)));

      // Assert
      const stats = service.getAllStats()['test-service'];
      expect(stats.totalRequests).toBe(100);
      expect(stats.successes).toBe(100);
    });

    it('should handle alternating success and failure', async () => {
      // Arrange
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount % 2 === 0
          ? Promise.resolve('success')
          : Promise.reject(new Error('failure'));
      });

      // Act
      for (let i = 0; i < 10; i++) {
        try {
          await service.execute('test-service', mockFn);
        } catch (error) {
          // Expected
        }
      }

      // Assert
      const stats = service.getAllStats()['test-service'];
      expect(stats.totalRequests).toBe(10);
      expect(stats.successes).toBe(5);
      expect(stats.failures).toBe(5);
    });

    it('should maintain separate state for different services', async () => {
      // Arrange
      const successFn = jest.fn().mockResolvedValue('success');
      const failureFn = jest.fn().mockRejectedValue(new Error('failure'));

      // Act
      await service.execute('service-1', successFn);
      try {
        await service.execute('service-2', failureFn);
      } catch (error) {
        // Expected
      }

      // Assert
      expect(service.getState('service-1')).toBe('CLOSED');
      expect(service.getState('service-2')).toBe('CLOSED'); // Not enough failures to open
      const stats = service.getAllStats();
      expect(stats['service-1'].successes).toBe(1);
      expect(stats['service-2'].failures).toBe(1);
    });
  });
});
