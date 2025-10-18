import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { ISearchProvider } from '../providers/search-provider.interface';
import { VectorSearchService } from './vector-search.service';
import { SearchConfiguration } from '../config/search.config';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: boolean;
    searchProvider: boolean;
    vectorDb: boolean | null;
  };
  stats?: {
    totalIndexed: number;
    totalQueries: number;
    vectorDbEnabled: boolean;
  };
}

/**
 * Health check service for Search Service
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly config: SearchConfiguration;
  private prisma: PrismaClient;

  constructor(
    @Inject('SEARCH_PROVIDER') private searchProvider: ISearchProvider,
    private configService: ConfigService,
    private vectorSearchService: VectorSearchService,
  ) {
    this.config = this.configService.get<SearchConfiguration>('search');
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.config.databaseUrl,
        },
      },
    });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Comprehensive health check
   */
  async getHealth(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      searchProvider: await this.checkSearchProvider(),
      vectorDb: await this.checkVectorDb(),
    };

    // Determine overall status
    let status: 'ok' | 'degraded' | 'down' = 'ok';
    if (!checks.database || !checks.searchProvider) {
      status = 'down';
    } else if (this.config.enableSemanticSearch && !checks.vectorDb) {
      status = 'degraded';
    }

    // Get service stats
    const stats = await this.getStats();

    return {
      status,
      service: 'search',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
      stats,
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check search provider health
   */
  private async checkSearchProvider(): Promise<boolean> {
    try {
      return await this.searchProvider.healthCheck();
    } catch (error) {
      this.logger.error(`Search provider health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check Vector DB connectivity
   */
  private async checkVectorDb(): Promise<boolean | null> {
    if (!this.config.enableSemanticSearch) {
      return null;
    }

    try {
      return await this.vectorSearchService.healthCheck();
    } catch (error) {
      this.logger.warn(`Vector DB health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  private async getStats(): Promise<HealthStatus['stats']> {
    try {
      const [totalIndexed, totalQueries] = await Promise.all([
        this.prisma.searchIndex.count(),
        this.prisma.searchQuery.count(),
      ]);

      return {
        totalIndexed,
        totalQueries,
        vectorDbEnabled: this.config.enableSemanticSearch,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      return {
        totalIndexed: 0,
        totalQueries: 0,
        vectorDbEnabled: this.config.enableSemanticSearch,
      };
    }
  }
}
