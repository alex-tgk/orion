import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@orion/shared';
import { AuditAction } from '../interfaces/feature-flag.interface';

@Injectable()
export class FlagAuditService {
  private readonly logger = new Logger(FlagAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async log(
    flagId: string,
    action: AuditAction,
    userId?: string,
    changes?: any,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.flagAuditLog.create({
        data: {
          flagId,
          action,
          changedBy: userId,
          changes: JSON.stringify(changes || {}),
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
      });

      this.logger.debug(`Audit log created: ${action} for flag ${flagId}`);
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Get audit logs for a flag
   */
  async getLogsForFlag(flagId: string, limit = 100) {
    return this.prisma.flagAuditLog.findMany({
      where: { flagId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs by user
   */
  async getLogsByUser(userId: string, limit = 100) {
    return this.prisma.flagAuditLog.findMany({
      where: { changedBy: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        flag: {
          select: {
            key: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit = 50) {
    return this.prisma.flagAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        flag: {
          select: {
            key: true,
            name: true,
          },
        },
      },
    });
  }
}
