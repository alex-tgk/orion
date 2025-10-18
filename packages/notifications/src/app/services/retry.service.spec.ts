import { Test, TestingModule } from '@nestjs/testing';
import { RetryService } from './retry.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@orion/shared';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultValue: any) => defaultValue),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            notification: {
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RetryService>(RetryService);
  });

  describe('retry logic', () => {
    it('should execute function successfully on first attempt', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');

      // Act
      const result = await service.executeWithRetry(mockFn);

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success');

      // Act
      const result = await service.executeWithRetry(mockFn, { maxAttempts: 3, delay: 10 });

      // Assert
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts exceeded', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      // Act & Assert
      await expect(
        service.executeWithRetry(mockFn, { maxAttempts: 3, delay: 10 })
      ).rejects.toThrow('Persistent failure');

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();

      // Act
      await service.executeWithRetry(mockFn, {
        maxAttempts: 3,
        delay: 100,
        backoffMultiplier: 2,
      });

      const duration = Date.now() - startTime;

      // Assert - Should have waited ~100ms + ~200ms = ~300ms
      expect(duration).toBeGreaterThanOrEqual(250);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect custom retry condition', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Retryable'))
        .mockRejectedValueOnce(new Error('Non-retryable'));

      const shouldRetry = (error: Error) => error.message === 'Retryable';

      // Act & Assert
      await expect(
        service.executeWithRetry(mockFn, {
          maxAttempts: 5,
          delay: 10,
          shouldRetry,
        })
      ).rejects.toThrow('Non-retryable');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      const onRetrySpy = jest.fn();

      // Act
      await service.executeWithRetry(mockFn, {
        maxAttempts: 3,
        delay: 10,
        onRetry: onRetrySpy,
      });

      // Assert
      expect(onRetrySpy).toHaveBeenCalledTimes(1);
      expect(onRetrySpy).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('circuit breaker integration', () => {
    it('should track failures and open circuit', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Service down'));

      // Act - Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        try {
          await service.executeWithRetry(mockFn, { maxAttempts: 1, delay: 10 });
        } catch (error) {
          // Expected
        }
      }

      // Assert
      const stats = service.getRetryStats();
      expect(stats.totalFailures).toBeGreaterThanOrEqual(5);
    });

    it('should fail fast when circuit is open', async () => {
      // Arrange
      const mockFn = jest.fn().mockRejectedValue(new Error('Error'));

      // Open the circuit
      service.openCircuit('test-operation');

      // Act & Assert
      await expect(
        service.executeWithRetry(mockFn, { operationId: 'test-operation' })
      ).rejects.toThrow('Circuit is open');

      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('retry statistics', () => {
    it('should track successful retries', async () => {
      // Arrange
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      // Act
      await service.executeWithRetry(mockFn, { delay: 10 });

      // Assert
      const stats = service.getRetryStats();
      expect(stats.totalAttempts).toBeGreaterThan(1);
      expect(stats.successfulRetries).toBe(1);
    });

    it('should reset statistics', async () => {
      // Arrange
      const mockFn = jest.fn().mockResolvedValue('success');
      await service.executeWithRetry(mockFn);

      // Act
      service.resetStats();

      // Assert
      const stats = service.getRetryStats();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.totalFailures).toBe(0);
    });
  });
});
