import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostPeriod, CostCategory, ResourceType, AlertSeverity } from '@prisma/client';

export class CostMetricResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty({ enum: CostPeriod })
  period: CostPeriod;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  @ApiProperty({ enum: ResourceType })
  resourceType: ResourceType;

  @ApiPropertyOptional()
  resourceName?: string;

  @ApiPropertyOptional()
  serviceName?: string;

  @ApiPropertyOptional()
  namespace?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: CostCategory })
  category: CostCategory;
}

export class CurrentCostsResponseDto {
  @ApiProperty()
  period: CostPeriod;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ description: 'Cost breakdown by category' })
  byCategory: Record<CostCategory, number>;

  @ApiProperty({ description: 'Cost breakdown by service' })
  byService: Record<string, number>;

  @ApiProperty({ description: 'Cost breakdown by resource type' })
  byResourceType: Record<ResourceType, number>;

  @ApiProperty({ description: 'Top cost drivers', type: [Object] })
  topCostDrivers: Array<{
    resourceType: ResourceType;
    resourceName: string;
    serviceName?: string;
    cost: number;
    costPercent: number;
  }>;

  @ApiPropertyOptional({ description: 'Comparison with previous period' })
  previousPeriod?: {
    totalCost: number;
    costChange: number;
    costChangePercent: number;
  };
}

export class CostTrendResponseDto {
  @ApiProperty({ enum: CostPeriod })
  period: CostPeriod;

  @ApiProperty({ type: [Object] })
  data: Array<{
    timestamp: Date;
    cost: number;
    forecastedCost?: number;
  }>;

  @ApiProperty()
  trend: 'increasing' | 'decreasing' | 'stable';

  @ApiProperty()
  changePercent: number;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  averageCost: number;
}

export class CostByServiceResponseDto {
  @ApiProperty()
  serviceName: string;

  @ApiPropertyOptional()
  namespace?: string;

  @ApiProperty()
  totalCost: number;

  @ApiProperty()
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    database: number;
    monitoring: number;
    logging: number;
    security: number;
    cicd: number;
    external: number;
    other: number;
  };

  @ApiProperty()
  costPercent: number;

  @ApiPropertyOptional()
  budgetAmount?: number;

  @ApiPropertyOptional()
  budgetVariance?: number;

  @ApiPropertyOptional()
  budgetStatus?: 'on-track' | 'warning' | 'critical' | 'exceeded';
}

export class CostForecastResponseDto {
  @ApiProperty()
  forecastDate: Date;

  @ApiProperty({ enum: CostPeriod })
  period: CostPeriod;

  @ApiProperty()
  predictedCost: number;

  @ApiProperty()
  lowerBound: number;

  @ApiProperty()
  upperBound: number;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  method: string;

  @ApiProperty({ type: [Object] })
  historicalData: Array<{
    date: Date;
    actualCost: number;
  }>;

  @ApiProperty({ type: [Object] })
  forecastData: Array<{
    date: Date;
    predictedCost: number;
    lowerBound: number;
    upperBound: number;
  }>;
}

export class BudgetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  budgetType: string;

  @ApiProperty()
  budgetKey: string;

  @ApiProperty()
  budgetName: string;

  @ApiProperty({ enum: CostPeriod })
  period: CostPeriod;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currentSpend: number;

  @ApiProperty()
  remainingBudget: number;

  @ApiProperty()
  spendPercent: number;

  @ApiProperty()
  status: 'on-track' | 'warning' | 'critical' | 'exceeded';

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  startDate: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiPropertyOptional()
  daysRemaining?: number;

  @ApiProperty()
  warningThreshold: number;

  @ApiProperty()
  criticalThreshold: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CostAlertResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  alertType: string;

  @ApiProperty({ enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currentValue: number;

  @ApiProperty()
  thresholdValue: number;

  @ApiProperty()
  variance: number;

  @ApiProperty()
  variancePercent: number;

  @ApiPropertyOptional()
  serviceName?: string;

  @ApiPropertyOptional()
  namespace?: string;

  @ApiPropertyOptional()
  team?: string;

  @ApiPropertyOptional()
  budgetId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  acknowledgedAt?: Date;

  @ApiPropertyOptional()
  resolvedAt?: Date;
}

export class OptimizationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: CostCategory })
  category: CostCategory;

  @ApiProperty()
  potentialSavings: number;

  @ApiProperty()
  savingsPercent: number;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  action: string;

  @ApiProperty()
  actionDetails: Record<string, any>;

  @ApiPropertyOptional({ enum: ResourceType })
  resourceType?: ResourceType;

  @ApiPropertyOptional()
  resourceName?: string;

  @ApiPropertyOptional()
  serviceName?: string;

  @ApiPropertyOptional()
  namespace?: string;

  @ApiProperty()
  isImplemented: boolean;

  @ApiProperty()
  isDismissed: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class CostSummaryResponseDto {
  @ApiProperty()
  currentMonth: {
    totalCost: number;
    budgetAmount: number;
    budgetVariance: number;
    spendPercent: number;
    daysRemaining: number;
  };

  @ApiProperty()
  yearToDate: {
    totalCost: number;
    averageMonthly: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };

  @ApiProperty()
  topServices: CostByServiceResponseDto[];

  @ApiProperty()
  activeAlerts: {
    critical: number;
    warning: number;
    info: number;
  };

  @ApiProperty()
  optimizations: {
    totalPotentialSavings: number;
    recommendationsCount: number;
  };
}
