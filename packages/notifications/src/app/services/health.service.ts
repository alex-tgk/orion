import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@orion/shared';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';

/**
 * Health Status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  dependencies: {
    database: ComponentHealth;
    email: ComponentHealth;
    sms: ComponentHealth;
    push: ComponentHealth;
    rabbitmq: ComponentHealth;
  };
}

/**
 * Component Health
 */
interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
}

/**
 * Health Service
 *
 * Provides health check functionality for the notification service
 * and its dependencies.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService
  ) {
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive health status
   */
  async getHealth(): Promise<HealthStatus> {
    const [database, email, sms, push, rabbitmq] = await Promise.all([
      this.checkDatabase(),
      this.checkEmail(),
      this.checkSms(),
      this.checkPush(),
      this.checkRabbitMQ(),
    ]);

    // Determine overall status
    const dependencies = { database, email, sms, push, rabbitmq };
    const status = this.determineOverallStatus(dependencies);

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.configService.get('app.version', '1.0.0'),
      dependencies,
    };
  }

  /**
   * Determine overall health status from dependencies
   */
  private determineOverallStatus(dependencies: {
    [key: string]: ComponentHealth;
  }): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(dependencies).map((d) => d.status);

    if (statuses.every((s) => s === 'up')) {
      return 'healthy';
    }

    if (statuses.some((s) => s === 'down')) {
      // Critical dependency down
      if (dependencies.database.status === 'down') {
        return 'unhealthy';
      }
      return 'degraded';
    }

    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  /**
   * Check email service health
   */
  private async checkEmail(): Promise<ComponentHealth> {
    try {
      const enabled = this.emailService.isEnabled();
      return {
        status: enabled ? 'up' : 'degraded',
        message: enabled ? undefined : 'Email service is disabled',
      };
    } catch (error) {
      this.logger.error(`Email health check failed: ${error.message}`);
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  /**
   * Check SMS service health
   */
  private async checkSms(): Promise<ComponentHealth> {
    try {
      const enabled = this.smsService.isEnabled();
      return {
        status: enabled ? 'up' : 'degraded',
        message: enabled ? undefined : 'SMS service is disabled',
      };
    } catch (error) {
      this.logger.error(`SMS health check failed: ${error.message}`);
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  /**
   * Check push service health
   */
  private async checkPush(): Promise<ComponentHealth> {
    try {
      const enabled = this.pushService.isEnabled();
      return {
        status: enabled ? 'up' : 'degraded',
        message: enabled ? undefined : 'Push service is disabled',
      };
    } catch (error) {
      this.logger.error(`Push health check failed: ${error.message}`);
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  /**
   * Check RabbitMQ health
   */
  private async checkRabbitMQ(): Promise<ComponentHealth> {
    try {
      // In a real implementation, check RabbitMQ connection
      // For now, assume it's up if service is running
      return {
        status: 'up',
      };
    } catch (error) {
      this.logger.error(`RabbitMQ health check failed: ${error.message}`);
      return {
        status: 'down',
        message: error.message,
      };
    }
  }

  /**
   * Simple liveness check
   */
  isAlive(): boolean {
    return true;
  }

  /**
   * Readiness check
   */
  async isReady(): Promise<boolean> {
    try {
      // Check critical dependencies
      const database = await this.checkDatabase();
      return database.status === 'up';
    } catch (error) {
      return false;
    }
  }
}
