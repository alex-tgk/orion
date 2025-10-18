import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResourceType, CostPeriod, CostCategory } from '@prisma/client';
import { CostCalculation } from '../interfaces/cost-tracking.interface';
import { CloudProviderPricing } from '../config/cost-tracking.config';

@Injectable()
export class CostCalculatorService {
  private readonly logger = new Logger(CostCalculatorService.name);
  private readonly providers: CloudProviderPricing[];

  constructor(private readonly configService: ConfigService) {
    this.providers = this.configService.get<CloudProviderPricing[]>('costTracking.providers') || [];
  }

  /**
   * Calculate cost for a given resource usage
   */
  async calculateCost(params: {
    resourceType: ResourceType;
    quantity: number;
    unit: string;
    period: CostPeriod;
    provider?: string;
  }): Promise<CostCalculation> {
    const provider = this.providers.find(p => p.provider === (params.provider || 'on-premise'));

    if (!provider) {
      throw new Error(`Provider ${params.provider} not found`);
    }

    let unitPrice = 0;
    let normalizedQuantity = params.quantity;

    // Calculate unit price based on resource type
    switch (params.resourceType) {
      case ResourceType.KUBERNETES_CPU:
        unitPrice = provider.pricing.cpu.perCore;
        normalizedQuantity = this.normalizeToPeriod(params.quantity, params.period, 'hourly');
        break;

      case ResourceType.KUBERNETES_MEMORY:
        unitPrice = provider.pricing.memory.perGb;
        normalizedQuantity = this.normalizeToPeriod(params.quantity, params.period, 'hourly');
        break;

      case ResourceType.KUBERNETES_STORAGE:
      case ResourceType.DATABASE_STORAGE:
      case ResourceType.OBJECT_STORAGE:
      case ResourceType.LOGS_STORAGE:
      case ResourceType.METRICS_STORAGE:
      case ResourceType.BACKUP_STORAGE:
        unitPrice = provider.pricing.storage.perGb;
        normalizedQuantity = this.normalizeToPeriod(params.quantity, params.period, 'monthly');
        break;

      case ResourceType.DATABASE_IOPS:
        unitPrice = provider.pricing.database.iops;
        normalizedQuantity = this.normalizeToPeriod(params.quantity, params.period, 'monthly');
        break;

      case ResourceType.DATABASE_CONNECTIONS:
        unitPrice = provider.pricing.database.connections;
        normalizedQuantity = this.normalizeToPeriod(params.quantity, params.period, 'hourly');
        break;

      case ResourceType.API_GATEWAY_REQUESTS:
        unitPrice = provider.pricing.apiGateway.requests / 1000000; // Per request
        normalizedQuantity = params.quantity;
        break;

      case ResourceType.API_GATEWAY_BANDWIDTH:
      case ResourceType.EGRESS_BANDWIDTH:
        unitPrice = provider.pricing.network.egress;
        normalizedQuantity = params.quantity;
        break;

      case ResourceType.INGRESS_BANDWIDTH:
        unitPrice = provider.pricing.network.ingress;
        normalizedQuantity = params.quantity;
        break;

      case ResourceType.LOAD_BALANCER:
        unitPrice = provider.pricing.network.loadBalancer;
        normalizedQuantity = this.normalizeToPeriod(1, params.period, 'hourly'); // Per hour
        break;

      case ResourceType.BUILD_MINUTES:
        unitPrice = provider.pricing.cicd.buildMinutes;
        normalizedQuantity = params.quantity; // Already in minutes
        break;

      default:
        this.logger.warn(`Unknown resource type: ${params.resourceType}`);
        unitPrice = 0;
    }

    const totalCost = normalizedQuantity * unitPrice;

    return {
      resourceType: params.resourceType,
      quantity: normalizedQuantity,
      unit: params.unit,
      unitPrice,
      totalCost,
      period: params.period,
    };
  }

  /**
   * Get cost category for a resource type
   */
  getCategoryForResourceType(resourceType: ResourceType): CostCategory {
    const categoryMap: Record<ResourceType, CostCategory> = {
      [ResourceType.KUBERNETES_CPU]: CostCategory.COMPUTE,
      [ResourceType.KUBERNETES_MEMORY]: CostCategory.COMPUTE,
      [ResourceType.KUBERNETES_STORAGE]: CostCategory.STORAGE,
      [ResourceType.DATABASE_STORAGE]: CostCategory.DATABASE,
      [ResourceType.DATABASE_IOPS]: CostCategory.DATABASE,
      [ResourceType.DATABASE_CONNECTIONS]: CostCategory.DATABASE,
      [ResourceType.API_GATEWAY_REQUESTS]: CostCategory.NETWORK,
      [ResourceType.API_GATEWAY_BANDWIDTH]: CostCategory.NETWORK,
      [ResourceType.EXTERNAL_API_CALLS]: CostCategory.EXTERNAL_SERVICES,
      [ResourceType.BUILD_MINUTES]: CostCategory.CI_CD,
      [ResourceType.OBJECT_STORAGE]: CostCategory.STORAGE,
      [ResourceType.CDN_BANDWIDTH]: CostCategory.NETWORK,
      [ResourceType.LOGS_STORAGE]: CostCategory.LOGGING,
      [ResourceType.METRICS_STORAGE]: CostCategory.MONITORING,
      [ResourceType.BACKUP_STORAGE]: CostCategory.STORAGE,
      [ResourceType.EGRESS_BANDWIDTH]: CostCategory.NETWORK,
      [ResourceType.INGRESS_BANDWIDTH]: CostCategory.NETWORK,
      [ResourceType.LOAD_BALANCER]: CostCategory.NETWORK,
      [ResourceType.IP_ADDRESS]: CostCategory.NETWORK,
      [ResourceType.DNS_QUERIES]: CostCategory.NETWORK,
    };

    return categoryMap[resourceType] || CostCategory.OTHER;
  }

  /**
   * Normalize quantity to the specified period
   */
  private normalizeToPeriod(
    quantity: number,
    targetPeriod: CostPeriod,
    basePeriod: 'hourly' | 'monthly',
  ): number {
    const hoursInPeriod: Record<CostPeriod, number> = {
      [CostPeriod.HOURLY]: 1,
      [CostPeriod.DAILY]: 24,
      [CostPeriod.WEEKLY]: 24 * 7,
      [CostPeriod.MONTHLY]: 24 * 30,
      [CostPeriod.YEARLY]: 24 * 365,
    };

    if (basePeriod === 'hourly') {
      return quantity * hoursInPeriod[targetPeriod];
    } else {
      // Monthly base
      const monthsInPeriod: Record<CostPeriod, number> = {
        [CostPeriod.HOURLY]: 1 / (30 * 24),
        [CostPeriod.DAILY]: 1 / 30,
        [CostPeriod.WEEKLY]: 7 / 30,
        [CostPeriod.MONTHLY]: 1,
        [CostPeriod.YEARLY]: 12,
      };
      return quantity * monthsInPeriod[targetPeriod];
    }
  }

  /**
   * Calculate cost savings from optimization
   */
  calculateSavings(params: {
    currentCost: number;
    optimizedCost: number;
  }): { savings: number; savingsPercent: number } {
    const savings = params.currentCost - params.optimizedCost;
    const savingsPercent = params.currentCost > 0 ? (savings / params.currentCost) * 100 : 0;

    return { savings, savingsPercent };
  }
}
