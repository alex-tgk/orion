import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Service for generating and verifying webhook signatures using HMAC-SHA256
 */
@Injectable()
export class SignatureService {
  /**
   * Generate HMAC-SHA256 signature for webhook payload
   *
   * @param payload - The webhook payload object
   * @param secret - The webhook secret key
   * @returns Signature in format "sha256=<hex>"
   */
  generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    const signature = hmac.digest('hex');
    return `sha256=${signature}`;
  }

  /**
   * Verify webhook signature
   *
   * @param payload - The webhook payload object
   * @param signature - The signature to verify
   * @param secret - The webhook secret key
   * @returns True if signature is valid
   */
  verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return this.secureCompare(signature, expectedSignature);
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   *
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Generate a secure random secret for new webhooks
   *
   * @param length - Length of the secret (default: 32 bytes = 64 hex chars)
   * @returns Random hex string
   */
  generateSecret(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create the full webhook payload with metadata
   *
   * @param eventId - Unique event identifier
   * @param eventType - Type of event
   * @param data - Event data
   * @returns Formatted webhook payload
   */
  createWebhookPayload(eventId: string, eventType: string, data: any): any {
    return {
      id: eventId,
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };
  }
}
