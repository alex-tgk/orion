import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationPrismaService } from './notification-prisma.service';
import { Channel } from 'amqplib';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.module';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { TemplateService } from './template.service';
import { NotificationType, NotificationStatus } from '../entities/notification.entity';

export interface SendNotificationOptions {
  userId: string;
  type: NotificationType;
  template: string;
  recipient: string;
  data: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly maxAttempts: number;
  private readonly retryDelays: number[];

  constructor(
    private readonly prisma: NotificationPrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly templateService: TemplateService,
    private readonly configService: ConfigService,
    @Inject(RABBITMQ_CHANNEL) private readonly channel: Channel,
  ) {
    this.maxAttempts = this.configService.get<number>('notification.rabbitmq.maxAttempts') || 3;
    this.retryDelays = this.configService.get<number[]>('notification.rabbitmq.retryDelay') || [1000, 5000, 30000];
  }

  /**
   * Create and send a notification
   */
  async send(options: SendNotificationOptions): Promise<string> {
    try {
      // Render template
      const { subject, body } = await this.templateService.render(
        options.template,
        options.data,
      );

      // Create notification record
      const notification = await this.prisma.notification.create({
        data: {
          userId: options.userId,
          type: options.type,
          template: options.template,
          subject,
          body,
          recipient: options.recipient,
          status: NotificationStatus.QUEUED,
          metadata: options.data,
        },
      });

      // Send notification asynchronously
      this.processNotification(notification.id).catch((error) => {
        this.logger.error(
          `Failed to process notification ${notification.id}:`,
          error,
        );
      });

      return notification.id;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Process a notification with retry logic
   */
  async processNotification(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.error(`Notification ${notificationId} not found`);
      return;
    }

    try {
      // Update status to sending
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENDING,
          lastAttempt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Send based on type
      switch (notification.type) {
        case NotificationType.EMAIL:
          await this.emailService.send({
            to: notification.recipient,
            subject: notification.subject || 'Notification',
            html: notification.body,
          });
          break;

        case NotificationType.SMS:
          await this.smsService.send({
            to: notification.recipient,
            body: notification.body,
          });
          break;

        case NotificationType.PUSH:
          // TODO: Implement push notification
          this.logger.warn('Push notifications not implemented yet');
          break;
      }

      // Mark as delivered
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.DELIVERED,
          deliveredAt: new Date(),
          sentAt: new Date(),
        },
      });

      this.logger.log(`Notification ${notificationId} delivered successfully`);
    } catch (error) {
      await this.handleFailure(notification, error);
    }
  }

  /**
   * Handle notification failure with retry logic
   */
  private async handleFailure(
    notification: any,
    error: any,
  ): Promise<void> {
    const attempts = notification.attempts + 1;
    const shouldRetry = attempts < this.maxAttempts && this.isRetryableError(error);

    if (shouldRetry) {
      const delay = this.retryDelays[attempts - 1] || this.retryDelays[this.retryDelays.length - 1];

      this.logger.warn(
        `Notification ${notification.id} failed (attempt ${attempts}/${this.maxAttempts}). Retrying in ${delay}ms...`,
      );

      // Update with error but keep as queued for retry
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.QUEUED,
          error: error.message,
          lastAttempt: new Date(),
        },
      });

      // Schedule retry
      setTimeout(() => {
        this.processNotification(notification.id).catch((err) => {
          this.logger.error(`Retry failed for ${notification.id}:`, err);
        });
      }, delay);
    } else {
      // Max attempts reached or non-retryable error
      this.logger.error(
        `Notification ${notification.id} permanently failed after ${attempts} attempts`,
      );

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          error: error.message,
        },
      });

      // Send to dead letter queue
      await this.sendToDLQ(notification, error);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx errors are retryable
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
    ];

    if (retryableErrors.some((code) => error.code === code)) {
      return true;
    }

    // Check HTTP status codes
    if (error.response?.status >= 500) {
      return true;
    }

    // Rate limit errors
    if (error.response?.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Send failed notification to Dead Letter Queue
   */
  private async sendToDLQ(notification: any, error: any): Promise<void> {
    try {
      const exchange = this.configService.get<string>('notification.rabbitmq.exchange') || 'orion.notifications';
      const dlqMessage = {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        template: notification.template,
        recipient: notification.recipient,
        attempts: notification.attempts,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      await this.channel.publish(
        exchange,
        'notification.dlq',
        Buffer.from(JSON.stringify(dlqMessage)),
        { persistent: true },
      );

      this.logger.log(`Notification ${notification.id} sent to DLQ`);
    } catch (dlqError) {
      this.logger.error(
        `Failed to send notification ${notification.id} to DLQ:`,
        dlqError,
      );
    }
  }

  /**
   * Get notification status
   */
  async getStatus(notificationId: string) {
    return this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        status: true,
        type: true,
        attempts: true,
        lastAttempt: true,
        deliveredAt: true,
        error: true,
      },
    });
  }

  /**
   * Get notification history for a user
   */
  async getHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }
}
