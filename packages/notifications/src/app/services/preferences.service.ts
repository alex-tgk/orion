import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationPrismaService } from './notification-prisma.service';
import { UpdateNotificationPreferencesDto } from '../dto/notification-preferences.dto';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly prisma: NotificationPrismaService) {}

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return {
      email: preferences.emailPreferences as any,
      sms: preferences.smsPreferences as any,
      push: preferences.pushPreferences as any,
    };
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: UpdateNotificationPreferencesDto,
  ) {
    // Get existing preferences or create defaults
    let preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    // Merge updates with existing preferences
    const email = this.mergePreferences(preferences.emailPreferences as any, updates.email);
    const sms = this.mergePreferences(preferences.smsPreferences as any, updates.sms);
    const push = this.mergePreferences(preferences.pushPreferences as any, updates.push);

    // Update preferences
    const updated = await this.prisma.userPreference.update({
      where: { userId },
      data: {
        emailPreferences: email,
        smsPreferences: sms,
        pushPreferences: push,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Notification preferences updated for user ${userId}`);

    return {
      email: updated.emailPreferences as any,
      sms: updated.smsPreferences as any,
      push: updated.pushPreferences as any,
    };
  }

  /**
   * Check if user has enabled a specific notification type
   */
  async isEnabled(
    userId: string,
    channel: 'email' | 'sms' | 'push',
    type?: string,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    const channelPrefs = preferences[channel];

    if (!channelPrefs.enabled) {
      return false;
    }

    // If no specific type is specified, just check if channel is enabled
    if (!type) {
      return true;
    }

    // Check if specific type is enabled
    return channelPrefs.types[type] !== false; // Default to true if not specified
  }

  /**
   * Create default preferences for a new user
   */
  private async createDefaultPreferences(userId: string) {
    return this.prisma.userPreference.create({
      data: {
        userId,
        emailPreferences: {
          enabled: true,
          types: {
            welcome: true,
            passwordReset: true,
            accountUpdates: true,
            securityAlerts: true,
            marketing: false,
          },
        },
        smsPreferences: {
          enabled: false,
          types: {
            securityAlerts: true,
            marketing: false,
          },
        },
        pushPreferences: {
          enabled: true,
          types: {
            realtime: true,
            daily: true,
            marketing: false,
          },
        },
      },
    });
  }

  /**
   * Merge preference updates with existing preferences
   */
  private mergePreferences(
    existing: { enabled: boolean; types: Record<string, boolean> },
    updates?: { enabled?: boolean; types?: Record<string, boolean> },
  ) {
    if (!updates) {
      return existing;
    }

    return {
      enabled: updates.enabled !== undefined ? updates.enabled : existing.enabled,
      types: {
        ...existing.types,
        ...(updates.types || {}),
      },
    };
  }

  /**
   * Delete user preferences (for GDPR compliance)
   */
  async deletePreferences(userId: string): Promise<void> {
    try {
      await this.prisma.userPreference.delete({
        where: { userId },
      });
      this.logger.log(`Notification preferences deleted for user ${userId}`);
    } catch (error) {
      if (error.code === 'P2025') {
        // Record not found - that's fine
        return;
      }
      throw error;
    }
  }
}
