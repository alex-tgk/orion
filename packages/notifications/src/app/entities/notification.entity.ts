// Re-export Prisma types for backward compatibility
import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
} from '.prisma/notifications';

export { NotificationType, NotificationStatus, NotificationChannel };

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  template: string;
  subject?: string;
  body: string;
  recipient: string;
  status: NotificationStatus;
  attempts: number;
  lastAttempt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
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
  updatedAt: Date;
}
