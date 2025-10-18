import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheStatsDto } from '../dto';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<CacheStatsDto> {
    try {
      const [localStats, redisInfo, keyCount] = await Promise.all([
        this.cacheService.getStats(),
        this.cacheService.getRedisInfo(),
        this.cacheService.getKeyCount(),
      ]);

      const hits = localStats.hits;
      const misses = localStats.misses;
      const totalRequests = hits + misses;
      const hitRatio = totalRequests > 0 ? hits / totalRequests : 0;

      // Extract memory usage from Redis info
      const memorySection = redisInfo?.memory || {};
      const memoryUsage = parseInt(memorySection.used_memory || '0', 10);
      const memoryUsageFormatted = this.formatBytes(memoryUsage);

      // Extract server info
      const serverSection = redisInfo?.server || {};
      const uptime = parseInt(serverSection.uptime_in_seconds || '0', 10);

      // Extract clients info
      const clientsSection = redisInfo?.clients || {};
      const connectedClients = parseInt(
        clientsSection.connected_clients || '0',
        10,
      );

      // Extract stats info
      const statsSection = redisInfo?.stats || {};
      const totalCommands = parseInt(
        statsSection.total_commands_processed || '0',
        10,
      );

      return {
        totalKeys: keyCount,
        hits,
        misses,
        hitRatio: parseFloat(hitRatio.toFixed(3)),
        memoryUsage,
        memoryUsageFormatted,
        uptime,
        connectedClients,
        totalCommands,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get cache statistics:', error);
      throw error;
    }
  }

  /**
   * Get statistics for a specific namespace
   */
  async getNamespaceStats(namespace: string): Promise<Partial<CacheStatsDto>> {
    try {
      const keyCount = await this.cacheService.getKeyCount(namespace);

      return {
        totalKeys: keyCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stats for namespace ${namespace}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);

    // Format with 2 decimal places, but remove trailing zeros
    return `${value.toFixed(2).replace(/\.?0+$/, '')} ${sizes[i]}`;
  }

  /**
   * Reset local statistics
   */
  resetStats(): void {
    this.cacheService.resetStats();
    this.logger.log('Statistics reset');
  }
}
