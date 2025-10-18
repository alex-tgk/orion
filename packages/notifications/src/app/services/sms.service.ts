import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface SmsOptions {
  to: string;
  body: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly enabled: boolean;
  private readonly client: Twilio | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('notification.twilio.accountSid');
    const authToken = this.configService.get<string>('notification.twilio.authToken');
    this.from = this.configService.get<string>('notification.twilio.from');
    this.enabled = this.configService.get<boolean>('notification.twilio.enabled');

    if (this.enabled && accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS service initialized');
    } else {
      this.client = null;
      this.logger.warn('Twilio SMS service is disabled or not configured');
    }
  }

  /**
   * Send an SMS
   */
  async send(options: SmsOptions): Promise<void> {
    if (!this.enabled || !this.client) {
      this.logger.debug(`SMS sending disabled. Would send to: ${options.to}`);
      return;
    }

    try {
      // Validate phone number format
      if (!this.validatePhoneNumber(options.to)) {
        throw new Error(`Invalid phone number format: ${options.to}`);
      }

      // Truncate message if too long (SMS limit is 160 chars, but allow concatenation)
      const body = this.truncateMessage(options.body, 480); // 3 SMS segments

      await this.client.messages.create({
        from: this.from,
        to: options.to,
        body,
      });

      this.logger.log(`SMS sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Send multiple SMS messages
   */
  async sendBatch(messages: SmsOptions[]): Promise<void> {
    if (!this.enabled || !this.client) {
      this.logger.debug(`SMS sending disabled. Would send ${messages.length} messages`);
      return;
    }

    try {
      const promises = messages.map((msg) => this.send(msg));
      await Promise.all(promises);
      this.logger.log(`Batch SMS sent successfully to ${messages.length} recipients`);
    } catch (error) {
      this.logger.error('Failed to send batch SMS:', error);
      throw error;
    }
  }

  /**
   * Validate phone number (E.164 format)
   */
  validatePhoneNumber(phone: string): boolean {
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Truncate message to fit SMS limits
   */
  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phone: string, countryCode = '+1'): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Add country code if not present
    if (!phone.startsWith('+')) {
      return `${countryCode}${cleaned}`;
    }

    return `+${cleaned}`;
  }
}
