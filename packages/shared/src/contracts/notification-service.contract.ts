/**
 * Notification Service API Contract
 *
 * Defines the interface for the Notification Service.
 */

export type NotificationType = 'email' | 'sms' | 'push';

export type NotificationStatus =
  | 'queued'
  | 'sending'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'spam';

export interface NotificationHistory {
  id: string;
  type: NotificationType;
  subject?: string;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
}

export interface NotificationStatusResponse {
  id: string;
  status: NotificationStatus;
  type: NotificationType;
  attempts: number;
  lastAttempt?: Date;
  deliveredAt?: Date;
  error?: string;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
  sms: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
  push: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
}

export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  template: string;
  data: Record<string, unknown>;
}

export interface SendNotificationResponse {
  notificationId: string;
  status: 'queued';
  estimatedDelivery: Date;
}

/**
 * Notification Service endpoints
 */
export const NOTIFICATION_SERVICE_ENDPOINTS = {
  SEND_NOTIFICATION: '/api/v1/notifications/send',
  GET_HISTORY: '/api/v1/notifications/:userId/history',
  GET_STATUS: '/api/v1/notifications/:id/status',
  GET_PREFERENCES: '/api/v1/notifications/preferences',
  UPDATE_PREFERENCES: '/api/v1/notifications/preferences',
} as const;
