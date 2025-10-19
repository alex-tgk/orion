import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsArray } from 'class-validator';

export enum PM2ProcessStatus {
  ONLINE = 'online',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  LAUNCHING = 'launching',
  ERRORED = 'errored',
  ONE_LAUNCH_STATUS = 'one-launch-status',
}

export class PM2MonitDto {
  @ApiProperty({ description: 'Memory usage in bytes' })
  @IsNumber()
  memory: number;

  @ApiProperty({ description: 'CPU usage percentage' })
  @IsNumber()
  cpu: number;
}

export class PM2ProcessDto {
  @ApiProperty({ description: 'PM2 process ID' })
  @IsNumber()
  pm_id: number;

  @ApiProperty({ description: 'Process name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'PM2 process status', enum: PM2ProcessStatus })
  @IsEnum(PM2ProcessStatus)
  status: PM2ProcessStatus;

  @ApiProperty({ description: 'Process ID' })
  @IsNumber()
  pid: number;

  @ApiProperty({ description: 'Number of restarts' })
  @IsNumber()
  restarts: number;

  @ApiProperty({ description: 'Uptime in milliseconds' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ description: 'Resource monitoring data' })
  monit: PM2MonitDto;

  @ApiProperty({ description: 'Script path' })
  @IsString()
  @IsOptional()
  script?: string;

  @ApiProperty({ description: 'Interpreter used' })
  @IsString()
  @IsOptional()
  interpreter?: string;

  @ApiProperty({ description: 'Node version' })
  @IsString()
  @IsOptional()
  nodeVersion?: string;
}

export class PM2ProcessListDto {
  @ApiProperty({ description: 'List of PM2 processes', type: [PM2ProcessDto] })
  @IsArray()
  processes: PM2ProcessDto[];

  @ApiProperty({ description: 'Total process count' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Running process count' })
  @IsNumber()
  running: number;

  @ApiProperty({ description: 'Stopped process count' })
  @IsNumber()
  stopped: number;
}

export class PM2LogsDto {
  @ApiProperty({ description: 'Process ID' })
  @IsNumber()
  processId: number;

  @ApiProperty({ description: 'Process name' })
  @IsString()
  processName: string;

  @ApiProperty({ description: 'Log lines', type: [String] })
  @IsArray()
  logs: string[];

  @ApiProperty({ description: 'Number of lines returned' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Timestamp of retrieval' })
  @IsString()
  timestamp: string;
}

export class PM2ActionResponseDto {
  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'PM2 process ID' })
  @IsNumber()
  processId: number;

  @ApiProperty({ description: 'Process name' })
  @IsString()
  processName: string;

  @ApiProperty({ description: 'Success status' })
  @IsString()
  success: boolean;

  @ApiProperty({ description: 'Result message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'New process status' })
  @IsString()
  @IsOptional()
  newStatus?: string;
}
