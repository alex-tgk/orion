import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook, WebhookStatus, WebhookAction } from '@prisma/client/webhooks';
import { SignatureService } from './signature.service';
import { WebhookRepository } from './webhook.repository';
import { WebhookDeliveryService } from './webhook-delivery.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookResponseDto,
  TestWebhookDto,
  TestWebhookResponseDto,
} from '../dto';

/**
 * Main service for webhook management
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly maxWebhooksPerUser: number;

  constructor(
    private readonly signatureService: SignatureService,
    private readonly repository: WebhookRepository,
    private readonly deliveryService: WebhookDeliveryService,
    private readonly configService: ConfigService,
  ) {
    this.maxWebhooksPerUser = this.configService.get<number>(
      'webhook.maxWebhooksPerUser',
      50,
    );
  }

  /**
   * Create a new webhook
   */
  async createWebhook(
    userId: string,
    dto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    // Check webhook limit
    const count = await this.repository.countUserWebhooks(userId);
    if (count >= this.maxWebhooksPerUser) {
      throw new BadRequestException(
        `Maximum ${this.maxWebhooksPerUser} webhooks allowed per user`,
      );
    }

    // Generate secret for webhook signing
    const secret = this.signatureService.generateSecret();

    // Create webhook
    const webhook = await this.repository.createWebhook({
      userId,
      url: dto.url,
      secret,
      events: dto.events,
      description: dto.description,
      headers: dto.headers,
      timeout: dto.timeout,
      retryAttempts: dto.retryAttempts,
      rateLimit: dto.rateLimit,
      tags: dto.tags,
      metadata: dto.metadata,
    });

    // Log creation
    await this.repository.createLog({
      webhookId: webhook.id,
      action: WebhookAction.CREATED,
      title: 'Webhook created',
      userId,
      metadata: { url: dto.url, events: dto.events },
    });

    this.logger.log(`Created webhook ${webhook.id} for user ${userId}`);

    return this.maskSensitiveData(webhook);
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(
    webhookId: string,
    userId: string,
  ): Promise<WebhookResponseDto> {
    const webhook = await this.repository.findWebhookById(webhookId, userId);

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    return this.maskSensitiveData(webhook);
  }

  /**
   * List user's webhooks
   */
  async listWebhooks(
    userId: string,
    options?: {
      status?: WebhookStatus;
      eventType?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    webhooks: WebhookResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const { webhooks, total } = await this.repository.findWebhooksByUserId(
      userId,
      {
        status: options?.status,
        eventType: options?.eventType,
        skip,
        take: limit,
      },
    );

    return {
      webhooks: webhooks.map((w) => this.maskSensitiveData(w)),
      total,
      page,
      limit,
    };
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    userId: string,
    dto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    const existing = await this.repository.findWebhookById(webhookId, userId);

    if (!existing) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    // Track changes for audit log
    const changes: any = {};
    if (dto.url && dto.url !== existing.url)
      changes.url = { old: existing.url, new: dto.url };
    if (dto.status && dto.status !== existing.status)
      changes.status = { old: existing.status, new: dto.status };

    // Update webhook
    const webhook = await this.repository.updateWebhook(webhookId, userId, {
      ...(dto.url && { url: dto.url }),
      ...(dto.events && { events: dto.events }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.status && { status: dto.status }),
      ...(dto.headers && { headers: dto.headers }),
      ...(dto.timeout && { timeout: dto.timeout }),
      ...(dto.retryAttempts !== undefined && {
        retryAttempts: dto.retryAttempts,
      }),
      ...(dto.rateLimit !== undefined && { rateLimit: dto.rateLimit }),
      ...(dto.tags && { tags: dto.tags }),
      ...(dto.metadata && { metadata: dto.metadata }),
    });

    // Log update
    if (Object.keys(changes).length > 0) {
      await this.repository.createLog({
        webhookId: webhook.id,
        action: WebhookAction.UPDATED,
        title: 'Webhook updated',
        userId,
        changes,
      });
    }

    this.logger.log(`Updated webhook ${webhookId}`);

    return this.maskSensitiveData(webhook);
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, userId: string): Promise<void> {
    const webhook = await this.repository.findWebhookById(webhookId, userId);

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    await this.repository.deleteWebhook(webhookId, userId);

    this.logger.log(`Deleted webhook ${webhookId}`);
  }

  /**
   * Test webhook with sample payload
   */
  async testWebhook(
    webhookId: string,
    userId: string,
    dto: TestWebhookDto,
  ): Promise<TestWebhookResponseDto> {
    const webhook = await this.repository.findWebhookById(webhookId, userId);

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    // Create test event
    const eventId = `evt_test_${Date.now()}`;
    const eventType = dto.eventType || 'webhook.test';
    const payload = dto.payload || {
      test: true,
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString(),
    };

    try {
      // Queue and deliver test webhook
      const delivery = await this.deliveryService.queueDelivery(
        webhook,
        eventId,
        eventType,
        payload,
      );

      // Wait a bit for delivery to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get updated delivery status
      const updatedDelivery = await this.repository.findDeliveryById(
        delivery.id,
      );

      // Log test
      await this.repository.createLog({
        webhookId: webhook.id,
        action: WebhookAction.TESTED,
        title: 'Webhook tested',
        userId,
        deliveryId: delivery.id,
      });

      return {
        deliveryId: delivery.id,
        eventId,
        success: updatedDelivery?.status === 'DELIVERED',
        message:
          updatedDelivery?.status === 'DELIVERED'
            ? 'Test webhook delivered successfully'
            : 'Test webhook delivery failed',
        responseStatus: updatedDelivery?.responseStatus || undefined,
        responseTime: updatedDelivery?.responseTime || undefined,
        error: updatedDelivery?.errorMessage || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to test webhook ${webhookId}:`, error);
      return {
        deliveryId: '',
        eventId,
        success: false,
        message: 'Failed to send test webhook',
        error: error.message,
      };
    }
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(
    webhookId: string,
    userId: string,
    options?: {
      status?: any;
      eventType?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const webhook = await this.repository.findWebhookById(webhookId, userId);

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const { deliveries, total } =
      await this.repository.findDeliveriesByWebhookId(webhookId, {
        status: options?.status,
        eventType: options?.eventType,
        skip,
        take: limit,
      });

    return {
      deliveries,
      total,
      page,
      limit,
    };
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(
    webhookId: string,
    deliveryId: string,
    userId: string,
  ): Promise<any> {
    const webhook = await this.repository.findWebhookById(webhookId, userId);

    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const delivery = await this.repository.findDeliveryById(deliveryId);

    if (!delivery || delivery.webhookId !== webhookId) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    this.logger.log(`Retrying delivery ${deliveryId} for webhook ${webhookId}`);

    return this.deliveryService.retryDelivery(deliveryId);
  }

  /**
   * Mask sensitive data in webhook response
   */
  private maskSensitiveData(webhook: Webhook): WebhookResponseDto {
    // Mask secret in response
    const headers = webhook.headers as Record<string, string>;
    const maskedHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers || {})) {
      if (
        key.toLowerCase().includes('auth') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('key')
      ) {
        maskedHeaders[key] = '***';
      } else {
        maskedHeaders[key] = value;
      }
    }

    return {
      id: webhook.id,
      userId: webhook.userId,
      url: webhook.url,
      events: webhook.events,
      description: webhook.description || undefined,
      status: webhook.status,
      isActive: webhook.isActive,
      failureCount: webhook.failureCount,
      consecutiveFailures: webhook.consecutiveFailures,
      lastFailureAt: webhook.lastFailureAt || undefined,
      lastFailureReason: webhook.lastFailureReason || undefined,
      successCount: webhook.successCount,
      lastSuccessAt: webhook.lastSuccessAt || undefined,
      rateLimit: webhook.rateLimit || undefined,
      timeout: webhook.timeout,
      retryAttempts: webhook.retryAttempts,
      headers: maskedHeaders,
      tags: webhook.tags,
      metadata: webhook.metadata as Record<string, any>,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }
}
