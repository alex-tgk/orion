/**
 * Database Profiler
 *
 * Profiles database query performance and identifies slow queries
 */

export interface DatabaseProfileConfig {
  enabled: boolean;
  slowQueryThreshold: number; // ms
  trackQueryPlans: boolean;
}

export interface DatabaseMetrics {
  queryStats: {
    total: number;
    slow: number;
    p50: number;
    p95: number;
    p99: number;
  };
  connectionPool: {
    active: number;
    idle: number;
    waiting: number;
    utilization: number; // percentage
  };
  slowQueries: SlowQuery[];
  indexUsage: IndexStats[];
}

export interface SlowQuery {
  query: string;
  duration: number;
  executionCount: number;
  avgDuration: number;
  location: string;
  queryPlan?: QueryPlan;
}

export interface QueryPlan {
  type: 'seq_scan' | 'index_scan' | 'bitmap_scan';
  cost: number;
  rows: number;
  suggestions: string[];
}

export interface IndexStats {
  table: string;
  index: string;
  used: boolean;
  scans: number;
  efficiency: number;
}

export class DatabaseProfiler {
  private config: DatabaseProfileConfig;
  private queryLog: Array<{ query: string; duration: number; timestamp: number }> = [];

  constructor(config: DatabaseProfileConfig) {
    this.config = config;
  }

  /**
   * Profile database performance
   */
  async profile(servicePath: string): Promise<DatabaseMetrics> {
    if (!this.config.enabled) {
      return this.getEmptyMetrics();
    }

    // Collect query statistics
    const queryStats = this.calculateQueryStats();
    const slowQueries = await this.findSlowQueries();
    const connectionPool = await this.getConnectionPoolStats();
    const indexUsage = await this.analyzeIndexUsage();

    return {
      queryStats,
      connectionPool,
      slowQueries,
      indexUsage,
    };
  }

  /**
   * Log a query execution
   */
  logQuery(query: string, duration: number): void {
    this.queryLog.push({
      query,
      duration,
      timestamp: Date.now(),
    });

    // Keep only last 1000 queries
    if (this.queryLog.length > 1000) {
      this.queryLog = this.queryLog.slice(-1000);
    }
  }

  /**
   * Calculate query statistics
   */
  private calculateQueryStats(): DatabaseMetrics['queryStats'] {
    if (this.queryLog.length === 0) {
      return {
        total: 0,
        slow: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = this.queryLog.map(q => q.duration).sort((a, b) => a - b);
    const slowQueries = this.queryLog.filter(q => q.duration > this.config.slowQueryThreshold);

    return {
      total: this.queryLog.length,
      slow: slowQueries.length,
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
    };
  }

  /**
   * Find slow queries
   */
  private async findSlowQueries(): Promise<SlowQuery[]> {
    const slowQueries = this.queryLog.filter(q => q.duration > this.config.slowQueryThreshold);

    // Group by query
    const queryGroups = new Map<string, { durations: number[]; count: number; location: string }>();

    slowQueries.forEach(q => {
      const normalized = this.normalizeQuery(q.query);
      const existing = queryGroups.get(normalized) || { durations: [], count: 0, location: 'unknown' };
      existing.durations.push(q.duration);
      existing.count++;
      queryGroups.set(normalized, existing);
    });

    // Convert to SlowQuery array
    const result: SlowQuery[] = [];
    for (const [query, stats] of queryGroups.entries()) {
      const avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
      const maxDuration = Math.max(...stats.durations);

      const slowQuery: SlowQuery = {
        query,
        duration: maxDuration,
        executionCount: stats.count,
        avgDuration,
        location: stats.location,
      };

      if (this.config.trackQueryPlans) {
        slowQuery.queryPlan = await this.getQueryPlan(query);
      }

      result.push(slowQuery);
    }

    return result.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Get query execution plan
   */
  private async getQueryPlan(query: string): Promise<QueryPlan> {
    // In real implementation, would execute EXPLAIN query
    // For now, return mock data
    return {
      type: 'seq_scan',
      cost: 1250.5,
      rows: 10000,
      suggestions: [
        'Consider adding an index on the WHERE clause column',
        'Query is performing a sequential scan',
      ],
    };
  }

  /**
   * Get connection pool statistics
   */
  private async getConnectionPoolStats(): Promise<DatabaseMetrics['connectionPool']> {
    // In real implementation, would query pool statistics
    return {
      active: 8,
      idle: 12,
      waiting: 0,
      utilization: 40,
    };
  }

  /**
   * Analyze index usage
   */
  private async analyzeIndexUsage(): Promise<IndexStats[]> {
    // In real implementation, would query database index statistics
    return [
      {
        table: 'users',
        index: 'idx_users_email',
        used: true,
        scans: 15230,
        efficiency: 95.5,
      },
      {
        table: 'orders',
        index: 'idx_orders_user_id',
        used: true,
        scans: 8920,
        efficiency: 88.2,
      },
      {
        table: 'products',
        index: 'idx_products_category',
        used: false,
        scans: 0,
        efficiency: 0,
      },
    ];
  }

  /**
   * Detect N+1 query patterns
   */
  async detectNPlusOne(): Promise<Array<{
    pattern: string;
    occurrences: number;
    location: string;
    suggestion: string;
  }>> {
    const patterns = [];

    // Look for repeated similar queries
    const queryPatterns = new Map<string, number>();

    this.queryLog.forEach(q => {
      const pattern = this.normalizeQuery(q.query);
      queryPatterns.set(pattern, (queryPatterns.get(pattern) || 0) + 1);
    });

    for (const [pattern, count] of queryPatterns.entries()) {
      if (count > 10) {
        patterns.push({
          pattern,
          occurrences: count,
          location: 'unknown',
          suggestion: 'Consider using JOIN or eager loading',
        });
      }
    }

    return patterns;
  }

  /**
   * Suggest missing indexes
   */
  async suggestIndexes(): Promise<Array<{
    table: string;
    columns: string[];
    reason: string;
    estimatedImpact: number;
  }>> {
    // In real implementation, would analyze query patterns
    return [
      {
        table: 'orders',
        columns: ['created_at'],
        reason: 'Frequent filtering on created_at column',
        estimatedImpact: 45,
      },
      {
        table: 'users',
        columns: ['last_login'],
        reason: 'Sequential scans on last_login queries',
        estimatedImpact: 32,
      },
    ];
  }

  /**
   * Normalize query for pattern matching
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .trim();
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private getEmptyMetrics(): DatabaseMetrics {
    return {
      queryStats: {
        total: 0,
        slow: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      },
      connectionPool: {
        active: 0,
        idle: 0,
        waiting: 0,
        utilization: 0,
      },
      slowQueries: [],
      indexUsage: [],
    };
  }
}
