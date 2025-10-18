import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { ErrorWebhookService } from './error-webhook.service';
import { ErrorWebhookDto } from './dto/error-webhook.dto';
import { ErrorSeverity, ErrorCategory } from '@orion/shared/errors';

describe('ErrorWebhookService', () => {
  let service: ErrorWebhookService;
  let mockQueue: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          GITHUB_TOKEN: 'test-token',
          GITHUB_REPO: 'test-org/test-repo',
          ERROR_TO_ISSUE_ENABLED: true,
          ERROR_TO_ISSUE_MAX_PER_HOUR: 50,
          ERROR_TO_ISSUE_DEDUP_WINDOW_MS: 3600000,
          ERROR_TO_ISSUE_ASSIGNEES: '',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorWebhookService,
        {
          provide: getQueueToken('error-processing'),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ErrorWebhookService>(ErrorWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processErrorWebhook', () => {
    it('should process error webhook with classification', async () => {
      const errorDto: ErrorWebhookDto = {
        name: 'DatabaseError',
        message: 'Database connection failed',
        code: 'DB-C-123',
        statusCode: 503,
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.DATABASE,
        service: 'user-service',
        correlationId: 'test-corr-id',
        timestamp: new Date().toISOString(),
      };

      await service.processErrorWebhook(errorDto);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-error',
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'DB-C-123',
            severity: ErrorSeverity.CRITICAL,
            category: ErrorCategory.DATABASE,
          }),
        }),
        expect.any(Object)
      );
    });

    it('should process error webhook without classification', async () => {
      const errorDto: ErrorWebhookDto = {
        name: 'Error',
        message: 'Unknown error',
        code: 'ERR-123',
        statusCode: 500,
        service: 'test-service',
        timestamp: new Date().toISOString(),
      };

      await service.processErrorWebhook(errorDto);

      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should handle queue errors', async () => {
      const errorDto: ErrorWebhookDto = {
        name: 'TestError',
        message: 'Test error',
        code: 'TEST-123',
        statusCode: 500,
        service: 'test-service',
        timestamp: new Date().toISOString(),
      };

      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(service.processErrorWebhook(errorDto)).rejects.toThrow(
        'Queue error'
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toHaveProperty('webhook');
      expect(stats).toHaveProperty('issueService');
      expect(stats.webhook).toHaveProperty('processedCount');
      expect(stats.webhook).toHaveProperty('failedCount');
    });
  });
});
