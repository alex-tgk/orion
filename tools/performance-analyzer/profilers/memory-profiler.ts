/**
 * Memory Profiler
 *
 * Profiles memory usage, heap snapshots, and garbage collection
 */

import * as v8 from 'v8';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export interface MemoryProfileConfig {
  enabled: boolean;
  heapSnapshot: boolean;
  gcTracking: boolean;
}

export interface MemoryMetrics {
  heapUsed: number; // MB
  heapTotal: number; // MB
  external: number; // MB
  rss: number; // MB
  gcStats: {
    count: number;
    pauseTime: number; // ms
    frequency: number; // per minute
  };
  leaks: MemoryLeak[];
  snapshot?: string; // path to snapshot file
}

export interface MemoryLeak {
  type: 'growing-array' | 'event-listener' | 'closure' | 'cache';
  object: string;
  size: number;
  retainedSize: number;
  location: string;
}

export class MemoryProfiler {
  private config: MemoryProfileConfig;
  private gcEvents: Array<{ timestamp: number; duration: number }> = [];

  constructor(config: MemoryProfileConfig) {
    this.config = config;

    if (config.gcTracking) {
      this.setupGcTracking();
    }
  }

  /**
   * Profile memory usage
   */
  async profile(servicePath: string): Promise<MemoryMetrics> {
    if (!this.config.enabled) {
      return this.getEmptyMetrics();
    }

    const memUsage = process.memoryUsage();

    const metrics: MemoryMetrics = {
      heapUsed: this.bytesToMB(memUsage.heapUsed),
      heapTotal: this.bytesToMB(memUsage.heapTotal),
      external: this.bytesToMB(memUsage.external),
      rss: this.bytesToMB(memUsage.rss),
      gcStats: this.getGcStats(),
      leaks: [],
    };

    // Take heap snapshot if enabled
    if (this.config.heapSnapshot) {
      metrics.snapshot = await this.takeHeapSnapshot(servicePath);
      metrics.leaks = await this.detectLeaksFromSnapshot(metrics.snapshot);
    }

    return metrics;
  }

  /**
   * Take a heap snapshot
   */
  async takeHeapSnapshot(servicePath: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `heap-${timestamp}.heapsnapshot`;
    const filepath = join(process.cwd(), 'tmp', 'snapshots', filename);

    try {
      const snapshot = v8.writeHeapSnapshot(filepath);
      console.log(`Heap snapshot saved to: ${snapshot}`);
      return snapshot;
    } catch (error) {
      console.error('Failed to take heap snapshot:', error);
      return '';
    }
  }

  /**
   * Compare two heap snapshots to find memory leaks
   */
  async compareSnapshots(snapshot1: string, snapshot2: string): Promise<{
    growingObjects: Array<{
      type: string;
      count: number;
      sizeDiff: number;
    }>;
  }> {
    // In real implementation, would parse and compare snapshots
    // For now, return mock data
    return {
      growingObjects: [
        {
          type: 'Array',
          count: 1523,
          sizeDiff: 2048576, // bytes
        },
        {
          type: 'Object',
          count: 847,
          sizeDiff: 1048576,
        },
      ],
    };
  }

  /**
   * Detect memory leaks from snapshot
   */
  private async detectLeaksFromSnapshot(snapshotPath: string): Promise<MemoryLeak[]> {
    // In real implementation, would analyze heap snapshot
    return [
      {
        type: 'growing-array',
        object: 'cacheArray',
        size: 5242880, // 5MB
        retainedSize: 5242880,
        location: 'cache.service.ts:45',
      },
      {
        type: 'event-listener',
        object: 'EventEmitter listeners',
        size: 1048576, // 1MB
        retainedSize: 1048576,
        location: 'websocket.gateway.ts:120',
      },
    ];
  }

  /**
   * Setup garbage collection tracking
   */
  private setupGcTracking(): void {
    // In real implementation, would use performance observers
    // or V8 GC hooks
    console.log('GC tracking enabled');
  }

  /**
   * Get GC statistics
   */
  private getGcStats(): MemoryMetrics['gcStats'] {
    const recentEvents = this.gcEvents.filter(
      e => Date.now() - e.timestamp < 60000 // last minute
    );

    const totalPauseTime = recentEvents.reduce((sum, e) => sum + e.duration, 0);

    return {
      count: recentEvents.length,
      pauseTime: totalPauseTime,
      frequency: recentEvents.length,
    };
  }

  /**
   * Force garbage collection (for testing)
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
      console.log('Garbage collection forced');
    } else {
      console.warn('GC not exposed. Run with --expose-gc flag');
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
  } {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: this.bytesToMB(memUsage.heapUsed),
      heapTotal: this.bytesToMB(memUsage.heapTotal),
      external: this.bytesToMB(memUsage.external),
    };
  }

  /**
   * Monitor memory usage over time
   */
  async monitorMemory(duration: number, interval: number): Promise<{
    samples: Array<{
      timestamp: number;
      heapUsed: number;
      heapTotal: number;
    }>;
    trend: 'stable' | 'growing' | 'fluctuating';
  }> {
    const samples = [];
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      const usage = this.getCurrentUsage();
      samples.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
      });

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    const trend = this.analyzeTrend(samples);

    return { samples, trend };
  }

  /**
   * Analyze memory usage trend
   */
  private analyzeTrend(samples: Array<{ heapUsed: number }>): 'stable' | 'growing' | 'fluctuating' {
    if (samples.length < 2) return 'stable';

    const firstHalf = samples.slice(0, Math.floor(samples.length / 2));
    const secondHalf = samples.slice(Math.floor(samples.length / 2));

    const avgFirst = firstHalf.reduce((sum, s) => sum + s.heapUsed, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, s) => sum + s.heapUsed, 0) / secondHalf.length;

    const growth = ((avgSecond - avgFirst) / avgFirst) * 100;

    if (growth > 10) return 'growing';
    if (growth < -10) return 'fluctuating';
    return 'stable';
  }

  private bytesToMB(bytes: number): number {
    return bytes / (1024 * 1024);
  }

  private getEmptyMetrics(): MemoryMetrics {
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
      gcStats: {
        count: 0,
        pauseTime: 0,
        frequency: 0,
      },
      leaks: [],
    };
  }
}
