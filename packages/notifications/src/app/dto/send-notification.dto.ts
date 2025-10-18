import {
  IsString,
  IsUUID,
  IsEnum,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class SendNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  template: string;

  @ApiProperty({ description: 'Template data', required: false })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
