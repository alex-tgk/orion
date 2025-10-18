import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/user';

/**
 * UserPrismaService
 * 
 * Dedicated Prisma client service for the User microservice.
 * Extends PrismaClient to provide database access with proper lifecycle management.
 * 
 * Architecture:
 * - Isolated database connection for user service
 * - Automatic connection management (connect on init, disconnect on destroy)
 * - Type-safe database operations via Prisma
 * - Connection pooling and optimization
 * 
 * Usage:
 * ```typescript
 * constructor(private readonly prisma: UserPrismaService) {}
 * 
 * async findUser(id: string) {
 *   return this.prisma.user.findUnique({ where: { id } });
 * }
 * ```
 */
@Injectable()
export class UserPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserPrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = configService.get<string>('USER_DATABASE_URL') || configService.get<string>('DATABASE_URL') || '';

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    // @ts-expect-error - Prisma event types
    this.$on('warn', (e) => {
      this.logger.warn(e.message);
    });

    // @ts-expect-error - Prisma event types
    this.$on('error', (e) => {
      this.logger.error(e.message);
    });
  }

  /**
   * Connect to database when module initializes
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to User database');
    } catch (error) {
      this.logger.error('Failed to connect to User database', error);
      throw error;
    }
  }

  /**
   * Disconnect from database when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from User database');
    } catch (error) {
      this.logger.error('Failed to disconnect from User database', error);
    }
  }
}
