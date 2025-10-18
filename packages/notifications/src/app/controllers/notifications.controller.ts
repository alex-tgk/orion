import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { PreferencesService } from '../services/preferences.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import {
  SendNotificationResponseDto,
  NotificationHistoryResponseDto,
  NotificationStatusResponseDto,
} from '../dto/notification-response.dto';
import {
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
} from '../dto/notification-preferences.dto';
import { NotificationStatus } from '../entities/notification.entity';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: PreferencesService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Manually send a notification' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Notification queued for delivery',
    type: SendNotificationResponseDto,
  })
  @ApiBearerAuth()
  async sendNotification(
    @Body(ValidationPipe) dto: SendNotificationDto,
  ): Promise<SendNotificationResponseDto> {
    const notificationId = await this.notificationService.send({
      userId: dto.userId,
      type: dto.type,
      template: dto.template,
      recipient: dto.data?.email || dto.data?.phone || '',
      data: dto.data || {},
    });

    // Estimate delivery time (30 seconds from now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setSeconds(estimatedDelivery.getSeconds() + 30);

    return {
      notificationId,
      status: NotificationStatus.QUEUED,
      estimatedDelivery,
    };
  }

  @Get(':userId/history')
  @ApiOperation({ summary: 'Get notification history for a user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification history retrieved',
    type: NotificationHistoryResponseDto,
  })
  @ApiBearerAuth()
  async getHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<NotificationHistoryResponseDto> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    return this.notificationService.getHistory(userId, pageNum, limitNum);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get status of a specific notification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification status retrieved',
    type: NotificationStatusResponseDto,
  })
  @ApiBearerAuth()
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationStatusResponseDto> {
    return this.notificationService.getStatus(id);
  }

  @Get('preferences')
  @ApiOperation({ summary: "Get user's notification preferences" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences retrieved',
    type: NotificationPreferencesResponseDto,
  })
  @ApiBearerAuth()
  async getPreferences(
    @Req() req: any,
  ): Promise<NotificationPreferencesResponseDto> {
    // In production, extract userId from JWT token
    const userId = req.user?.userId || req.query.userId;
    return this.preferencesService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preferences updated',
    type: NotificationPreferencesResponseDto,
  })
  @ApiBearerAuth()
  async updatePreferences(
    @Req() req: any,
    @Body(ValidationPipe) dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    // In production, extract userId from JWT token
    const userId = req.user?.userId || req.query.userId;
    return this.preferencesService.updatePreferences(userId, dto);
  }
}
