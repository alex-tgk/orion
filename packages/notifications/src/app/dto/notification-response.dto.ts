import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationStatus,
  NotificationType,
} from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  template: string;

  @ApiProperty({ required: false })
  subject?: string;

  @ApiProperty()
  recipient: string;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty()
  attempts: number;

  @ApiProperty({ required: false })
  lastAttempt?: Date;

  @ApiProperty({ required: false })
  sentAt?: Date;

  @ApiProperty({ required: false })
  deliveredAt?: Date;

  @ApiProperty({ required: false })
  failedAt?: Date;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  attempts: number;

  @ApiProperty({ required: false })
  lastAttempt?: Date;

  @ApiProperty({ required: false })
  deliveredAt?: Date;

  @ApiProperty({ required: false })
  error?: string;
}

export class NotificationHistoryResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export class SendNotificationResponseDto {
  @ApiProperty()
  notificationId: string;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty()
  estimatedDelivery: Date;
}
