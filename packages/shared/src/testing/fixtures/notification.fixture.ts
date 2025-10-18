/**
 * Notification entity fixtures for testing
 */
export class NotificationFixture {
  static createEmailNotification(overrides?: Partial<any>) {
    return {
      id: 'notif-123',
      type: 'email',
      recipient: 'user@orion.test',
      subject: 'Test Email',
      body: 'This is a test email notification',
      status: 'pending',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      failedAt: null,
      attempts: 0,
      maxAttempts: 3,
      ...overrides,
    };
  }

  static createSmsNotification(overrides?: Partial<any>) {
    return {
      id: 'notif-sms-123',
      type: 'sms',
      recipient: '+1234567890',
      body: 'Test SMS notification',
      status: 'pending',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      failedAt: null,
      attempts: 0,
      maxAttempts: 3,
      ...overrides,
    };
  }

  static createPushNotification(overrides?: Partial<any>) {
    return {
      id: 'notif-push-123',
      type: 'push',
      recipient: 'device-token-123',
      title: 'Test Push',
      body: 'This is a test push notification',
      status: 'pending',
      metadata: {
        badge: 1,
        sound: 'default',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      failedAt: null,
      attempts: 0,
      maxAttempts: 3,
      ...overrides,
    };
  }

  static createSentNotification(overrides?: Partial<any>) {
    return this.createEmailNotification({
      status: 'sent',
      sentAt: new Date(),
      attempts: 1,
      ...overrides,
    });
  }

  static createFailedNotification(overrides?: Partial<any>) {
    return this.createEmailNotification({
      status: 'failed',
      failedAt: new Date(),
      attempts: 3,
      metadata: {
        error: 'SMTP connection failed',
      },
      ...overrides,
    });
  }
}
