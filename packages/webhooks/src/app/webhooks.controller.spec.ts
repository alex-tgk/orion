import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './services/webhooks.service';
import { HealthService } from './services/health.service';
import { CreateWebhookDto, UpdateWebhookDto, TestWebhookDto } from './dto';
import { WebhookStatus } from '@prisma/client/webhooks';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: jest.Mocked<WebhooksService>;
  let healthService: jest.Mocked<HealthService>;

  const mockWebhookResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    url: 'https://example.com/webhook',
    events: ['user.created', 'user.updated'],
    description: 'Test webhook',
    status: WebhookStatus.ACTIVE,
    isActive: true,
    failureCount: 0,
    consecutiveFailures: 0,
    successCount: 10,
    timeout: 10000,
    retryAttempts: 3,
    headers: {},
    tags: ['test'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockWebhooksService = {
      createWebhook: jest.fn(),
      getWebhook: jest.fn(),
      listWebhooks: jest.fn(),
      updateWebhook: jest.fn(),
      deleteWebhook: jest.fn(),
      testWebhook: jest.fn(),
      getDeliveries: jest.fn(),
      retryDelivery: jest.fn(),
    };

    const mockHealthService = {
      checkHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: HealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    webhooksService = module.get(WebhooksService);
    healthService = module.get(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createWebhook', () => {
    it('should create a new webhook', async () => {
      const dto: CreateWebhookDto = {
        url: 'https://example.com/webhook',
        events: ['user.created'],
      };

      webhooksService.createWebhook.mockResolvedValue(mockWebhookResponse);

      const result = await controller.createWebhook(dto);

      expect(result).toEqual(mockWebhookResponse);
      expect(webhooksService.createWebhook).toHaveBeenCalledWith(
        expect.any(String),
        dto,
      );
    });
  });

  describe('listWebhooks', () => {
    it('should return list of webhooks', async () => {
      const mockList = {
        webhooks: [mockWebhookResponse],
        total: 1,
        page: 1,
        limit: 20,
      };

      webhooksService.listWebhooks.mockResolvedValue(mockList);

      const result = await controller.listWebhooks({ page: 1, limit: 20 });

      expect(result).toEqual(mockList);
      expect(webhooksService.listWebhooks).toHaveBeenCalled();
    });
  });

  describe('getWebhook', () => {
    it('should return a webhook by ID', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      webhooksService.getWebhook.mockResolvedValue(mockWebhookResponse);

      const result = await controller.getWebhook(id);

      expect(result).toEqual(mockWebhookResponse);
      expect(webhooksService.getWebhook).toHaveBeenCalledWith(
        id,
        expect.any(String),
      );
    });
  });

  describe('updateWebhook', () => {
    it('should update a webhook', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const dto: UpdateWebhookDto = {
        description: 'Updated description',
      };

      const updatedWebhook = {
        ...mockWebhookResponse,
        description: dto.description,
      };

      webhooksService.updateWebhook.mockResolvedValue(updatedWebhook);

      const result = await controller.updateWebhook(id, dto);

      expect(result).toEqual(updatedWebhook);
      expect(webhooksService.updateWebhook).toHaveBeenCalledWith(
        id,
        expect.any(String),
        dto,
      );
    });
  });

  describe('deleteWebhook', () => {
    it('should delete a webhook', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';

      webhooksService.deleteWebhook.mockResolvedValue(undefined);

      await controller.deleteWebhook(id);

      expect(webhooksService.deleteWebhook).toHaveBeenCalledWith(
        id,
        expect.any(String),
      );
    });
  });

  describe('testWebhook', () => {
    it('should send test webhook', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const dto: TestWebhookDto = {
        eventType: 'webhook.test',
      };

      const testResult = {
        deliveryId: 'delivery-123',
        eventId: 'evt_test_123',
        success: true,
        message: 'Test webhook delivered successfully',
      };

      webhooksService.testWebhook.mockResolvedValue(testResult);

      const result = await controller.testWebhook(id, dto);

      expect(result).toEqual(testResult);
      expect(webhooksService.testWebhook).toHaveBeenCalledWith(
        id,
        expect.any(String),
        dto,
      );
    });
  });

  describe('getDeliveries', () => {
    it('should return delivery history', async () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const mockDeliveries = {
        deliveries: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      webhooksService.getDeliveries.mockResolvedValue(mockDeliveries);

      const result = await controller.getDeliveries(id, { page: 1, limit: 20 });

      expect(result).toEqual(mockDeliveries);
      expect(webhooksService.getDeliveries).toHaveBeenCalledWith(
        id,
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('retryDelivery', () => {
    it('should retry a failed delivery', async () => {
      const webhookId = '550e8400-e29b-41d4-a716-446655440000';
      const deliveryId = '550e8400-e29b-41d4-a716-446655440001';

      webhooksService.retryDelivery.mockResolvedValue({});

      await controller.retryDelivery(webhookId, deliveryId);

      expect(webhooksService.retryDelivery).toHaveBeenCalledWith(
        webhookId,
        deliveryId,
        expect.any(String),
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const healthStatus = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'up' as const, responseTime: 10 },
        },
      };

      healthService.checkHealth.mockResolvedValue(healthStatus);

      const result = await controller.healthCheck();

      expect(result).toEqual(healthStatus);
      expect(healthService.checkHealth).toHaveBeenCalled();
    });
  });
});
