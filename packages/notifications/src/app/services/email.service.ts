import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;
  private readonly from: { email: string; name: string };
  private readonly replyTo: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'notification.sendgrid.apiKey',
    );
    this.enabled =
      this.configService.get<boolean>('notification.sendgrid.enabled') ?? false;
    this.from = this.configService.get('notification.sendgrid.from') || {
      email: 'noreply@orion.local',
      name: 'ORION Notifications',
    };
    this.replyTo =
      this.configService.get<string>('notification.sendgrid.replyTo') ||
      'support@orion.local';

    if (this.enabled && apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn('SendGrid email service is disabled or not configured');
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Email sending disabled. Would send to: ${options.to}`);
      return;
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email: this.from.email,
          name: this.from.name,
        },
        replyTo: this.replyTo,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      await sgMail.send(msg);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Send multiple emails (batch)
   */
  async sendBatch(emails: EmailOptions[]): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(
        `Email sending disabled. Would send ${emails.length} emails`,
      );
      return;
    }

    try {
      const messages = emails.map((email) => ({
        to: email.to,
        from: {
          email: this.from.email,
          name: this.from.name,
        },
        replyTo: this.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text || this.stripHtml(email.html),
      }));

      await sgMail.send(messages);
      this.logger.log(
        `Batch email sent successfully to ${emails.length} recipients`,
      );
    } catch (error) {
      this.logger.error('Failed to send batch email:', error);
      throw error;
    }
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
