import { Test, TestingModule } from '@nestjs/testing';
import { ErrorWebhookController } from './error-webhook.controller';
import { ErrorWebhookService } from './error-webhook.service';
import { ErrorWebhookDto } from './dto/error-webhook.dto';
import { ErrorSeverity, ErrorCategory } from '@orion/shared/errors';

describe('ErrorWebhookController', () => {
  let controller: ErrorWebhookController;
  let service: ErrorWebhookService;

  const mockErrorWebhookService = {
    processErrorWebhook: jest.fn(),
    getStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErrorWebhookController],
      providers: [
        {
          provide: ErrorWebhookService,
          useValue: mockErrorWebhookService,
        },
      ],
    }).compile();

    controller = module.get<ErrorWebhookController>(ErrorWebhookController);
    service = module.get<ErrorWebhookService>(ErrorWebhookService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reportError', () => {
    it('should accept and process error webhook', async () => {
      const errorDto: ErrorWebhookDto = {
        name: 'DatabaseError',
        message: 'Database connection failed',
        code: 'DB-C-123',
        statusCode: 503,
        severity: ErrorSeverity.CRITICAL,
        category: ErrorCategory.DATABASE,
        service: 'user-service',
        timestamp: new Date().toISOString(),
      };

      mockErrorWebhookService.processErrorWebhook.mockResolvedValue(undefined);

      const result = await controller.reportError(errorDto);

      expect(result.status).toBe('accepted');
      expect(result.errorCode).toBe('DB-C-123');
      expect(service.processErrorWebhook).toHaveBeenCalledWith(errorDto);
    });

    it('should handle processing errors', async () => {
      const errorDto: ErrorWebhookDto = {
        name: 'TestError',
        message: 'Test error',
        code: 'TEST-123',
        statusCode: 500,
        service: 'test-service',
        timestamp: new Date().toISOString(),
      };

      mockErrorWebhookService.processErrorWebhook.mockRejectedValue(
        new Error('Processing failed')
      );

      await expect(controller.reportError(errorDto)).rejects.toThrow(
        'Processing failed'
      );
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      const mockStats = {
        webhook: {
          processedCount: 10,
          failedCount: 2,
        },
        issueService: {
          enabled: true,
          issuesCreatedThisHour: 5,
        },
      };

      mockErrorWebhookService.getStatistics.mockReturnValue(mockStats);

      const result = controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStatistics).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return health status', () => {
      const result = controller.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('error-webhook');
      expect(result.timestamp).toBeDefined();
    });
  });
});
