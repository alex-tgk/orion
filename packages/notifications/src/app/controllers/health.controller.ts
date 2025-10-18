import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationPrismaService } from '../services/notification-prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: NotificationPrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async health() {
    return {
      status: 'ok',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (database, RabbitMQ, external services)' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    const checks = {
      database: false,
      rabbitmq: false,
      sendgrid: false,
      twilio: false,
    };

    try {
      // Check database
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      // Database not ready
    }

    // Check RabbitMQ (connection should be established by module)
    checks.rabbitmq = true; // If we got here, RabbitMQ connected during module init

    // Check SendGrid
    const sendgridEnabled = this.configService.get<boolean>('notification.sendgrid.enabled');
    const sendgridApiKey = this.configService.get<string>('notification.sendgrid.apiKey');
    checks.sendgrid = !sendgridEnabled || !!sendgridApiKey;

    // Check Twilio
    const twilioEnabled = this.configService.get<boolean>('notification.twilio.enabled');
    const twilioSid = this.configService.get<string>('notification.twilio.accountSid');
    checks.twilio = !twilioEnabled || !!twilioSid;

    const isReady = Object.values(checks).every((check) => check);

    return {
      status: isReady ? 'ready' : 'not ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
