import { ResourceType, CostPeriod, CostCategory } from '@prisma/client';

export interface KubernetesMetrics {
  namespace: string;
  podName: string;
  containerName: string;
  cpu: {
    usage: number; // cores
    request: number;
    limit: number;
    utilizationPercent: number;
  };
  memory: {
    usage: number; // bytes
    request: number;
    limit: number;
    utilizationPercent: number;
  };
  storage?: {
    usage: number; // bytes
    capacity: number;
  };
}

export interface DatabaseMetrics {
  instanceId: string;
  instanceName: string;
  storage: {
    used: number; // bytes
    allocated: number;
  };
  iops: {
    read: number;
    write: number;
    total: number;
  };
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    avgDuration: number; // ms
    slowQueries: number;
  };
}

export interface APIGatewayMetrics {
  serviceName: string;
  requests: {
    total: number;
    success: number;
    error: number;
  };
  bandwidth: {
    ingress: number; // bytes
    egress: number; // bytes
  };
  latency: {
    avg: number; // ms
    p95: number;
    p99: number;
  };
}

export interface CostCalculation {
  resourceType: ResourceType;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  period: CostPeriod;
  metadata?: Record<string, any>;
}

export interface CostBreakdown {
  period: CostPeriod;
  periodStart: Date;
  periodEnd: Date;
  totalCost: number;
  byCategory: Record<CostCategory, number>;
  byService: Record<string, number>;
  byResourceType: Record<ResourceType, number>;
  topCostDrivers: CostDriver[];
}

export interface CostDriver {
  resourceType: ResourceType;
  resourceName: string;
  serviceName?: string;
  cost: number;
  costPercent: number;
}

export interface CostTrend {
  period: CostPeriod;
  data: Array<{
    timestamp: Date;
    cost: number;
    forecastedCost?: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
}

export interface BudgetStatus {
  budgetId: string;
  budgetName: string;
  amount: number;
  currentSpend: number;
  remainingBudget: number;
  spendPercent: number;
  status: 'on-track' | 'warning' | 'critical' | 'exceeded';
  daysRemaining?: number;
}

export interface CostForecastResult {
  forecastDate: Date;
  period: CostPeriod;
  predictedCost: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  method: string;
  historicalData: Array<{
    date: Date;
    actualCost: number;
  }>;
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  category: CostCategory;
  potentialSavings: number;
  savingsPercent: number;
  priority: number;
  action: string;
  actionDetails: Record<string, any>;
  resourceType?: ResourceType;
  resourceName?: string;
  serviceName?: string;
}

export interface CostAllocationByService {
  serviceName: string;
  namespace?: string;
  totalCost: number;
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
  costPercent: number;
  budgetAmount?: number;
  budgetVariance?: number;
}

export interface CostAllocationByTeam {
  team: string;
  totalCost: number;
  services: string[];
  breakdown: Record<CostCategory, number>;
  costPercent: number;
  budgetAmount?: number;
  budgetVariance?: number;
}

export interface CostAlert {
  id: string;
  title: string;
  description: string;
  alertType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  currentValue: number;
  thresholdValue: number;
  variance: number;
  variancePercent: number;
  serviceName?: string;
  namespace?: string;
  team?: string;
  createdAt: Date;
}

export interface PricingModel {
  provider: string;
  region: string;
  resourceType: ResourceType;
  unitPrice: number;
  unit: string;
  effectiveDate: Date;
}
