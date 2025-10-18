/**
 * Benchmark Runner
 *
 * Runs performance benchmarks and compares before/after optimizations
 */

import { performance } from 'perf_hooks';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { BenchmarkResult } from '../analyzer';

export interface BenchmarkConfig {
  iterations: number;
  warmupRuns: number;
  timeout: number;
  parallel: boolean;
}

export interface BenchmarkSuite {
  name: string;
  benchmarks: Benchmark[];
}

export interface Benchmark {
  name: string;
  fn: () => Promise<void> | void;
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

export class BenchmarkRunner {
  private config: BenchmarkConfig;
  private results: BenchmarkResult[] = [];

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  /**
   * Run benchmarks for a service
   */
  async runBenchmarks(servicePath: string): Promise<BenchmarkResult[]> {
    console.log(`Running benchmarks for ${servicePath}...`);

    // Load benchmark suites
    const suites = await this.loadBenchmarkSuites(servicePath);

    for (const suite of suites) {
      console.log(`\nRunning suite: ${suite.name}`);

      for (const benchmark of suite.benchmarks) {
        const result = await this.runBenchmark(benchmark);
        this.results.push(result);
      }
    }

    // Save results
    await this.saveResults(servicePath);

    return this.results;
  }

  /**
   * Run a single benchmark
   */
  async runBenchmark(benchmark: Benchmark): Promise<BenchmarkResult> {
    console.log(`  Running: ${benchmark.name}`);

    // Setup
    if (benchmark.setup) {
      await benchmark.setup();
    }

    // Warmup runs
    for (let i = 0; i < this.config.warmupRuns; i++) {
      await benchmark.fn();
    }

    // Actual benchmark runs
    const times: number[] = [];

    for (let i = 0; i < this.config.iterations; i++) {
      const start = performance.now();

      try {
        await Promise.race([
          benchmark.fn(),
          this.timeout(this.config.timeout),
        ]);
      } catch (error) {
        console.error(`  Benchmark failed: ${error}`);
      }

      const end = performance.now();
      times.push(end - start);
    }

    // Teardown
    if (benchmark.teardown) {
      await benchmark.teardown();
    }

    // Calculate statistics
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const sorted = times.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];

    console.log(`    Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms | P95: ${p95.toFixed(2)}ms`);

    return {
      name: benchmark.name,
      baseline: avg,
      optimized: avg, // Will be updated when comparing
      improvement: 0,
      iterations: this.config.iterations,
    };
  }

  /**
   * Compare before and after benchmarks
   */
  async compareBenchmarks(
    beforePath: string,
    afterPath: string
  ): Promise<{
    improvements: BenchmarkResult[];
    regressions: BenchmarkResult[];
    noChange: BenchmarkResult[];
  }> {
    const before = await this.loadResults(beforePath);
    const after = await this.loadResults(afterPath);

    const improvements: BenchmarkResult[] = [];
    const regressions: BenchmarkResult[] = [];
    const noChange: BenchmarkResult[] = [];

    // Compare results
    for (const beforeResult of before) {
      const afterResult = after.find(a => a.name === beforeResult.name);

      if (!afterResult) {
        continue;
      }

      const improvement = ((beforeResult.baseline - afterResult.baseline) / beforeResult.baseline) * 100;

      const result: BenchmarkResult = {
        name: beforeResult.name,
        baseline: beforeResult.baseline,
        optimized: afterResult.baseline,
        improvement,
        iterations: this.config.iterations,
      };

      if (improvement > 5) {
        improvements.push(result);
      } else if (improvement < -5) {
        regressions.push(result);
      } else {
        noChange.push(result);
      }
    }

    return {
      improvements: improvements.sort((a, b) => b.improvement - a.improvement),
      regressions: regressions.sort((a, b) => a.improvement - b.improvement),
      noChange,
    };
  }

  /**
   * Load benchmark suites from service
   */
  private async loadBenchmarkSuites(servicePath: string): Promise<BenchmarkSuite[]> {
    // In real implementation, would dynamically load benchmark files
    // For now, return mock suites
    return [
      {
        name: 'API Endpoints',
        benchmarks: [
          {
            name: 'GET /api/users',
            fn: async () => {
              // Simulate API call
              await this.sleep(Math.random() * 50);
            },
          },
          {
            name: 'POST /api/users',
            fn: async () => {
              await this.sleep(Math.random() * 100);
            },
          },
        ],
      },
      {
        name: 'Database Queries',
        benchmarks: [
          {
            name: 'Find all users',
            fn: async () => {
              await this.sleep(Math.random() * 75);
            },
          },
          {
            name: 'Complex join query',
            fn: async () => {
              await this.sleep(Math.random() * 150);
            },
          },
        ],
      },
    ];
  }

  /**
   * Save benchmark results
   */
  private async saveResults(servicePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `benchmark-results-${timestamp}.json`;
    const filepath = join(process.cwd(), 'tmp', 'benchmarks', filename);

    await writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${filepath}`);
  }

  /**
   * Load benchmark results from file
   */
  private async loadResults(filepath: string): Promise<BenchmarkResult[]> {
    const content = await readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Generate benchmark report
   */
  generateReport(results: BenchmarkResult[]): string {
    let report = '# Benchmark Results\n\n';
    report += `Total Benchmarks: ${results.length}\n\n`;

    report += '## Results\n\n';
    report += '| Benchmark | Baseline | Optimized | Improvement |\n';
    report += '|-----------|----------|-----------|-------------|\n';

    results.forEach(result => {
      const improvement = result.improvement > 0 ? `+${result.improvement.toFixed(2)}%` : `${result.improvement.toFixed(2)}%`;
      report += `| ${result.name} | ${result.baseline.toFixed(2)}ms | ${result.optimized.toFixed(2)}ms | ${improvement} |\n`;
    });

    return report;
  }

  /**
   * Create benchmark from function
   */
  static createBenchmark(name: string, fn: () => Promise<void> | void): Benchmark {
    return { name, fn };
  }

  /**
   * Create benchmark suite
   */
  static createSuite(name: string, benchmarks: Benchmark[]): BenchmarkSuite {
    return { name, benchmarks };
  }

  /**
   * Run micro-benchmark for code snippet
   */
  async microBenchmark(
    name: string,
    code: () => any,
    iterations: number = 1000
  ): Promise<{
    avgTime: number;
    minTime: number;
    maxTime: number;
    opsPerSec: number;
  }> {
    const times: number[] = [];

    // Warmup
    for (let i = 0; i < 10; i++) {
      code();
    }

    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      code();
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSec = 1000 / avgTime;

    return { avgTime, minTime, maxTime, opsPerSec };
  }

  /**
   * Statistical analysis of benchmark results
   */
  analyzeResults(times: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    const sorted = [...times].sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      stdDev,
      variance,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Benchmark timeout')), ms)
    );
  }
}
