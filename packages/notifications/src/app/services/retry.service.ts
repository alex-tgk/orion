import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@orion/shared';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationStatus } from '@prisma/notifications';

/**
 * Retry Configuration
 */
interface RetryConfig {
  maxAttempts: number;
  delays: number[]; // Delays in milliseconds for each attempt
  retryableStatuses: NotificationStatus[];
}

/**
 * Retry Service
 *
 * Implements exponential backoff retry logic for failed notifications.
 *
 * Features:
 * - Configurable retry attempts and delays
 * - Exponential backoff
 * - Dead Letter Queue (DLQ) for max retries exceeded
 * - Scheduled retry processor
 * - Retryable error detection
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly config: RetryConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.config = {
      maxAttempts: this.configService.get<number>(
        'notification.retry.maxAttempts',
        3
      ),
      delays: [
        1000, // 1 second
        5000, // 5 seconds
        30000, // 30 seconds
      ],
      retryableStatuses: [NotificationStatus.failed],
    };
  }

  /**
   * Calculate delay for next retry attempt
   */
  calculateDelay(attempt: number): number {
    if (attempt < this.config.delays.length) {
      return this.config.delays[attempt];
    }

    // Exponential backoff for attempts beyond configured delays
    const baseDelay =
      this.config.delays[this.config.delays.length - 1] || 30000;
    const exponent = attempt - this.config.delays.length + 1;
    return Math.min(baseDelay * Math.pow(2, exponent), 300000); // Max 5 minutes
  }

  /**
   * Check if notification should be retried
   */
  shouldRetry(
    status: NotificationStatus,
    attempts: number,
    error?: string
  ): boolean {
    // Don't retry if max attempts exceeded
    if (attempts >= this.config.maxAttempts) {
      return false;
    }

    // Don't retry if status is not retryable
    if (!this.config.retryableStatuses.includes(status)) {
      return false;
    }

    // Don't retry non-retryable errors
    if (error && this.isNonRetryableError(error)) {
      return false;
    }

    return true;
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      'invalid email',
      'invalid phone number',
      'email does not exist',
      'phone number does not exist',
      'blacklisted',
      'unsubscribed',
      'invalid recipient',
      'authentication failed',
      '401',
      '403',
      '404',
    ];

    const lowerError = error.toLowerCase();
    return nonRetryablePatterns.some((pattern) =>
      lowerError.includes(pattern)
    );
  }

  /**
   * Mark notification for retry
   */
  async markForRetry(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Notification not found: ${notificationId}`);
      return;
    }

    if (!this.shouldRetry(notification.status, notification.attempts, notification.error || undefined)) {
      this.logger.warn(
        `Notification ${notificationId} should not be retried (attempts: ${notification.attempts}, status: ${notification.status})`
      );
      return;
    }

    // Calculate next retry time
    const delay = this.calculateDelay(notification.attempts);
    const nextRetry = new Date(Date.now() + delay);

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.queued,
        lastAttempt: new Date(),
        metadata: {
          ...(notification.metadata as any),
          nextRetry: nextRetry.toISOString(),
        },
      },
    });

    this.logger.log(
      `Notification ${notificationId} queued for retry at ${nextRetry.toISOString()} (attempt ${notification.attempts + 1}/${this.config.maxAttempts})`
    );
  }

  /**
   * Move notification to Dead Letter Queue
   */
  async moveToDLQ(notificationId: string, reason: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.failed,
        failedAt: new Date(),
        error: reason,
        metadata: {
          dlq: true,
          dlqReason: reason,
          dlqTimestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.error(
      `Notification ${notificationId} moved to DLQ: ${reason}`
    );
  }

  /**
   * Process retry queue (scheduled job)
   * Runs every minute to check for notifications ready to retry
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processRetryQueue(): Promise<void> {
    try {
      // Find notifications that are queued and ready for retry
      const notifications = await this.prisma.notification.findMany({
        where: {
          status: NotificationStatus.queued,
          attempts: {
            gte: 1, // Has been attempted at least once
            lt: this.config.maxAttempts,
          },
        },
        take: 100, // Process in batches
      });

      if (notifications.length === 0) {
        return;
      }

      this.logger.log(
        `Processing ${notifications.length} notifications in retry queue`
      );

      const now = Date.now();
      let readyCount = 0;

      for (const notification of notifications) {
        // Check if it's time to retry
        const metadata = notification.metadata as any;
        const nextRetry = metadata?.nextRetry
          ? new Date(metadata.nextRetry).getTime()
          : 0;

        if (nextRetry && now < nextRetry) {
          // Not ready yet
          continue;
        }

        readyCount++;

        // Check if should still retry
        if (
          !this.shouldRetry(
            notification.status,
            notification.attempts,
            notification.error || undefined
          )
        ) {
          await this.moveToDLQ(
            notification.id,
            `Max retry attempts exceeded (${notification.attempts}/${this.config.maxAttempts})`
          );
          continue;
        }

        // Ready for retry - emit event or call notification service
        // This would typically publish to message queue or call the notification service
        this.logger.log(
          `Notification ${notification.id} ready for retry (attempt ${notification.attempts + 1})`
        );
      }

      if (readyCount > 0) {
        this.logger.log(
          `Found ${readyCount} notifications ready for retry`
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing retry queue: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Get retry statistics
   */
  async getRetryStats(): Promise<{
    pending: number;
    retrying: number;
    dlq: number;
  }> {
    const [pending, retrying, dlq] = await Promise.all([
      this.prisma.notification.count({
        where: {
          status: NotificationStatus.queued,
          attempts: { gte: 1 },
        },
      }),
      this.prisma.notification.count({
        where: {
          status: NotificationStatus.sending,
          attempts: { gte: 1 },
        },
      }),
      this.prisma.notification.count({
        where: {
          metadata: {
            path: ['dlq'],
            equals: true,
          },
        },
      }),
    ]);

    return { pending, retrying, dlq };
  }

  /**
   * Retry a notification from DLQ manually
   */
  async retryFromDLQ(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }

    const metadata = notification.metadata as any;
    if (!metadata?.dlq) {
      throw new Error(
        `Notification ${notificationId} is not in DLQ`
      );
    }

    // Reset notification for retry
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.queued,
        attempts: 0,
        error: null,
        failedAt: null,
        metadata: {
          ...metadata,
          dlq: false,
          manualRetry: true,
          manualRetryTimestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Notification ${notificationId} manually removed from DLQ and queued for retry`
    );
  }
}
