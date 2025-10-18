import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CostPeriod } from '@prisma/client';
import { CostTrackingService } from '../services/cost-tracking.service';
import {
  CostQueryDto,
  CreateBudgetDto,
  UpdateBudgetDto,
  ForecastQueryDto,
  OptimizationQueryDto,
} from '../dto/cost-query.dto';
import {
  CurrentCostsResponseDto,
  CostTrendResponseDto,
  CostByServiceResponseDto,
  CostForecastResponseDto,
  BudgetResponseDto,
  CostAlertResponseDto,
  OptimizationResponseDto,
  CostSummaryResponseDto,
} from '../dto/cost-response.dto';

@ApiTags('Cost Tracking')
@Controller('costs')
export class CostTrackingController {
  constructor(private readonly costTrackingService: CostTrackingService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current period costs' })
  @ApiQuery({ name: 'period', enum: CostPeriod, required: false })
  @ApiResponse({ status: 200, type: CurrentCostsResponseDto })
  async getCurrentCosts(
    @Query('period') period?: CostPeriod,
  ): Promise<CurrentCostsResponseDto> {
    const costs = await this.costTrackingService.getCurrentCosts(
      period || CostPeriod.MONTHLY,
    );

    return {
      period: costs.period,
      periodStart: costs.periodStart,
      periodEnd: costs.periodEnd,
      totalCost: costs.totalCost,
      currency: 'USD',
      byCategory: costs.byCategory,
      byService: costs.byService,
      byResourceType: costs.byResourceType,
      topCostDrivers: costs.topCostDrivers,
    };
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get historical cost trends' })
  @ApiQuery({ name: 'period', enum: CostPeriod, required: false })
  @ApiQuery({ name: 'days', type: Number, required: false })
  @ApiResponse({ status: 200, type: CostTrendResponseDto })
  async getCostTrend(
    @Query('period') period?: CostPeriod,
    @Query('days') days?: number,
  ): Promise<CostTrendResponseDto> {
    const trend = await this.costTrackingService.getCostTrend(
      period || CostPeriod.DAILY,
      days || 30,
    );

    const totalCost = trend.data.reduce((sum, d) => sum + d.cost, 0);
    const averageCost = totalCost / trend.data.length;

    return {
      period: trend.period,
      data: trend.data,
      trend: trend.trend,
      changePercent: trend.changePercent,
      totalCost,
      averageCost,
    };
  }

  @Get('by-service')
  @ApiOperation({ summary: 'Get cost breakdown by service' })
  @ApiQuery({ name: 'period', enum: CostPeriod, required: false })
  @ApiResponse({ status: 200, type: [CostByServiceResponseDto] })
  async getCostByService(
    @Query('period') period?: CostPeriod,
  ): Promise<CostByServiceResponseDto[]> {
    const costs = await this.costTrackingService.getCostByService(
      period || CostPeriod.MONTHLY,
    );

    return costs.map(cost => ({
      serviceName: cost.serviceName,
      namespace: cost.namespace,
      totalCost: cost.totalCost,
      breakdown: cost.breakdown,
      costPercent: cost.costPercent,
      budgetAmount: cost.budgetAmount,
      budgetVariance: cost.budgetVariance,
      budgetStatus: this.getBudgetStatus(cost.budgetVariance, cost.budgetAmount),
    }));
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Get cost forecast' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  @ApiQuery({ name: 'period', enum: CostPeriod, required: false })
  @ApiResponse({ status: 200, type: CostForecastResponseDto })
  async getCostForecast(
    @Query('days') days?: number,
  ): Promise<CostForecastResponseDto> {
    const forecast = await this.costTrackingService.getCostForecast(days || 30);

    // Generate forecast data points
    const forecastData = [];
    const startDate = new Date();
    const daysCount = days || 30;
    const dailyAvg = forecast.predictedCost / daysCount;

    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      forecastData.push({
        date,
        predictedCost: dailyAvg,
        lowerBound: (forecast.lowerBound / daysCount),
        upperBound: (forecast.upperBound / daysCount),
      });
    }

    return {
      forecastDate: forecast.forecastDate,
      period: forecast.period,
      predictedCost: forecast.predictedCost,
      lowerBound: forecast.lowerBound,
      upperBound: forecast.upperBound,
      confidence: forecast.confidence,
      method: forecast.method,
      historicalData: forecast.historicalData,
      forecastData,
    };
  }

  @Post('budgets')
  @ApiOperation({ summary: 'Create a cost budget' })
  @ApiResponse({ status: 201, type: BudgetResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async createBudget(@Body() createBudgetDto: CreateBudgetDto): Promise<BudgetResponseDto> {
    // Implementation would create budget in database
    // For now, returning a placeholder
    return {
      id: 'budget-id',
      name: createBudgetDto.name,
      description: createBudgetDto.description,
      budgetType: createBudgetDto.budgetType,
      budgetKey: createBudgetDto.budgetKey,
      budgetName: createBudgetDto.budgetName,
      period: createBudgetDto.period,
      amount: createBudgetDto.amount,
      currency: 'USD',
      currentSpend: 0,
      remainingBudget: createBudgetDto.amount,
      spendPercent: 0,
      status: 'on-track',
      isActive: true,
      startDate: new Date(createBudgetDto.startDate),
      endDate: createBudgetDto.endDate ? new Date(createBudgetDto.endDate) : undefined,
      warningThreshold: createBudgetDto.warningThreshold || 80,
      criticalThreshold: createBudgetDto.criticalThreshold || 95,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Get all budgets' })
  @ApiResponse({ status: 200, type: [BudgetResponseDto] })
  async getBudgets(): Promise<BudgetResponseDto[]> {
    // Implementation would fetch from database
    return [];
  }

  @Get('budgets/:id')
  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiResponse({ status: 200, type: BudgetResponseDto })
  async getBudget(@Param('id') id: string): Promise<BudgetResponseDto> {
    const status = await this.costTrackingService.getBudgetStatus(id);

    return {
      id: status.budgetId,
      name: status.budgetName,
      description: '',
      budgetType: '',
      budgetKey: '',
      budgetName: status.budgetName,
      period: CostPeriod.MONTHLY,
      amount: status.amount,
      currency: 'USD',
      currentSpend: status.currentSpend,
      remainingBudget: status.remainingBudget,
      spendPercent: status.spendPercent,
      status: status.status,
      isActive: true,
      startDate: new Date(),
      warningThreshold: 80,
      criticalThreshold: 95,
      createdAt: new Date(),
      updatedAt: new Date(),
      daysRemaining: status.daysRemaining,
    };
  }

  @Put('budgets/:id')
  @ApiOperation({ summary: 'Update budget' })
  @ApiResponse({ status: 200, type: BudgetResponseDto })
  async updateBudget(
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    // Implementation would update database
    return this.getBudget(id);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get cost alerts' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiResponse({ status: 200, type: [CostAlertResponseDto] })
  async getAlerts(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ): Promise<CostAlertResponseDto[]> {
    const alerts = await this.costTrackingService.getActiveAlerts();

    return alerts.map(alert => ({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      alertType: alert.alertType,
      severity: alert.severity,
      status: alert.status,
      currentValue: alert.currentValue,
      thresholdValue: alert.thresholdValue,
      variance: alert.variance,
      variancePercent: alert.variancePercent,
      serviceName: alert.serviceName || undefined,
      namespace: alert.namespace || undefined,
      team: alert.team || undefined,
      budgetId: alert.budgetId || undefined,
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      resolvedAt: alert.resolvedAt || undefined,
    }));
  }

  @Get('optimizations')
  @ApiOperation({ summary: 'Get cost optimization recommendations' })
  @ApiResponse({ status: 200, type: [OptimizationResponseDto] })
  async getOptimizations(
    @Query() query: OptimizationQueryDto,
  ): Promise<OptimizationResponseDto[]> {
    const recommendations = await this.costTrackingService.getOptimizationRecommendations();

    return recommendations.map(rec => ({
      id: rec.id,
      title: rec.title,
      description: rec.description,
      category: rec.category,
      potentialSavings: rec.potentialSavings,
      savingsPercent: rec.savingsPercent,
      priority: rec.priority,
      action: rec.action,
      actionDetails: rec.actionDetails,
      resourceType: rec.resourceType,
      resourceName: rec.resourceName,
      serviceName: rec.serviceName,
      isImplemented: false,
      isDismissed: false,
      createdAt: new Date(),
    }));
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get cost summary dashboard' })
  @ApiResponse({ status: 200, type: CostSummaryResponseDto })
  async getCostSummary(): Promise<CostSummaryResponseDto> {
    const currentMonth = await this.costTrackingService.getCurrentCosts(CostPeriod.MONTHLY);
    const topServices = await this.costTrackingService.getCostByService(CostPeriod.MONTHLY);
    const alerts = await this.costTrackingService.getActiveAlerts();
    const optimizations = await this.costTrackingService.getOptimizationRecommendations();

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();

    return {
      currentMonth: {
        totalCost: currentMonth.totalCost,
        budgetAmount: 10000, // Placeholder
        budgetVariance: currentMonth.totalCost - 10000,
        spendPercent: (currentMonth.totalCost / 10000) * 100,
        daysRemaining,
      },
      yearToDate: {
        totalCost: currentMonth.totalCost * now.getMonth(),
        averageMonthly: currentMonth.totalCost,
        trend: 'stable',
      },
      topServices: topServices.slice(0, 5).map(s => ({
        ...s,
        budgetStatus: this.getBudgetStatus(s.budgetVariance, s.budgetAmount),
      })),
      activeAlerts: {
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        warning: alerts.filter(a => a.severity === 'WARNING').length,
        info: alerts.filter(a => a.severity === 'INFO').length,
      },
      optimizations: {
        totalPotentialSavings: optimizations.reduce((sum, o) => sum + o.potentialSavings, 0),
        recommendationsCount: optimizations.length,
      },
    };
  }

  private getBudgetStatus(
    variance?: number,
    budgetAmount?: number,
  ): 'on-track' | 'warning' | 'critical' | 'exceeded' | undefined {
    if (variance === undefined || budgetAmount === undefined) {
      return undefined;
    }

    const spendPercent = ((budgetAmount - variance) / budgetAmount) * 100;

    if (spendPercent >= 100) return 'exceeded';
    if (spendPercent >= 95) return 'critical';
    if (spendPercent >= 80) return 'warning';
    return 'on-track';
  }
}
