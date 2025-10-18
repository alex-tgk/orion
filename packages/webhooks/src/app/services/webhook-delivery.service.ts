import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Webhook,
  WebhookDelivery,
  DeliveryStatus,
  WebhookAction,
} from '@prisma/client/webhooks';
import axios, { AxiosError } from 'axios';
import { SignatureService } from './signature.service';
import { WebhookRepository } from './webhook.repository';

/**
 * Service for delivering webhooks with retry logic
 */
@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);
  private readonly maxRetryAttempts: number;
  private readonly retryDelayMs: number;
  private readonly retryMultiplier: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly signatureService: SignatureService,
    private readonly repository: WebhookRepository,
    private readonly configService: ConfigService,
  ) {
    this.maxRetryAttempts = this.configService.get<number>(
      'webhook.maxRetryAttempts',
      3,
    );
    this.retryDelayMs = this.configService.get<number>(
      'webhook.retryDelayMs',
      1000,
    );
    this.retryMultiplier = this.configService.get<number>(
      'webhook.retryMultiplier',
      2,
    );
    this.timeoutMs = this.configService.get<number>('webhook.timeoutMs', 10000);
  }

  /**
   * Queue a webhook delivery for an event
   *
   * @param webhook - The webhook configuration
   * @param eventId - Unique event identifier
   * @param eventType - Type of event
   * @param eventData - Event payload data
   * @returns Created delivery record
   */
  async queueDelivery(
    webhook: Webhook,
    eventId: string,
    eventType: string,
    eventData: any,
  ): Promise<WebhookDelivery> {
    // Create webhook payload
    const payload = this.signatureService.createWebhookPayload(
      eventId,
      eventType,
      eventData,
    );

    // Generate signature
    const signature = this.signatureService.generateSignature(
      payload,
      webhook.secret,
    );

    // Create delivery record
    const delivery = await this.repository.createDelivery({
      webhookId: webhook.id,
      eventId,
      eventType,
      eventTimestamp: new Date(),
      payload,
      signature,
      maxAttempts: webhook.retryAttempts,
    });

    this.logger.debug(
      `Queued delivery ${delivery.id} for webhook ${webhook.id}`,
    );

    // Attempt immediate delivery (async, don't wait)
    this.attemptDelivery(delivery, webhook).catch((error) => {
      this.logger.error(
        `Failed to deliver webhook ${webhook.id}:`,
        error.message,
      );
    });

    return delivery;
  }

  /**
   * Attempt to deliver a webhook
   *
   * @param delivery - The delivery record
   * @param webhook - The webhook configuration
   */
  async attemptDelivery(
    delivery: WebhookDelivery,
    webhook: Webhook,
  ): Promise<void> {
    const startTime = Date.now();
    const attempt = delivery.attempts + 1;

    this.logger.debug(
      `Attempting delivery ${delivery.id} (attempt ${attempt}/${delivery.maxAttempts})`,
    );

    try {
      // Update delivery status to DELIVERING
      await this.repository.updateDelivery(delivery.id, {
        status: DeliveryStatus.DELIVERING,
        attempts: attempt,
        lastAttemptAt: new Date(),
      });

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ORION-Webhooks/1.0',
        'X-Webhook-Signature': delivery.signature,
        'X-Webhook-ID': webhook.id,
        'X-Event-ID': delivery.eventId,
        'X-Event-Type': delivery.eventType,
        'X-Delivery-ID': delivery.id,
        'X-Delivery-Attempt': attempt.toString(),
        ...(webhook.headers as Record<string, string>),
      };

      // Make HTTP request
      const response = await axios.post(webhook.url, delivery.payload, {
        headers,
        timeout: webhook.timeout || this.timeoutMs,
        validateStatus: () => true, // Don't throw on any status
        maxRedirects: 5,
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) {
        // Successful delivery
        await this.handleSuccessfulDelivery(
          delivery,
          webhook,
          response.status,
          response.data,
          response.headers,
          responseTime,
        );
      } else {
        // Failed delivery (4xx, 5xx)
        await this.handleFailedDelivery(
          delivery,
          webhook,
          response.status,
          response.data,
          response.headers,
          responseTime,
          `HTTP ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      // Network error, timeout, or other exception
      const responseTime = Date.now() - startTime;
      const errorMessage = this.extractErrorMessage(error);

      await this.handleFailedDelivery(
        delivery,
        webhook,
        undefined,
        undefined,
        undefined,
        responseTime,
        errorMessage,
        error,
      );
    }
  }

  /**
   * Handle successful webhook delivery
   */
  private async handleSuccessfulDelivery(
    delivery: WebhookDelivery,
    webhook: Webhook,
    status: number,
    responseBody: any,
    responseHeaders: any,
    responseTime: number,
  ): Promise<void> {
    this.logger.log(
      `Successfully delivered webhook ${webhook.id} (delivery ${delivery.id})`,
    );

    // Update delivery record
    await this.repository.updateDelivery(delivery.id, {
      status: DeliveryStatus.DELIVERED,
      responseStatus: status,
      responseBody: this.truncateResponse(responseBody),
      responseHeaders: this.sanitizeHeaders(responseHeaders),
      responseTime,
      deliveredAt: new Date(),
    });

    // Update webhook success metrics
    await this.repository.recordSuccess(webhook.id);
  }

  /**
   * Handle failed webhook delivery
   */
  private async handleFailedDelivery(
    delivery: WebhookDelivery,
    webhook: Webhook,
    status: number | undefined,
    responseBody: any,
    responseHeaders: any,
    responseTime: number,
    errorMessage: string,
    errorDetails?: any,
  ): Promise<void> {
    const shouldRetry = delivery.attempts < delivery.maxAttempts;

    this.logger.warn(
      `Failed delivery ${delivery.id} for webhook ${webhook.id}: ${errorMessage} (attempt ${delivery.attempts}/${delivery.maxAttempts})`,
    );

    // Calculate next retry time (exponential backoff)
    const nextRetryAt = shouldRetry
      ? new Date(
          Date.now() +
            this.retryDelayMs *
              Math.pow(this.retryMultiplier, delivery.attempts),
        )
      : undefined;

    // Update delivery record
    await this.repository.updateDelivery(delivery.id, {
      status: shouldRetry ? DeliveryStatus.PENDING : DeliveryStatus.FAILED,
      responseStatus: status,
      responseBody: this.truncateResponse(responseBody),
      responseHeaders: responseHeaders
        ? this.sanitizeHeaders(responseHeaders)
        : undefined,
      responseTime,
      errorMessage,
      errorDetails: errorDetails
        ? { name: errorDetails.name, message: errorDetails.message }
        : undefined,
      nextRetryAt,
    });

    // Update webhook failure metrics
    await this.repository.incrementFailureCount(webhook.id, errorMessage);

    // Log failure
    await this.repository.createLog({
      webhookId: webhook.id,
      action: WebhookAction.FAILED_THRESHOLD,
      title: 'Delivery failed',
      description: errorMessage,
      deliveryId: delivery.id,
      metadata: {
        attempt: delivery.attempts,
        maxAttempts: delivery.maxAttempts,
        willRetry: shouldRetry,
        nextRetryAt: nextRetryAt?.toISOString(),
      },
    });

    // Schedule retry if needed
    if (shouldRetry && nextRetryAt) {
      this.scheduleRetry(delivery.id, nextRetryAt);
    }
  }

  /**
   * Retry a failed delivery
   *
   * @param deliveryId - Delivery ID to retry
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.repository.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    const webhook = await this.repository.findWebhookById(delivery.webhookId);
    if (!webhook) {
      throw new Error(`Webhook ${delivery.webhookId} not found`);
    }

    // Reset delivery status for retry
    await this.repository.updateDelivery(deliveryId, {
      status: DeliveryStatus.PENDING,
      nextRetryAt: new Date(),
    });

    // Attempt delivery
    await this.attemptDelivery(delivery, webhook);

    return this.repository.findDeliveryById(
      deliveryId,
    ) as Promise<WebhookDelivery>;
  }

  /**
   * Process pending deliveries (called by scheduler)
   */
  async processPendingDeliveries(): Promise<void> {
    const pendingDeliveries = await this.repository.findPendingDeliveries();

    this.logger.debug(
      `Processing ${pendingDeliveries.length} pending deliveries`,
    );

    for (const delivery of pendingDeliveries) {
      const webhook = await this.repository.findWebhookById(delivery.webhookId);
      if (webhook && webhook.isActive) {
        await this.attemptDelivery(delivery, webhook);
      }
    }
  }

  /**
   * Schedule a delivery retry
   */
  private scheduleRetry(deliveryId: string, retryAt: Date): void {
    const delay = retryAt.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        try {
          const delivery = await this.repository.findDeliveryById(deliveryId);
          if (delivery && delivery.status === DeliveryStatus.PENDING) {
            const webhook = await this.repository.findWebhookById(
              delivery.webhookId,
            );
            if (webhook && webhook.isActive) {
              await this.attemptDelivery(delivery, webhook);
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to retry delivery ${deliveryId}:`,
            error.message,
          );
        }
      }, delay);
    }
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        return 'Connection refused';
      } else if (axiosError.code === 'ETIMEDOUT') {
        return 'Connection timeout';
      } else if (axiosError.code === 'ENOTFOUND') {
        return 'Host not found';
      } else if (axiosError.code === 'ECONNABORTED') {
        return 'Request timeout';
      }
      return axiosError.message;
    } else if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }

  /**
   * Truncate response body for storage
   */
  private truncateResponse(body: any): string {
    const maxLength = 5000;
    let bodyString: string;

    if (typeof body === 'string') {
      bodyString = body;
    } else {
      try {
        bodyString = JSON.stringify(body);
      } catch {
        bodyString = String(body);
      }
    }

    if (bodyString.length > maxLength) {
      return bodyString.substring(0, maxLength) + '... (truncated)';
    }

    return bodyString;
  }

  /**
   * Sanitize response headers (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
    ];

    const sanitized: any = {};
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
