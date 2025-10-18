import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhookDeliveryService } from '../webhook-delivery.service';
import { SignatureService } from '../signature.service';
import { WebhookRepository } from '../webhook.repository';
import { Webhook, WebhookDelivery, DeliveryStatus, WebhookStatus } from '@prisma/client/webhooks';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookDeliveryService', () => {
  let service: WebhookDeliveryService;
  let signatureService: jest.Mocked<SignatureService>;
  let repository: jest.Mocked<WebhookRepository>;
  let configService: jest.Mocked<ConfigService>;

  const mockWebhook: Partial<Webhook> = {
    id: 'webhook-123',
    userId: 'user-123',
    url: 'https://example.com/webhook',
    secret: 'test-secret',
    events: ['user.created'],
    status: WebhookStatus.ACTIVE,
    isActive: true,
    timeout: 10000,
    retryAttempts: 3,
    headers: {},
  };

  const mockDelivery: Partial<WebhookDelivery> = {
    id: 'delivery-123',
    webhookId: 'webhook-123',
    eventId: 'evt-123',
    eventType: 'user.created',
    payload: {},
    signature: 'sha256=test',
    status: DeliveryStatus.PENDING,
    attempts: 0,
    maxAttempts: 3,
  };

  beforeEach(async () => {
    const mockSignatureService = {
      createWebhookPayload: jest.fn(),
      generateSignature: jest.fn(),
    };

    const mockRepository = {
      createDelivery: jest.fn(),
      updateDelivery: jest.fn(),
      findDeliveryById: jest.fn(),
      recordSuccess: jest.fn(),
      incrementFailureCount: jest.fn(),
      createLog: jest.fn(),
      findWebhookById: jest.fn(),
      findPendingDeliveries: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: any = {
          'webhook.maxRetryAttempts': 3,
          'webhook.retryDelayMs': 1000,
          'webhook.retryMultiplier': 2,
          'webhook.timeoutMs': 10000,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveryService,
        { provide: SignatureService, useValue: mockSignatureService },
        { provide: WebhookRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhookDeliveryService>(WebhookDeliveryService);
    signatureService = module.get(SignatureService);
    repository = module.get(WebhookRepository);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueDelivery', () => {
    it('should queue a webhook delivery', async () => {
      const eventData = { userId: '123', email: 'test@example.com' };
      const payload = { id: 'evt-123', event: 'user.created', data: eventData };

      signatureService.createWebhookPayload.mockReturnValue(payload);
      signatureService.generateSignature.mockReturnValue('sha256=test');
      repository.createDelivery.mockResolvedValue(mockDelivery as WebhookDelivery);

      const result = await service.queueDelivery(
        mockWebhook as Webhook,
        'evt-123',
        'user.created',
        eventData,
      );

      expect(result).toEqual(mockDelivery);
      expect(signatureService.createWebhookPayload).toHaveBeenCalledWith(
        'evt-123',
        'user.created',
        eventData,
      );
      expect(signatureService.generateSignature).toHaveBeenCalledWith(
        payload,
        mockWebhook.secret,
      );
      expect(repository.createDelivery).toHaveBeenCalled();
    });
  });

  describe('attemptDelivery', () => {
    it('should successfully deliver webhook', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        data: { success: true },
        headers: { 'content-type': 'application/json' },
      });

      repository.updateDelivery.mockResolvedValue({} as any);
      repository.recordSuccess.mockResolvedValue({} as any);

      await service.attemptDelivery(
        mockDelivery as WebhookDelivery,
        mockWebhook as Webhook,
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockWebhook.url,
        mockDelivery.payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': mockDelivery.signature,
          }),
        }),
      );

      expect(repository.updateDelivery).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({
          status: DeliveryStatus.DELIVERED,
          responseStatus: 200,
        }),
      );

      expect(repository.recordSuccess).toHaveBeenCalledWith(mockWebhook.id);
    });

    it('should handle failed delivery with retry', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Connection refused'));

      repository.updateDelivery.mockResolvedValue({} as any);
      repository.incrementFailureCount.mockResolvedValue({} as any);
      repository.createLog.mockResolvedValue({} as any);

      await service.attemptDelivery(
        mockDelivery as WebhookDelivery,
        mockWebhook as Webhook,
      );

      expect(repository.updateDelivery).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({
          status: DeliveryStatus.PENDING,
          errorMessage: 'Connection refused',
        }),
      );

      expect(repository.incrementFailureCount).toHaveBeenCalled();
    });

    it('should mark as failed after max attempts', async () => {
      const exhaustedDelivery = {
        ...mockDelivery,
        attempts: 2,
        maxAttempts: 3,
      };

      mockedAxios.post.mockRejectedValue(new Error('Connection timeout'));

      repository.updateDelivery.mockResolvedValue({} as any);
      repository.incrementFailureCount.mockResolvedValue({} as any);
      repository.createLog.mockResolvedValue({} as any);

      await service.attemptDelivery(
        exhaustedDelivery as WebhookDelivery,
        mockWebhook as Webhook,
      );

      expect(repository.updateDelivery).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({
          status: DeliveryStatus.FAILED,
        }),
      );
    });

    it('should handle 4xx error responses', async () => {
      mockedAxios.post.mockResolvedValue({
        status: 400,
        statusText: 'Bad Request',
        data: { error: 'Invalid payload' },
        headers: {},
      });

      repository.updateDelivery.mockResolvedValue({} as any);
      repository.incrementFailureCount.mockResolvedValue({} as any);
      repository.createLog.mockResolvedValue({} as any);

      await service.attemptDelivery(
        mockDelivery as WebhookDelivery,
        mockWebhook as Webhook,
      );

      expect(repository.updateDelivery).toHaveBeenCalledWith(
        mockDelivery.id,
        expect.objectContaining({
          responseStatus: 400,
          errorMessage: 'HTTP 400: Bad Request',
        }),
      );
    });
  });

  describe('retryDelivery', () => {
    it('should retry a delivery', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as WebhookDelivery);
      repository.findWebhookById.mockResolvedValue(mockWebhook as Webhook);
      repository.updateDelivery.mockResolvedValue({} as any);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
      });

      const result = await service.retryDelivery('delivery-123');

      expect(repository.findDeliveryById).toHaveBeenCalledWith('delivery-123');
      expect(repository.findWebhookById).toHaveBeenCalledWith(mockWebhook.id);
      expect(repository.updateDelivery).toHaveBeenCalledWith(
        'delivery-123',
        expect.objectContaining({
          status: DeliveryStatus.PENDING,
        }),
      );
    });

    it('should throw error if delivery not found', async () => {
      repository.findDeliveryById.mockResolvedValue(null);

      await expect(service.retryDelivery('invalid-id')).rejects.toThrow(
        'Delivery invalid-id not found',
      );
    });

    it('should throw error if webhook not found', async () => {
      repository.findDeliveryById.mockResolvedValue(mockDelivery as WebhookDelivery);
      repository.findWebhookById.mockResolvedValue(null);

      await expect(service.retryDelivery('delivery-123')).rejects.toThrow(
        'Webhook webhook-123 not found',
      );
    });
  });

  describe('processPendingDeliveries', () => {
    it('should process pending deliveries', async () => {
      const pendingDeliveries = [mockDelivery as WebhookDelivery];

      repository.findPendingDeliveries.mockResolvedValue(pendingDeliveries);
      repository.findWebhookById.mockResolvedValue(mockWebhook as Webhook);
      repository.updateDelivery.mockResolvedValue({} as any);

      mockedAxios.post.mockResolvedValue({
        status: 200,
        data: {},
        headers: {},
      });

      await service.processPendingDeliveries();

      expect(repository.findPendingDeliveries).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should skip inactive webhooks', async () => {
      const inactiveWebhook = { ...mockWebhook, isActive: false };
      repository.findPendingDeliveries.mockResolvedValue([mockDelivery as WebhookDelivery]);
      repository.findWebhookById.mockResolvedValue(inactiveWebhook as Webhook);

      await service.processPendingDeliveries();

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});
