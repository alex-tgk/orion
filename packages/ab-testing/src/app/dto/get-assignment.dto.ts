import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAssignmentDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Device ID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'User attributes for targeting' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}
