import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/notifications';

/**
 * Notification-Specific Prisma Service
 *
 * Extends the Prisma client generated for the notification service.
 * This service provides type-safe database access to notification-specific models:
 * - Notification
 * - Template
 * - DeliveryAttempt
 * - UserPreference
 * - NotificationBatch
 *
 * @implements {OnModuleInit} Connects to database on module initialization
 * @implements {OnModuleDestroy} Disconnects from database on module destruction
 */
@Injectable()
export class NotificationPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationPrismaService.name);

  /**
   * Connect to the database when the module is initialized
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Notification database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to notification database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the database when the module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Notification database connection closed');
    } catch (error) {
      this.logger.error('Failed to disconnect from notification database:', error);
      throw error;
    }
  }

  /**
   * Enable query logging in development
   */
  enableQueryLogging(): void {
    this.$on('query' as never, (e: any) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Params: ${e.params}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });
  }
}
