import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, Min, Max, IsOptional } from 'class-validator';

export class WidgetConfigDto {
  @ApiProperty({
    description: 'Update interval in milliseconds',
    example: 5000,
    minimum: 1000,
    maximum: 60000,
  })
  @IsNumber()
  @Min(1000)
  @Max(60000)
  refreshInterval: number;

  @ApiProperty({
    description: 'CPU usage alert threshold (%)',
    example: 80,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuThreshold?: number;

  @ApiProperty({
    description: 'Memory usage alert threshold (%)',
    example: 85,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  memoryThreshold?: number;

  @ApiProperty({
    description: 'Disk usage alert threshold (%)',
    example: 90,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  diskThreshold?: number;

  @ApiProperty({
    description: 'Show alert notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showAlerts?: boolean;
}
