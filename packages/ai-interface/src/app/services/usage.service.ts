import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  UsageQueryDto,
  UsageResponseDto,
  UsageByProviderDto,
  UsageByModelDto,
} from '../dto';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsage(
    userId: string,
    query: UsageQueryDto,
  ): Promise<UsageResponseDto> {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    this.logger.log(
      `Getting usage for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Get all requests in the time period
    const requests = await this.prisma.aIRequest.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'completed',
      },
    });

    // Calculate totals
    const totalRequests = requests.length;
    const totalTokens = requests.reduce(
      (sum, req) => sum + req.totalTokens,
      0,
    );
    const totalCost = requests.reduce(
      (sum, req) => sum + Number(req.cost),
      0,
    );
    const cachedResponses = requests.filter((req) => req.cached).length;
    const cacheHitRate =
      totalRequests > 0 ? (cachedResponses / totalRequests) * 100 : 0;

    // Group by provider
    const providerMap = new Map<string, UsageByProviderDto>();
    requests.forEach((req) => {
      const existing = providerMap.get(req.provider) || {
        provider: req.provider,
        requestCount: 0,
        totalTokens: 0,
        totalCost: 0,
      };

      providerMap.set(req.provider, {
        provider: req.provider,
        requestCount: existing.requestCount + 1,
        totalTokens: existing.totalTokens + req.totalTokens,
        totalCost: existing.totalCost + Number(req.cost),
      });
    });

    // Group by model
    const modelMap = new Map<string, UsageByModelDto>();
    requests.forEach((req) => {
      const existing = modelMap.get(req.model) || {
        model: req.model,
        requestCount: 0,
        totalTokens: 0,
        totalCost: 0,
      };

      modelMap.set(req.model, {
        model: req.model,
        requestCount: existing.requestCount + 1,
        totalTokens: existing.totalTokens + req.totalTokens,
        totalCost: existing.totalCost + Number(req.cost),
      });
    });

    return {
      userId,
      totalRequests,
      totalTokens,
      totalCost: parseFloat(totalCost.toFixed(6)),
      cachedResponses,
      cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
      byProvider: Array.from(providerMap.values()),
      byModel: Array.from(modelMap.values()),
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    };
  }

  /**
   * Get recent AI requests for a user
   */
  async getRecentRequests(userId: string, limit = 10) {
    return await this.prisma.aIRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
