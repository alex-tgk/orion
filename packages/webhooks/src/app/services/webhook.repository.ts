import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  PrismaClient,
  Webhook,
  WebhookDelivery,
  WebhookLog,
  WebhookStatus,
  DeliveryStatus,
  WebhookAction,
} from '@prisma/client/webhooks';

/**
 * Repository for webhook database operations
 * Provides abstraction layer over Prisma client
 */
@Injectable()
export class WebhookRepository extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(WebhookRepository.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to Webhooks database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from Webhooks database');
  }

  /**
   * Create a new webhook
   */
  async createWebhook(data: {
    userId: string;
    url: string;
    secret: string;
    events: string[];
    description?: string;
    headers?: any;
    timeout?: number;
    retryAttempts?: number;
    rateLimit?: number;
    tags?: string[];
    metadata?: any;
  }): Promise<Webhook> {
    return this.webhook.create({
      data: {
        userId: data.userId,
        url: data.url,
        secret: data.secret,
        events: data.events,
        description: data.description,
        headers: data.headers || {},
        timeout: data.timeout || 10000,
        retryAttempts: data.retryAttempts || 3,
        rateLimit: data.rateLimit,
        tags: data.tags || [],
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Find webhook by ID
   */
  async findWebhookById(id: string, userId?: string): Promise<Webhook | null> {
    return this.webhook.findFirst({
      where: {
        id,
        ...(userId && { userId }),
      },
    });
  }

  /**
   * Find all webhooks for a user
   */
  async findWebhooksByUserId(
    userId: string,
    options?: {
      status?: WebhookStatus;
      eventType?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ webhooks: Webhook[]; total: number }> {
    const where: any = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.eventType) {
      where.events = {
        has: options.eventType,
      };
    }

    const [webhooks, total] = await Promise.all([
      this.webhook.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.webhook.count({ where }),
    ]);

    return { webhooks, total };
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    id: string,
    userId: string,
    data: Partial<Webhook>,
  ): Promise<Webhook> {
    return this.webhook.update({
      where: { id, userId },
      data,
    });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: string, userId: string): Promise<Webhook> {
    return this.webhook.delete({
      where: { id, userId },
    });
  }

  /**
   * Find active webhooks subscribed to an event type
   */
  async findActiveWebhooksByEvent(eventType: string): Promise<Webhook[]> {
    return this.webhook.findMany({
      where: {
        status: WebhookStatus.ACTIVE,
        isActive: true,
        events: {
          has: eventType,
        },
      },
    });
  }

  /**
   * Increment webhook failure count
   */
  async incrementFailureCount(
    webhookId: string,
    reason: string,
  ): Promise<Webhook> {
    return this.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
        consecutiveFailures: { increment: 1 },
        lastFailureAt: new Date(),
        lastFailureReason: reason,
      },
    });
  }

  /**
   * Record successful delivery
   */
  async recordSuccess(webhookId: string): Promise<Webhook> {
    return this.webhook.update({
      where: { id: webhookId },
      data: {
        successCount: { increment: 1 },
        consecutiveFailures: 0,
        lastSuccessAt: new Date(),
        status: WebhookStatus.ACTIVE, // Reactivate if it was marked as failed
      },
    });
  }

  /**
   * Count user's webhooks
   */
  async countUserWebhooks(userId: string): Promise<number> {
    return this.webhook.count({
      where: { userId },
    });
  }

  /**
   * Create webhook delivery record
   */
  async createDelivery(data: {
    webhookId: string;
    eventId: string;
    eventType: string;
    eventTimestamp: Date;
    payload: any;
    signature: string;
    maxAttempts?: number;
  }): Promise<WebhookDelivery> {
    return this.webhookDelivery.create({
      data: {
        webhookId: data.webhookId,
        eventId: data.eventId,
        eventType: data.eventType,
        eventTimestamp: data.eventTimestamp,
        payload: data.payload,
        signature: data.signature,
        maxAttempts: data.maxAttempts || 3,
        status: DeliveryStatus.PENDING,
      },
    });
  }

  /**
   * Update delivery status
   */
  async updateDelivery(
    id: string,
    data: {
      status?: DeliveryStatus;
      attempts?: number;
      responseStatus?: number;
      responseBody?: string;
      responseHeaders?: any;
      responseTime?: number;
      errorMessage?: string;
      errorDetails?: any;
      nextRetryAt?: Date;
      lastAttemptAt?: Date;
      deliveredAt?: Date;
    },
  ): Promise<WebhookDelivery> {
    return this.webhookDelivery.update({
      where: { id },
      data,
    });
  }

  /**
   * Find delivery by ID
   */
  async findDeliveryById(id: string): Promise<WebhookDelivery | null> {
    return this.webhookDelivery.findUnique({
      where: { id },
    });
  }

  /**
   * Find deliveries for a webhook
   */
  async findDeliveriesByWebhookId(
    webhookId: string,
    options?: {
      status?: DeliveryStatus;
      eventType?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const where: any = { webhookId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.eventType) {
      where.eventType = options.eventType;
    }

    const [deliveries, total] = await Promise.all([
      this.webhookDelivery.findMany({
        where,
        skip: options?.skip || 0,
        take: options?.take || 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.webhookDelivery.count({ where }),
    ]);

    return { deliveries, total };
  }

  /**
   * Find pending deliveries for retry
   */
  async findPendingDeliveries(): Promise<WebhookDelivery[]> {
    return this.webhookDelivery.findMany({
      where: {
        status: DeliveryStatus.PENDING,
        attempts: {
          lt: this.webhookDelivery.fields.maxAttempts,
        },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create webhook log entry
   */
  async createLog(data: {
    webhookId: string;
    action: WebhookAction;
    title: string;
    description?: string;
    userId?: string;
    deliveryId?: string;
    changes?: any;
    metadata?: any;
  }): Promise<WebhookLog> {
    return this.webhookLog.create({
      data: {
        webhookId: data.webhookId,
        action: data.action,
        title: data.title,
        description: data.description,
        userId: data.userId,
        deliveryId: data.deliveryId,
        changes: data.changes || undefined,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Check if event has already been processed (idempotency)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const count = await this.webhookDelivery.count({
      where: { eventId },
    });
    return count > 0;
  }
}
