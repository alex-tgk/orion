import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsIP,
  IsDate,
  IsEnum,
} from 'class-validator';

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

export class SessionDto {
  @ApiProperty({ description: 'Session ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Device name', example: 'iPhone 13 Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Device type',
    example: DeviceType.MOBILE,
    enum: DeviceType
  })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.1' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Whether session is active', example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Last activity timestamp' })
  @IsDate()
  lastActivityAt: Date;

  @ApiProperty({ description: 'Session expiry timestamp' })
  @IsDate()
  expiresAt: Date;

  @ApiProperty({ description: 'Session creation timestamp' })
  @IsDate()
  createdAt: Date;
}

export class CreateSessionDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Authentication token (JWT)' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ description: 'Refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Device name', example: 'Chrome on MacBook Pro' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({
    description: 'Device type',
    example: DeviceType.DESKTOP,
    enum: DeviceType
  })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.1' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Session expiry timestamp' })
  @IsDate()
  expiresAt: Date;
}

export class ListSessionsResponseDto {
  @ApiProperty({ description: 'List of sessions', type: [SessionDto] })
  sessions: SessionDto[];

  @ApiProperty({ description: 'Total active sessions', example: 3 })
  total: number;
}

export class SessionActivityDto {
  @ApiProperty({ description: 'Session ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Updated activity timestamp' })
  @IsDate()
  lastActivityAt: Date;
}
