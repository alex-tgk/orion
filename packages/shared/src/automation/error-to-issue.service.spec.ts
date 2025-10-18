import { Test, TestingModule } from '@nestjs/testing';
import { ErrorToIssueService, ErrorToIssueConfig } from './error-to-issue.service';
import { AppError } from '../errors/app-error';
import { ErrorSeverity, ErrorCategory } from '../errors/error-severity.enum';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ErrorToIssueService', () => {
  let service: ErrorToIssueService;
  let config: ErrorToIssueConfig;

  const mockContext = {
    service: 'test-service',
    correlationId: 'test-correlation-id',
    userId: 'user-123',
    path: '/api/test',
    method: 'GET',
  };

  beforeEach(() => {
    config = {
      githubToken: 'test-token',
      githubRepo: 'test-org/test-repo',
      enabled: true,
      maxIssuesPerHour: 10,
      deduplicationWindowMs: 3600000,
      defaultAssignees: ['test-user'],
    };

    const mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    service = new ErrorToIssueService(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processError', () => {
    it('should skip processing if service is disabled', async () => {
      service = new ErrorToIssueService({ ...config, enabled: false });

      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.CRITICAL,
        ErrorCategory.INTERNAL,
        mockContext
      );

      const result = await service.processError(error);
      expect(result).toBeNull();
    });

    it('should skip processing if error should not create issue', async () => {
      const error = new AppError(
        'Test error',
        400,
        ErrorSeverity.LOW,
        ErrorCategory.VALIDATION,
        mockContext
      );

      const result = await service.processError(error);
      expect(result).toBeNull();
    });

    it('should create GitHub issue for CRITICAL errors', async () => {
      const mockIssueResponse = {
        data: {
          number: 123,
          html_url: 'https://github.com/test-org/test-repo/issues/123',
          id: 1,
          title: 'Test Issue',
          state: 'open' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          labels: [],
        },
      };

      const mockAxiosInstance = (service as any).githubClient;
      mockAxiosInstance.post.mockResolvedValue(mockIssueResponse);

      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.CRITICAL,
        ErrorCategory.INTERNAL,
        mockContext
      );

      const result = await service.processError(error);

      expect(result).toBeDefined();
      expect(result?.number).toBe(123);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/repos/test-org/test-repo/issues',
        expect.objectContaining({
          title: expect.stringContaining('CRITICAL'),
          labels: expect.arrayContaining(['bug', 'critical']),
        })
      );
    });

    it('should handle duplicate errors', async () => {
      const mockIssueResponse = {
        data: {
          number: 123,
          html_url: 'https://github.com/test-org/test-repo/issues/123',
          id: 1,
          title: 'Test Issue',
          state: 'open' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          labels: [],
        },
      };

      const mockAxiosInstance = (service as any).githubClient;
      mockAxiosInstance.post.mockResolvedValue(mockIssueResponse);

      const error1 = new AppError(
        'Database connection failed',
        503,
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        mockContext
      );

      const error2 = new AppError(
        'Database connection failed',
        503,
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        mockContext
      );

      // First error should create issue
      const result1 = await service.processError(error1);
      expect(result1).toBeDefined();

      // Second error should be treated as duplicate
      const result2 = await service.processError(error2);
      expect(result2).toBeNull();

      // Should only create one issue
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should respect rate limiting', async () => {
      service = new ErrorToIssueService({ ...config, maxIssuesPerHour: 2 });

      const mockIssueResponse = {
        data: {
          number: 123,
          html_url: 'https://github.com/test-org/test-repo/issues/123',
          id: 1,
          title: 'Test Issue',
          state: 'open' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          labels: [],
        },
      };

      const mockAxiosInstance = (service as any).githubClient;
      mockAxiosInstance.post.mockResolvedValue(mockIssueResponse);

      // Create 3 different errors
      for (let i = 0; i < 3; i++) {
        const error = new AppError(
          `Test error ${i}`,
          500,
          ErrorSeverity.CRITICAL,
          ErrorCategory.INTERNAL,
          { ...mockContext, metadata: { index: i } }
        );

        await service.processError(error);
      }

      // Should only create 2 issues due to rate limit
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatistics', () => {
    it('should return service statistics', () => {
      const stats = service.getStatistics();

      expect(stats.enabled).toBe(true);
      expect(stats.maxIssuesPerHour).toBe(10);
      expect(stats.issuesCreatedThisHour).toBe(0);
      expect(stats.trackedErrorSignatures).toBe(0);
    });
  });

  describe('cleanupOldOccurrences', () => {
    it('should remove old error occurrences', async () => {
      // Create an error to track
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.CRITICAL,
        ErrorCategory.INTERNAL,
        {
          ...mockContext,
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        }
      );

      // Track the error
      (service as any).trackOccurrence(error);

      const statsBefore = service.getStatistics();
      expect(statsBefore.trackedErrorSignatures).toBe(1);

      // Clean up old occurrences
      service.cleanupOldOccurrences();

      const statsAfter = service.getStatistics();
      expect(statsAfter.trackedErrorSignatures).toBe(0);
    });
  });
});
