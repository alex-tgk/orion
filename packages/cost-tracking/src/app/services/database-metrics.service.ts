import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseMetrics } from '../interfaces/cost-tracking.interface';

@Injectable()
export class DatabaseMetricsService {
  private readonly logger = new Logger(DatabaseMetricsService.name);
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get database metrics including storage, connections, and IOPS
   */
  async getMetrics(): Promise<DatabaseMetrics[]> {
    try {
      const metrics: DatabaseMetrics[] = [];

      // Get database size
      const sizeResult = await this.prisma.$queryRaw<Array<{ database: string; size: bigint }>>`
        SELECT
          datname as database,
          pg_database_size(datname) as size
        FROM pg_database
        WHERE datname NOT IN ('template0', 'template1', 'postgres')
      `;

      // Get connection statistics
      const connectionStats = await this.prisma.$queryRaw<Array<{
        database: string;
        active: number;
        idle: number;
        total: number;
      }>>`
        SELECT
          datname as database,
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          COUNT(*) as total
        FROM pg_stat_activity
        WHERE datname IS NOT NULL
        GROUP BY datname
      `;

      // Get table I/O statistics (approximation for IOPS)
      const ioStats = await this.prisma.$queryRaw<Array<{
        database: string;
        reads: bigint;
        writes: bigint;
      }>>`
        SELECT
          current_database() as database,
          SUM(heap_blks_read + idx_blks_read) as reads,
          SUM(heap_blks_hit + idx_blks_hit) as writes
        FROM pg_statio_user_tables
      `;

      // Get slow query statistics
      const slowQueries = await this.prisma.$queryRaw<Array<{
        database: string;
        avg_duration: number;
        slow_count: number;
      }>>`
        SELECT
          current_database() as database,
          AVG(mean_exec_time) as avg_duration,
          COUNT(*) FILTER (WHERE mean_exec_time > 1000) as slow_count
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
      `;

      // Combine metrics
      for (const db of sizeResult) {
        const connections = connectionStats.find(c => c.database === db.database) || {
          active: 0,
          idle: 0,
          total: 0,
        };

        const io = ioStats.find(i => i.database === db.database) || {
          reads: BigInt(0),
          writes: BigInt(0),
        };

        const queries = slowQueries.find(q => q.database === db.database) || {
          avg_duration: 0,
          slow_count: 0,
        };

        metrics.push({
          instanceId: db.database,
          instanceName: db.database,
          storage: {
            used: Number(db.size),
            allocated: Number(db.size) * 1.2, // Assume 20% overhead
          },
          iops: {
            read: Number(io.reads),
            write: Number(io.writes),
            total: Number(io.reads) + Number(io.writes),
          },
          connections: {
            active: Number(connections.active),
            idle: Number(connections.idle),
            total: Number(connections.total),
          },
          queries: {
            avgDuration: Number(queries.avg_duration),
            slowQueries: Number(queries.slow_count),
          },
        });
      }

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get database metrics', error);
      return [];
    }
  }

  /**
   * Get query cost analysis
   */
  async analyzeQueryCost(query: string): Promise<any> {
    try {
      const explainResult = await this.prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      return explainResult;
    } catch (error) {
      this.logger.error('Failed to analyze query cost', error);
      return null;
    }
  }

  /**
   * Get table sizes
   */
  async getTableSizes(): Promise<Array<{ table: string; size: number }>> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ table: string; size: bigint }>>`
        SELECT
          tablename as table,
          pg_total_relation_size(schemaname||'.'||tablename) as size
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY size DESC
        LIMIT 20
      `;

      return result.map(r => ({
        table: r.table,
        size: Number(r.size),
      }));
    } catch (error) {
      this.logger.error('Failed to get table sizes', error);
      return [];
    }
  }
}
