import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CostPeriod, CostCategory, ResourceType } from '@prisma/client';

export class CostQueryDto {
  @ApiPropertyOptional({ description: 'Start date for cost query' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for cost query' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: CostPeriod, description: 'Cost aggregation period' })
  @IsOptional()
  @IsEnum(CostPeriod)
  period?: CostPeriod;

  @ApiPropertyOptional({ description: 'Filter by service name' })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Filter by namespace' })
  @IsOptional()
  @IsString()
  namespace?: string;

  @ApiPropertyOptional({ description: 'Filter by team' })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiPropertyOptional({ description: 'Filter by environment' })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({ enum: CostCategory, description: 'Filter by cost category' })
  @IsOptional()
  @IsEnum(CostCategory)
  category?: CostCategory;

  @ApiPropertyOptional({ enum: ResourceType, description: 'Filter by resource type' })
  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;
}

export class CreateBudgetDto {
  @ApiProperty({ description: 'Budget name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Budget description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Budget type (service, team, namespace, global)' })
  @IsString()
  budgetType: string;

  @ApiProperty({ description: 'Budget key (service name, team name, etc.)' })
  @IsString()
  budgetKey: string;

  @ApiProperty({ description: 'Budget name for display' })
  @IsString()
  budgetName: string;

  @ApiProperty({ enum: CostPeriod, description: 'Budget period' })
  @IsEnum(CostPeriod)
  period: CostPeriod;

  @ApiProperty({ description: 'Budget amount' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Budget start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Budget end date (optional for recurring budgets)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Warning threshold percentage', default: 80 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  warningThreshold?: number;

  @ApiPropertyOptional({ description: 'Critical threshold percentage', default: 95 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  criticalThreshold?: number;

  @ApiPropertyOptional({ description: 'Notification emails', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationEmails?: string[];

  @ApiPropertyOptional({ description: 'Slack webhook for notifications' })
  @IsOptional()
  @IsString()
  notificationSlack?: string;
}

export class UpdateBudgetDto {
  @ApiPropertyOptional({ description: 'Budget amount' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ description: 'Warning threshold percentage' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  warningThreshold?: number;

  @ApiPropertyOptional({ description: 'Critical threshold percentage' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  criticalThreshold?: number;

  @ApiPropertyOptional({ description: 'Is budget active' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notification emails', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationEmails?: string[];
}

export class ForecastQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to forecast', default: 30 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  days?: number;

  @ApiPropertyOptional({ enum: CostPeriod, description: 'Forecast period granularity' })
  @IsOptional()
  @IsEnum(CostPeriod)
  period?: CostPeriod;

  @ApiPropertyOptional({ description: 'Filter by service name' })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Filter by team' })
  @IsOptional()
  @IsString()
  team?: string;
}

export class OptimizationQueryDto {
  @ApiPropertyOptional({ description: 'Minimum potential savings amount' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minSavings?: number;

  @ApiPropertyOptional({ enum: CostCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(CostCategory)
  category?: CostCategory;

  @ApiPropertyOptional({ description: 'Filter by service name' })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Include dismissed recommendations' })
  @IsOptional()
  includeDismissed?: boolean;

  @ApiPropertyOptional({ description: 'Include implemented recommendations' })
  @IsOptional()
  includeImplemented?: boolean;
}
