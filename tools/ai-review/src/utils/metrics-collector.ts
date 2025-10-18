import * as fs from 'fs';
import * as path from 'path';
import { MetricsConfig } from '../types';

interface MetricEntry {
  timestamp: string;
  prNumber: number;
  reviewTime: number;
  issuesFound: number;
  severity: Record<string, number>;
  [key: string]: any;
}

export class MetricsCollector {
  private config: MetricsConfig;
  private metricsPath: string;
  private metrics: MetricEntry[];

  constructor(config: MetricsConfig) {
    this.config = config;
    this.metricsPath = path.join(process.cwd(), '.ai-review-metrics', 'metrics.json');
    this.metrics = [];
    this.loadMetrics();
  }

  async record(data: Partial<MetricEntry>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const entry: MetricEntry = {
      timestamp: new Date().toISOString(),
      prNumber: data.prNumber || 0,
      reviewTime: data.reviewTime || 0,
      issuesFound: data.issuesFound || 0,
      severity: data.severity || {},
      ...data,
    };

    this.metrics.push(entry);
    await this.saveMetrics();
  }

  getMetrics(filter?: { startDate?: string; endDate?: string; prNumber?: number }): MetricEntry[] {
    let filtered = this.metrics;

    if (filter) {
      if (filter.startDate) {
        filtered = filtered.filter((m) => m.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter((m) => m.timestamp <= filter.endDate!);
      }
      if (filter.prNumber) {
        filtered = filtered.filter((m) => m.prNumber === filter.prNumber);
      }
    }

    return filtered;
  }

  getAggregatedMetrics(): Record<string, any> {
    if (this.metrics.length === 0) {
      return {
        totalReviews: 0,
        averageReviewTime: 0,
        totalIssues: 0,
        averageIssuesPerReview: 0,
      };
    }

    const totalReviewTime = this.metrics.reduce((sum, m) => sum + m.reviewTime, 0);
    const totalIssues = this.metrics.reduce((sum, m) => sum + m.issuesFound, 0);

    const severityCounts = this.metrics.reduce(
      (acc, m) => {
        for (const [severity, count] of Object.entries(m.severity)) {
          acc[severity] = (acc[severity] || 0) + count;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalReviews: this.metrics.length,
      averageReviewTime: Math.round(totalReviewTime / this.metrics.length),
      totalIssues,
      averageIssuesPerReview: Math.round(totalIssues / this.metrics.length),
      severityDistribution: severityCounts,
      lastReview: this.metrics[this.metrics.length - 1]?.timestamp,
    };
  }

  private loadMetrics(): void {
    try {
      if (fs.existsSync(this.metricsPath)) {
        const data = fs.readFileSync(this.metricsPath, 'utf-8');
        this.metrics = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      const dir = path.dirname(this.metricsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }
}
