import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IVectorProvider } from '../interfaces/vector-provider.interface';
import { VectorHealthResponseDto } from '../dto/vector-response.dto';

/**
 * Health Service
 * Monitors the health and status of the vector database service
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime: number;

  constructor(
    private readonly vectorProvider: IVectorProvider,
    private readonly configService: ConfigService,
  ) {
    this.startTime = Date.now();
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<VectorHealthResponseDto> {
    try {
      const isConnected = await this.vectorProvider.isHealthy();

      let collectionCount: number | undefined;
      let totalVectors: number | undefined;

      if (isConnected) {
        try {
          const collections = await this.vectorProvider.listCollections();
          collectionCount = collections.length;
          totalVectors = await this.vectorProvider.getTotalVectorCount();
        } catch (error) {
          this.logger.warn(
            'Failed to fetch collection stats during health check',
            error,
          );
        }
      }

      const status = this.determineHealthStatus(isConnected);
      const provider = this.configService.get<string>(
        'vectorDb.provider',
        'unknown',
      );

      return {
        status,
        provider,
        connected: isConnected,
        collectionCount,
        totalVectors,
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed', error);

      return {
        status: 'unhealthy',
        provider: this.configService.get<string>(
          'vectorDb.provider',
          'unknown',
        ),
        connected: false,
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get service uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(
    connected: boolean,
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (!connected) {
      return 'unhealthy';
    }

    // Could add more sophisticated checks here
    // e.g., check query latency, error rates, etc.

    return 'healthy';
  }
}
