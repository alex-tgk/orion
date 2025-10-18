import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.module';
import { NotificationService } from '../services/notification.service';
import { PreferencesService } from '../services/preferences.service';
import {
  UserCreatedEvent,
  UserVerifiedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
} from '@orion/shared';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class UserEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(UserEventsConsumer.name);
  private readonly queueName = 'notification.user-events';

  constructor(
    @Inject(RABBITMQ_CHANNEL) private readonly channel: Channel,
    private readonly notificationService: NotificationService,
    private readonly preferencesService: PreferencesService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.startConsuming();
  }

  private async startConsuming() {
    try {
      await this.channel.consume(
        this.queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const content = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;

            this.logger.log(`Received event: ${routingKey}`);

            switch (routingKey) {
              case 'user.created':
                await this.handleUserCreated(content as UserCreatedEvent);
                break;
              case 'user.verified':
                await this.handleUserVerified(content as UserVerifiedEvent);
                break;
              case 'user.updated':
                await this.handleUserUpdated(content as UserUpdatedEvent);
                break;
              case 'user.deleted':
                await this.handleUserDeleted(content as UserDeletedEvent);
                break;
              default:
                this.logger.warn(`Unknown event type: ${routingKey}`);
            }

            // Acknowledge message
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing user event:', error);
            // Reject and requeue message
            this.channel.nack(msg, false, true);
          }
        },
        { noAck: false },
      );

      this.logger.log(`Started consuming from queue: ${this.queueName}`);
    } catch (error) {
      this.logger.error('Failed to start consuming user events:', error);
      throw error;
    }
  }

  /**
   * Handle UserCreatedEvent - Send welcome email
   */
  private async handleUserCreated(event: UserCreatedEvent) {
    this.logger.log(`Sending welcome email to user ${event.userId}`);

    const frontendUrl = this.configService.get<string>(
      'notification.app.frontendUrl',
    );

    // Check if email notifications are enabled
    const enabled = await this.preferencesService.isEnabled(
      event.userId,
      'email',
      'welcome',
    );

    if (!enabled) {
      this.logger.debug(`Welcome email disabled for user ${event.userId}`);
      return;
    }

    await this.notificationService.send({
      userId: event.userId,
      type: NotificationType.EMAIL,
      template: 'welcome-email',
      recipient: event.email,
      data: {
        name: event.name,
        email: event.email,
        verificationUrl: `${frontendUrl}/verify-email?token=PLACEHOLDER`,
        loginUrl: `${frontendUrl}/login`,
      },
    });
  }

  /**
   * Handle UserVerifiedEvent - Send verification confirmation
   */
  private async handleUserVerified(event: UserVerifiedEvent) {
    this.logger.log(
      `Sending verification confirmation to user ${event.userId}`,
    );

    const frontendUrl = this.configService.get<string>(
      'notification.app.frontendUrl',
    );

    const enabled = await this.preferencesService.isEnabled(
      event.userId,
      'email',
      'accountUpdates',
    );

    if (!enabled) {
      this.logger.debug(
        `Account update emails disabled for user ${event.userId}`,
      );
      return;
    }

    await this.notificationService.send({
      userId: event.userId,
      type: NotificationType.EMAIL,
      template: 'account-verified',
      recipient: event.email,
      data: {
        email: event.email,
        verifiedAt: event.verifiedAt,
        loginUrl: `${frontendUrl}/login`,
      },
    });
  }

  /**
   * Handle UserUpdatedEvent - Send profile update confirmation (if email changed)
   */
  private async handleUserUpdated(event: UserUpdatedEvent) {
    // Only send notification if email was changed
    if (!event.changes.includes('email')) {
      return;
    }

    this.logger.log(
      `Sending profile update confirmation to user ${event.userId}`,
    );

    const enabled = await this.preferencesService.isEnabled(
      event.userId,
      'email',
      'accountUpdates',
    );

    if (!enabled) {
      return;
    }

    // Note: We would need to get the new email from somewhere
    // For now, we'll skip this as we don't have the new email in the event
    this.logger.warn('Email change notification requires new email address');
  }

  /**
   * Handle UserDeletedEvent - Send account deletion confirmation
   */
  private async handleUserDeleted(event: UserDeletedEvent) {
    this.logger.log(`User ${event.userId} deleted - cleaning up preferences`);

    // Delete user preferences
    await this.preferencesService.deletePreferences(event.userId);

    // Note: We can't send a notification as the user is deleted
    // In a real system, we might send this before deletion or to a backup email
  }
}
