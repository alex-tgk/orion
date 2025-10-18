import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.module';
import { NotificationService } from '../services/notification.service';
import { PreferencesService } from '../services/preferences.service';
import {
  PasswordResetRequestedEvent,
  PasswordChangedEvent,
  SuspiciousLoginEvent,
} from '@orion/shared';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class AuthEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(AuthEventsConsumer.name);
  private readonly queueName = 'notification.auth-events';

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

            this.logger.log(`Received auth event: ${routingKey}`);

            switch (routingKey) {
              case 'auth.password-reset-requested':
                await this.handlePasswordResetRequested(
                  content as PasswordResetRequestedEvent,
                );
                break;
              case 'auth.password-changed':
                await this.handlePasswordChanged(
                  content as PasswordChangedEvent,
                );
                break;
              case 'auth.suspicious-login':
                await this.handleSuspiciousLogin(
                  content as SuspiciousLoginEvent,
                );
                break;
              default:
                this.logger.warn(`Unknown auth event type: ${routingKey}`);
            }

            // Acknowledge message
            this.channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing auth event:', error);
            // Reject and requeue message
            this.channel.nack(msg, false, true);
          }
        },
        { noAck: false },
      );

      this.logger.log(`Started consuming from queue: ${this.queueName}`);
    } catch (error) {
      this.logger.error('Failed to start consuming auth events:', error);
      throw error;
    }
  }

  /**
   * Handle PasswordResetRequestedEvent - Send password reset email
   */
  private async handlePasswordResetRequested(
    event: PasswordResetRequestedEvent,
  ) {
    this.logger.log(`Sending password reset email to user ${event.userId}`);

    const frontendUrl = this.configService.get<string>(
      'notification.app.frontendUrl',
    );

    const enabled = await this.preferencesService.isEnabled(
      event.userId,
      'email',
      'passwordReset',
    );

    if (!enabled) {
      this.logger.debug(
        `Password reset emails disabled for user ${event.userId}`,
      );
      return;
    }

    // Calculate expires in minutes
    const expiresAt = new Date(event.expiresAt);
    const now = new Date(event.requestedAt);
    const expiresInMinutes = Math.round(
      (expiresAt.getTime() - now.getTime()) / 60000,
    );

    await this.notificationService.send({
      userId: event.userId,
      type: NotificationType.EMAIL,
      template: 'password-reset',
      recipient: event.email,
      data: {
        email: event.email,
        resetUrl: `${frontendUrl}/reset-password?token=${event.resetToken}`,
        expiresIn: `${expiresInMinutes} minutes`,
        expiresAt: event.expiresAt,
      },
    });
  }

  /**
   * Handle PasswordChangedEvent - Send security alert email and SMS
   */
  private async handlePasswordChanged(event: PasswordChangedEvent) {
    this.logger.log(
      `Sending password changed notification to user ${event.userId}`,
    );

    // Send email notification
    const emailEnabled = await this.preferencesService.isEnabled(
      event.userId,
      'email',
      'securityAlerts',
    );

    if (emailEnabled) {
      await this.notificationService.send({
        userId: event.userId,
        type: NotificationType.EMAIL,
        template: 'password-changed',
        recipient: event.email,
        data: {
          email: event.email,
          changedAt: event.changedAt,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          supportUrl: `${this.configService.get('notification.app.frontendUrl')}/support`,
        },
      });
    }

    // Send SMS notification if enabled
    const smsEnabled = await this.preferencesService.isEnabled(
      event.userId,
      'sms',
      'securityAlerts',
    );

    if (smsEnabled) {
      // Note: We would need phone number from user profile
      // For now, just log that we would send SMS
      this.logger.log(`Would send SMS security alert to user ${event.userId}`);
    }
  }

  /**
   * Handle SuspiciousLoginEvent - Send security alert email and SMS
   */
  private async handleSuspiciousLogin(event: SuspiciousLoginEvent) {
    this.logger.log(`Sending suspicious login alert to user ${event.userId}`);

    // Send email notification
    const emailEnabled = await this.preferencesService.isEnabled(
      event.userId,
      'email',
      'securityAlerts',
    );

    if (emailEnabled) {
      await this.notificationService.send({
        userId: event.userId,
        type: NotificationType.EMAIL,
        template: 'suspicious-login',
        recipient: event.email,
        data: {
          email: event.email,
          ipAddress: event.ipAddress,
          location: event.location,
          userAgent: event.userAgent,
          reason: event.reason,
          timestamp: event.timestamp,
          securityUrl: `${this.configService.get('notification.app.frontendUrl')}/security`,
          supportUrl: `${this.configService.get('notification.app.frontendUrl')}/support`,
        },
      });
    }

    // Send SMS notification if enabled
    const smsEnabled = await this.preferencesService.isEnabled(
      event.userId,
      'sms',
      'securityAlerts',
    );

    if (smsEnabled) {
      // Note: We would need phone number from user profile
      this.logger.log(`Would send SMS security alert to user ${event.userId}`);

      // Example SMS message
      const smsBody = `Security Alert: Suspicious login attempt from ${event.location} at ${new Date(event.timestamp).toLocaleString()}. If this wasn't you, secure your account immediately.`;

      // await this.notificationService.send({
      //   userId: event.userId,
      //   type: NotificationType.SMS,
      //   template: 'suspicious-login-sms',
      //   recipient: userPhoneNumber,
      //   data: { body: smsBody },
      // });
    }
  }
}
