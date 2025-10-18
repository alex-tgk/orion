import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';

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

  // Add your configuration properties here
  // Example:
  //
  // @ApiProperty({
  //   description: 'Data source to query',
  //   example: 'database',
  //   enum: ['database', 'cache', 'api'],
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // dataSource?: string;
}
