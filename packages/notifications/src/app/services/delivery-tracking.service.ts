import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { NotificationStatus, NotificationType } from '@prisma/notifications';

/**
 * Delivery Statistics
 */
export interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  avgDeliveryTime: number; // in milliseconds
  byType: Record<NotificationType, {
    total: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
}

/**
 * Delivery Tracking Service
 *
 * Tracks notification delivery status and provides analytics.
 *
 * Features:
 * - Delivery status tracking
 * - Delivery time calculation
 * - Success/failure rate analytics
 * - Per-type statistics
 * - Historical tracking
 */
@Injectable()
export class DeliveryTrackingService {
  private readonly logger = new Logger(DeliveryTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mark notification as sent
   */
  async markAsSent(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.sending,
        sentAt: new Date(),
        attempts: {
          increment: 1,
        },
        lastAttempt: new Date(),
      },
    });

    this.logger.debug(`Notification ${notificationId} marked as sent`);
  }

  /**
   * Mark notification as delivered
   */
  async markAsDelivered(
    notificationId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { sentAt: true, metadata: true },
    });

    const deliveryTime = notification?.sentAt
      ? Date.now() - notification.sentAt.getTime()
      : 0;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.delivered,
        deliveredAt: new Date(),
        error: null,
        metadata: {
          ...(notification?.metadata as any),
          ...metadata,
          deliveryTime,
        },
      },
    });

    this.logger.log(
      `Notification ${notificationId} delivered (${deliveryTime}ms)`
    );
  }

  /**
   * Mark notification as failed
   */
  async markAsFailed(
    notificationId: string,
    error: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.failed,
        failedAt: new Date(),
        error,
        metadata: {
          ...(metadata || {}),
          failureTimestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.error(
      `Notification ${notificationId} failed: ${error}`
    );
  }

  /**
   * Mark notification as bounced
   */
  async markAsBounced(
    notificationId: string,
    reason: string
  ): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.bounced,
        error: reason,
        metadata: {
          bounceReason: reason,
          bounceTimestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.warn(
      `Notification ${notificationId} bounced: ${reason}`
    );
  }

  /**
   * Mark notification as spam
   */
  async markAsSpam(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.spam,
        metadata: {
          spamTimestamp: new Date().toISOString(),
        },
      },
    });

    this.logger.warn(`Notification ${notificationId} marked as spam`);
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<DeliveryStats> {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [total, delivered, failed, pending, byType] = await Promise.all([
      // Total count
      this.prisma.notification.count({ where: whereClause }),

      // Delivered count
      this.prisma.notification.count({
        where: {
          ...whereClause,
          status: NotificationStatus.delivered,
        },
      }),

      // Failed count
      this.prisma.notification.count({
        where: {
          ...whereClause,
          status: NotificationStatus.failed,
        },
      }),

      // Pending count
      this.prisma.notification.count({
        where: {
          ...whereClause,
          status: {
            in: [NotificationStatus.queued, NotificationStatus.sending],
          },
        },
      }),

      // By type statistics
      this.getStatsByType(whereClause),
    ]);

    // Calculate average delivery time
    const deliveredNotifications = await this.prisma.notification.findMany({
      where: {
        ...whereClause,
        status: NotificationStatus.delivered,
        sentAt: { not: null },
        deliveredAt: { not: null },
      },
      select: {
        sentAt: true,
        deliveredAt: true,
      },
      take: 1000, // Sample for performance
    });

    const deliveryTimes = deliveredNotifications
      .map((n) => {
        if (!n.sentAt || !n.deliveredAt) return 0;
        return n.deliveredAt.getTime() - n.sentAt.getTime();
      })
      .filter((t) => t > 0);

    const avgDeliveryTime =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
        : 0;

    return {
      total,
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? delivered / total : 0,
      avgDeliveryTime,
      byType,
    };
  }

  /**
   * Get statistics by notification type
   */
  private async getStatsByType(
    whereClause: any
  ): Promise<DeliveryStats['byType']> {
    const types = [
      NotificationType.email,
      NotificationType.sms,
      NotificationType.push,
    ];

    const stats: DeliveryStats['byType'] = {} as any;

    for (const type of types) {
      const [total, delivered, failed] = await Promise.all([
        this.prisma.notification.count({
          where: { ...whereClause, type },
        }),
        this.prisma.notification.count({
          where: {
            ...whereClause,
            type,
            status: NotificationStatus.delivered,
          },
        }),
        this.prisma.notification.count({
          where: {
            ...whereClause,
            type,
            status: NotificationStatus.failed,
          },
        }),
      ]);

      stats[type] = {
        total,
        delivered,
        failed,
        deliveryRate: total > 0 ? delivered / total : 0,
      };
    }

    return stats;
  }

  /**
   * Get delivery history for a user
   */
  async getUserDeliveryHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        template: true,
        subject: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        error: true,
        createdAt: true,
      },
    });

    const total = await this.prisma.notification.count({
      where: { userId },
    });

    return {
      data: notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        status: true,
        type: true,
        attempts: true,
        lastAttempt: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        error: true,
        metadata: true,
      },
    });

    if (!notification) {
      return null;
    }

    // Calculate delivery time if delivered
    let deliveryTime: number | null = null;
    if (notification.sentAt && notification.deliveredAt) {
      deliveryTime =
        notification.deliveredAt.getTime() - notification.sentAt.getTime();
    }

    return {
      ...notification,
      deliveryTime,
    };
  }
}
