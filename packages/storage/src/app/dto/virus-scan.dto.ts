import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VirusScanStatus {
  PENDING = 'pending',
  CLEAN = 'clean',
  INFECTED = 'infected',
  FAILED = 'failed',
}

export class UpdateVirusScanDto {
  @ApiProperty({ enum: VirusScanStatus })
  @IsEnum(VirusScanStatus)
  status: VirusScanStatus;

  @ApiPropertyOptional({ description: 'Scan result details' })
  @IsString()
  @IsOptional()
  details?: string;

  @ApiPropertyOptional({ description: 'Scan date/time' })
  @IsDateString()
  @IsOptional()
  scannedAt?: string;
}
