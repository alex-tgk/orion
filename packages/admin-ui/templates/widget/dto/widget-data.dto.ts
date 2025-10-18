import { ApiProperty } from '@nestjs/swagger';

export class WidgetDataDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Widget data', required: false })
  data?: any; // Replace 'any' with your specific data type

  @ApiProperty({ description: 'Error information', required: false })
  error?: {
    message: string;
    code?: string;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2025-01-15T10:30:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'Response metadata', required: false })
  metadata?: {
    source: string;
    version: string;
    [key: string]: any;
  };
}
