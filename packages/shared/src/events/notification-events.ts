/**
 * Notification Service Event Definitions
 *
 * These events are published by the Notification Service.
 */

export interface NotificationSentEvent {
  eventId: string;
  notificationId: string;
  userId: string;
  type: 'email' | 'sms' | 'push';
  status: 'delivered' | 'failed' | 'bounced';
  sentAt: Date;
}

export interface NotificationFailedEvent {
  eventId: string;
  notificationId: string;
  userId: string;
  type: 'email' | 'sms' | 'push';
  error: string;
  attempts: number;
  failedAt: Date;
}

// Event names for RabbitMQ routing
export const NOTIFICATION_EVENT_PATTERNS = {
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
} as const;
