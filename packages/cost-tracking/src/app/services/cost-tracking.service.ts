import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient, ResourceType, CostPeriod, CostCategory } from '@prisma/client';
import { KubernetesService } from './kubernetes.service';
import { DatabaseMetricsService } from './database-metrics.service';
import { CostCalculatorService } from './cost-calculator.service';
import {
  CostBreakdown,
  CostTrend,
  BudgetStatus,
  CostAllocationByService,
  CostForecastResult,
  OptimizationRecommendation
} from '../interfaces/cost-tracking.interface';

@Injectable()
export class CostTrackingService implements OnModuleInit {
  private readonly logger = new Logger(CostTrackingService.name);
  private readonly prisma: PrismaClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly kubernetesService: KubernetesService,
    private readonly databaseMetricsService: DatabaseMetricsService,
    private readonly costCalculator: CostCalculatorService,
  ) {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.prisma.$connect();
    this.logger.log('Cost Tracking Service initialized');
  }

  /**
   * Collect and store resource usage metrics
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async collectResourceUsage(): Promise<void> {
    try {
      this.logger.log('Collecting resource usage metrics...');

      // Collect Kubernetes metrics
      if (this.configService.get('costTracking.kubernetes.enabled')) {
        await this.collectKubernetesMetrics();
      }

      // Collect database metrics
      if (this.configService.get('costTracking.database.enabled')) {
        await this.collectDatabaseMetrics();
      }

      this.logger.log('Resource usage metrics collected successfully');
    } catch (error) {
      this.logger.error('Failed to collect resource usage metrics', error);
    }
  }

  /**
   * Calculate and aggregate costs
   */
  @Cron(CronExpression.EVERY_HOUR)
  async calculateCosts(): Promise<void> {
    try {
      this.logger.log('Calculating hourly costs...');

      const now = new Date();
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const hourEnd = new Date(hourStart.getTime() + 3600000);

      // Get resource usage for the hour
      const usageMetrics = await this.prisma.resourceUsage.findMany({
        where: {
          timestamp: {
            gte: hourStart,
            lt: hourEnd,
          },
        },
      });

      // Calculate costs for each resource
      for (const metric of usageMetrics) {
        const cost = await this.costCalculator.calculateCost({
          resourceType: metric.resourceType,
          quantity: metric.usage,
          unit: metric.unit,
          period: CostPeriod.HOURLY,
        });

        await this.prisma.costMetric.create({
          data: {
            timestamp: metric.timestamp,
            period: CostPeriod.HOURLY,
            periodStart: hourStart,
            periodEnd: hourEnd,
            resourceType: metric.resourceType,
            resourceId: metric.resourceId,
            resourceName: metric.resourceName,
            serviceName: metric.serviceName,
            namespace: metric.namespace,
            quantity: metric.usage,
            unit: metric.unit,
            unitPrice: cost.unitPrice,
            totalCost: cost.totalCost,
            category: this.costCalculator.getCategoryForResourceType(metric.resourceType),
            tags: metric.tags,
            labels: metric.labels,
          },
        });
      }

      this.logger.log('Hourly costs calculated successfully');
    } catch (error) {
      this.logger.error('Failed to calculate costs', error);
    }
  }

  /**
   * Aggregate costs by service
   */
  @Cron('0 0 * * *') // Daily at midnight
  async aggregateDailyCosts(): Promise<void> {
    try {
      this.logger.log('Aggregating daily costs...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      // Aggregate by service
      const services = await this.prisma.costMetric.groupBy({
        by: ['serviceName'],
        where: {
          timestamp: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        _sum: {
          totalCost: true,
        },
      });

      for (const service of services) {
        if (!service.serviceName) continue;

        const costs = await this.prisma.costMetric.findMany({
          where: {
            serviceName: service.serviceName,
            timestamp: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        });

        const breakdown = this.calculateCostBreakdown(costs);

        await this.prisma.costAllocation.create({
          data: {
            periodStart: dayStart,
            periodEnd: dayEnd,
            period: CostPeriod.DAILY,
            allocationType: 'service',
            allocationKey: service.serviceName,
            allocationName: service.serviceName,
            computeCost: breakdown.compute,
            storageCost: breakdown.storage,
            networkCost: breakdown.network,
            databaseCost: breakdown.database,
            monitoringCost: breakdown.monitoring,
            loggingCost: breakdown.logging,
            securityCost: breakdown.security,
            cicdCost: breakdown.cicd,
            externalCost: breakdown.external,
            otherCost: breakdown.other,
            totalCost: service._sum.totalCost || 0,
          },
        });
      }

      this.logger.log('Daily costs aggregated successfully');
    } catch (error) {
      this.logger.error('Failed to aggregate daily costs', error);
    }
  }

  /**
   * Check budget alerts
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkBudgetAlerts(): Promise<void> {
    try {
      this.logger.log('Checking budget alerts...');

      const activeBudgets = await this.prisma.costBudget.findMany({
        where: { isActive: true },
      });

      for (const budget of activeBudgets) {
        await this.updateBudgetStatus(budget.id);
        await this.checkBudgetThresholds(budget.id);
      }

      this.logger.log('Budget alerts checked successfully');
    } catch (error) {
      this.logger.error('Failed to check budget alerts', error);
    }
  }

  /**
   * Get current period costs
   */
  async getCurrentCosts(period: CostPeriod = CostPeriod.MONTHLY): Promise<CostBreakdown> {
    const { periodStart, periodEnd } = this.getPeriodDates(period);

    const metrics = await this.prisma.costMetric.findMany({
      where: {
        timestamp: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });

    return this.buildCostBreakdown(metrics, period, periodStart, periodEnd);
  }

  /**
   * Get cost trends
   */
  async getCostTrend(period: CostPeriod = CostPeriod.DAILY, days: number = 30): Promise<CostTrend> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allocations = await this.prisma.costAllocation.findMany({
      where: {
        period,
        periodStart: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { periodStart: 'asc' },
    });

    const data = allocations.map(a => ({
      timestamp: a.periodStart,
      cost: a.totalCost,
    }));

    const trend = this.calculateTrend(data.map(d => d.cost));
    const changePercent = this.calculateChangePercent(data);

    return {
      period,
      data,
      trend,
      changePercent,
    };
  }

  /**
   * Get cost breakdown by service
   */
  async getCostByService(
    period: CostPeriod = CostPeriod.MONTHLY,
  ): Promise<CostAllocationByService[]> {
    const { periodStart, periodEnd } = this.getPeriodDates(period);

    const allocations = await this.prisma.costAllocation.findMany({
      where: {
        allocationType: 'service',
        periodStart: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });

    const totalCost = allocations.reduce((sum, a) => sum + a.totalCost, 0);

    return allocations.map(allocation => ({
      serviceName: allocation.allocationName,
      namespace: undefined,
      totalCost: allocation.totalCost,
      breakdown: {
        compute: allocation.computeCost,
        storage: allocation.storageCost,
        network: allocation.networkCost,
        database: allocation.databaseCost,
        monitoring: allocation.monitoringCost,
        logging: allocation.loggingCost,
        security: allocation.securityCost,
        cicd: allocation.cicdCost,
        external: allocation.externalCost,
        other: allocation.otherCost,
      },
      costPercent: totalCost > 0 ? (allocation.totalCost / totalCost) * 100 : 0,
      budgetAmount: allocation.budgetAmount || undefined,
      budgetVariance: allocation.budgetVariance || undefined,
    }));
  }

  /**
   * Get cost forecast
   */
  async getCostForecast(days: number = 30): Promise<CostForecastResult> {
    // Simple linear regression forecast
    const historicalDays = 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historicalDays);

    const historicalData = await this.prisma.costAllocation.findMany({
      where: {
        period: CostPeriod.DAILY,
        periodStart: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { periodStart: 'asc' },
    });

    const costs = historicalData.map(h => h.totalCost);
    const avgCost = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    const trend = this.calculateLinearRegression(costs);

    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + days);

    const predictedCost = avgCost * days * trend.slope;
    const stdDev = this.calculateStandardDeviation(costs);
    const confidence = 0.95;

    return {
      forecastDate,
      period: CostPeriod.DAILY,
      predictedCost,
      lowerBound: predictedCost - (1.96 * stdDev),
      upperBound: predictedCost + (1.96 * stdDev),
      confidence,
      method: 'linear_regression',
      historicalData: historicalData.map(h => ({
        date: h.periodStart,
        actualCost: h.totalCost,
      })),
    };
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(budgetId: string): Promise<BudgetStatus> {
    const budget = await this.prisma.costBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    let status: 'on-track' | 'warning' | 'critical' | 'exceeded';
    if (budget.spendPercent >= 100) {
      status = 'exceeded';
    } else if (budget.spendPercent >= (budget.criticalThreshold || 95)) {
      status = 'critical';
    } else if (budget.spendPercent >= (budget.warningThreshold || 80)) {
      status = 'warning';
    } else {
      status = 'on-track';
    }

    const now = new Date();
    const daysRemaining = budget.endDate
      ? Math.ceil((budget.endDate.getTime() - now.getTime()) / 86400000)
      : undefined;

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      amount: budget.amount,
      currentSpend: budget.currentSpend,
      remainingBudget: budget.remainingBudget,
      spendPercent: budget.spendPercent,
      status,
      daysRemaining,
    };
  }

  /**
   * Get active cost alerts
   */
  async getActiveAlerts() {
    return this.prisma.costAlert.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    const recommendations = await this.prisma.costOptimization.findMany({
      where: {
        isImplemented: false,
        isDismissed: false,
      },
      orderBy: {
        potentialSavings: 'desc',
      },
    });

    return recommendations.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      potentialSavings: r.potentialSavings,
      savingsPercent: r.savingsPercent,
      priority: r.priority,
      action: r.action,
      actionDetails: r.actionDetails as Record<string, any>,
      resourceType: r.resourceType || undefined,
      resourceName: r.resourceName || undefined,
      serviceName: r.serviceName || undefined,
    }));
  }

  // Private helper methods

  private async collectKubernetesMetrics(): Promise<void> {
    const metrics = await this.kubernetesService.getMetrics();

    for (const metric of metrics) {
      // Store CPU usage
      await this.prisma.resourceUsage.create({
        data: {
          timestamp: new Date(),
          resourceType: ResourceType.KUBERNETES_CPU,
          resourceId: `${metric.namespace}/${metric.podName}/${metric.containerName}`,
          resourceName: metric.containerName,
          serviceName: metric.namespace,
          namespace: metric.namespace,
          podName: metric.podName,
          containerName: metric.containerName,
          usage: metric.cpu.usage,
          capacity: metric.cpu.limit,
          requested: metric.cpu.request,
          limit: metric.cpu.limit,
          unit: 'cores',
          utilizationPercent: metric.cpu.utilizationPercent,
        },
      });

      // Store memory usage
      await this.prisma.resourceUsage.create({
        data: {
          timestamp: new Date(),
          resourceType: ResourceType.KUBERNETES_MEMORY,
          resourceId: `${metric.namespace}/${metric.podName}/${metric.containerName}`,
          resourceName: metric.containerName,
          serviceName: metric.namespace,
          namespace: metric.namespace,
          podName: metric.podName,
          containerName: metric.containerName,
          usage: metric.memory.usage / (1024 * 1024 * 1024), // Convert to GB
          capacity: metric.memory.limit / (1024 * 1024 * 1024),
          requested: metric.memory.request / (1024 * 1024 * 1024),
          limit: metric.memory.limit / (1024 * 1024 * 1024),
          unit: 'GB',
          utilizationPercent: metric.memory.utilizationPercent,
        },
      });
    }
  }

  private async collectDatabaseMetrics(): Promise<void> {
    const metrics = await this.databaseMetricsService.getMetrics();

    for (const metric of metrics) {
      await this.prisma.resourceUsage.create({
        data: {
          timestamp: new Date(),
          resourceType: ResourceType.DATABASE_STORAGE,
          resourceId: metric.instanceId,
          resourceName: metric.instanceName,
          usage: metric.storage.used / (1024 * 1024 * 1024), // Convert to GB
          capacity: metric.storage.allocated / (1024 * 1024 * 1024),
          unit: 'GB',
          utilizationPercent: (metric.storage.used / metric.storage.allocated) * 100,
        },
      });
    }
  }

  private calculateCostBreakdown(metrics: any[]): Record<string, number> {
    const breakdown = {
      compute: 0,
      storage: 0,
      network: 0,
      database: 0,
      monitoring: 0,
      logging: 0,
      security: 0,
      cicd: 0,
      external: 0,
      other: 0,
    };

    for (const metric of metrics) {
      const category = this.getCategoryKey(metric.category);
      breakdown[category] += metric.totalCost;
    }

    return breakdown;
  }

  private getCategoryKey(category: CostCategory): string {
    const mapping = {
      [CostCategory.COMPUTE]: 'compute',
      [CostCategory.STORAGE]: 'storage',
      [CostCategory.NETWORK]: 'network',
      [CostCategory.DATABASE]: 'database',
      [CostCategory.MONITORING]: 'monitoring',
      [CostCategory.LOGGING]: 'logging',
      [CostCategory.SECURITY]: 'security',
      [CostCategory.CI_CD]: 'cicd',
      [CostCategory.EXTERNAL_SERVICES]: 'external',
      [CostCategory.OTHER]: 'other',
    };
    return mapping[category] || 'other';
  }

  private buildCostBreakdown(
    metrics: any[],
    period: CostPeriod,
    periodStart: Date,
    periodEnd: Date,
  ): CostBreakdown {
    const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0);

    const byCategory = {} as Record<CostCategory, number>;
    const byService = {} as Record<string, number>;
    const byResourceType = {} as Record<ResourceType, number>;

    for (const metric of metrics) {
      byCategory[metric.category] = (byCategory[metric.category] || 0) + metric.totalCost;
      if (metric.serviceName) {
        byService[metric.serviceName] = (byService[metric.serviceName] || 0) + metric.totalCost;
      }
      byResourceType[metric.resourceType] = (byResourceType[metric.resourceType] || 0) + metric.totalCost;
    }

    const topCostDrivers = Object.entries(byResourceType)
      .map(([resourceType, cost]) => ({
        resourceType: resourceType as ResourceType,
        resourceName: resourceType,
        cost,
        costPercent: (cost / totalCost) * 100,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      period,
      periodStart,
      periodEnd,
      totalCost,
      byCategory,
      byService,
      byResourceType,
      topCostDrivers,
    };
  }

  private getPeriodDates(period: CostPeriod): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    switch (period) {
      case CostPeriod.HOURLY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        periodEnd = new Date(periodStart.getTime() + 3600000);
        break;
      case CostPeriod.DAILY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart.getTime() + 86400000);
        break;
      case CostPeriod.WEEKLY:
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay());
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart.getTime() + 7 * 86400000);
        break;
      case CostPeriod.MONTHLY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case CostPeriod.YEARLY:
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear() + 1, 0, 1);
        break;
    }

    return { periodStart, periodEnd };
  }

  private calculateTrend(costs: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (costs.length < 2) return 'stable';

    const firstHalf = costs.slice(0, Math.floor(costs.length / 2));
    const secondHalf = costs.slice(Math.floor(costs.length / 2));

    const firstAvg = firstHalf.reduce((sum, c) => sum + c, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, c) => sum + c, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 5) return 'increasing';
    if (changePercent < -5) return 'decreasing';
    return 'stable';
  }

  private calculateChangePercent(data: Array<{ timestamp: Date; cost: number }>): number {
    if (data.length < 2) return 0;

    const firstCost = data[0].cost;
    const lastCost = data[data.length - 1].cost;

    return ((lastCost - firstCost) / firstCost) * 100;
  }

  private calculateLinearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  private async updateBudgetStatus(budgetId: string): Promise<void> {
    const budget = await this.prisma.costBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) return;

    const { periodStart, periodEnd } = this.getPeriodDates(budget.period);

    const totalSpend = await this.prisma.costMetric.aggregate({
      where: {
        timestamp: {
          gte: periodStart,
          lt: periodEnd,
        },
        ...(budget.budgetType === 'service' && { serviceName: budget.budgetKey }),
        ...(budget.budgetType === 'team' && { team: budget.budgetKey }),
        ...(budget.budgetType === 'namespace' && { namespace: budget.budgetKey }),
      },
      _sum: {
        totalCost: true,
      },
    });

    const currentSpend = totalSpend._sum.totalCost || 0;
    const remainingBudget = budget.amount - currentSpend;
    const spendPercent = (currentSpend / budget.amount) * 100;

    await this.prisma.costBudget.update({
      where: { id: budgetId },
      data: {
        currentSpend,
        remainingBudget,
        spendPercent,
      },
    });
  }

  private async checkBudgetThresholds(budgetId: string): Promise<void> {
    const budget = await this.prisma.costBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) return;

    const warningThreshold = budget.warningThreshold || 80;
    const criticalThreshold = budget.criticalThreshold || 95;

    // Check for warning threshold
    if (budget.spendPercent >= warningThreshold && budget.spendPercent < criticalThreshold) {
      await this.createBudgetAlert(budget, 'warning', warningThreshold);
    }

    // Check for critical threshold
    if (budget.spendPercent >= criticalThreshold && budget.spendPercent < 100) {
      await this.createBudgetAlert(budget, 'critical', criticalThreshold);
    }

    // Check for budget exceeded
    if (budget.spendPercent >= 100) {
      await this.createBudgetAlert(budget, 'exceeded', 100);
    }
  }

  private async createBudgetAlert(
    budget: any,
    type: 'warning' | 'critical' | 'exceeded',
    threshold: number,
  ): Promise<void> {
    const existingAlert = await this.prisma.costAlert.findFirst({
      where: {
        budgetId: budget.id,
        alertType: `budget_${type}`,
        status: 'ACTIVE',
      },
    });

    if (existingAlert) return; // Alert already exists

    const severityMap = {
      warning: 'WARNING',
      critical: 'CRITICAL',
      exceeded: 'CRITICAL',
    };

    await this.prisma.costAlert.create({
      data: {
        title: `Budget ${type} - ${budget.name}`,
        description: `Budget "${budget.name}" has ${type === 'exceeded' ? 'exceeded' : 'reached'} ${threshold}% threshold. Current spend: $${budget.currentSpend.toFixed(2)} of $${budget.amount.toFixed(2)}`,
        alertType: `budget_${type}`,
        severity: severityMap[type] as any,
        budgetId: budget.id,
        currentValue: budget.currentSpend,
        thresholdValue: (budget.amount * threshold) / 100,
        variance: budget.currentSpend - (budget.amount * threshold) / 100,
        variancePercent: budget.spendPercent - threshold,
        notifiedTo: budget.notificationEmails || [],
      },
    });
  }
}
