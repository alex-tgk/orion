/**
 * Main Performance Analyzer
 *
 * Coordinates performance profiling, issue detection, and optimization suggestions
 * using AI-powered analysis.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { CpuProfiler } from './profilers/cpu-profiler';
import { MemoryProfiler } from './profilers/memory-profiler';
import { DatabaseProfiler } from './profilers/database-profiler';
import { NPlusOneDetector } from './detectors/n-plus-one-detector';
import { MemoryLeakDetector } from './detectors/memory-leak-detector';
import { AlgorithmDetector } from './detectors/algorithm-detector';
import { CachingDetector } from './detectors/caching-detector';
import { OptimizationSuggester } from './optimizers/suggestion-generator';
import { BenchmarkRunner } from './benchmarks/benchmark-runner';

export interface PerformanceConfig {
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    responseTime: { p50: number; p95: number; p99: number };
    database: {
      queryTime: { warning: number; critical: number };
      connectionPool: { warning: number; critical: number };
    };
  };
  profiling: {
    cpu: { enabled: boolean; samplingInterval: number; duration: number };
    memory: { enabled: boolean; heapSnapshot: boolean; gcTracking: boolean };
    database: { enabled: boolean; slowQueryThreshold: number; trackQueryPlans: boolean };
  };
  optimization: {
    aiModel: string;
    maxSuggestions: number;
    confidenceThreshold: number;
    categories: string[];
  };
  benchmarking: {
    iterations: number;
    warmupRuns: number;
    timeout: number;
    parallel: boolean;
  };
}

export interface AnalysisResult {
  timestamp: Date;
  service: string;
  metrics: {
    cpu: number;
    memory: number;
    responseTime: { p50: number; p95: number; p99: number };
  };
  issues: PerformanceIssue[];
  suggestions: OptimizationSuggestion[];
  benchmarks?: BenchmarkResult[];
}

export interface PerformanceIssue {
  type: 'n-plus-one' | 'memory-leak' | 'slow-algorithm' | 'missing-cache' | 'large-bundle';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  impact: string;
  detectedAt: Date;
}

export interface OptimizationSuggestion {
  id: string;
  category: string;
  title: string;
  description: string;
  code?: {
    before: string;
    after: string;
    diff: string;
  };
  estimatedImpact: {
    performance: number; // percentage improvement
    complexity: 'low' | 'medium' | 'high';
  };
  confidence: number;
  aiReasoning: string;
}

export interface BenchmarkResult {
  name: string;
  baseline: number;
  optimized: number;
  improvement: number;
  iterations: number;
}

export class PerformanceAnalyzer {
  private config: PerformanceConfig;
  private cpuProfiler: CpuProfiler;
  private memoryProfiler: MemoryProfiler;
  private databaseProfiler: DatabaseProfiler;
  private nPlusOneDetector: NPlusOneDetector;
  private memoryLeakDetector: MemoryLeakDetector;
  private algorithmDetector: AlgorithmDetector;
  private cachingDetector: CachingDetector;
  private optimizationSuggester: OptimizationSuggester;
  private benchmarkRunner: BenchmarkRunner;

  constructor(configPath?: string) {
    this.loadConfig(configPath);
  }

  private async loadConfig(configPath?: string): Promise<void> {
    const path = configPath || join(__dirname, 'config.json');
    const configData = await readFile(path, 'utf-8');
    this.config = JSON.parse(configData);

    this.initializeComponents();
  }

  private initializeComponents(): void {
    this.cpuProfiler = new CpuProfiler(this.config.profiling.cpu);
    this.memoryProfiler = new MemoryProfiler(this.config.profiling.memory);
    this.databaseProfiler = new DatabaseProfiler(this.config.profiling.database);

    this.nPlusOneDetector = new NPlusOneDetector();
    this.memoryLeakDetector = new MemoryLeakDetector();
    this.algorithmDetector = new AlgorithmDetector();
    this.cachingDetector = new CachingDetector();

    this.optimizationSuggester = new OptimizationSuggester({
      model: this.config.optimization.aiModel,
      maxSuggestions: this.config.optimization.maxSuggestions,
      confidenceThreshold: this.config.optimization.confidenceThreshold,
    });

    this.benchmarkRunner = new BenchmarkRunner(this.config.benchmarking);
  }

  /**
   * Run comprehensive performance analysis on a service
   */
  async analyzeService(servicePath: string, options: {
    profile?: boolean;
    detect?: boolean;
    suggest?: boolean;
    benchmark?: boolean;
  } = {}): Promise<AnalysisResult> {
    const {
      profile = true,
      detect = true,
      suggest = true,
      benchmark = false,
    } = options;

    const result: AnalysisResult = {
      timestamp: new Date(),
      service: servicePath,
      metrics: { cpu: 0, memory: 0, responseTime: { p50: 0, p95: 0, p99: 0 } },
      issues: [],
      suggestions: [],
    };

    // Profile performance
    if (profile) {
      console.log('🔍 Profiling service performance...');
      result.metrics = await this.profileService(servicePath);
    }

    // Detect issues
    if (detect) {
      console.log('🔎 Detecting performance issues...');
      result.issues = await this.detectIssues(servicePath);
    }

    // Generate optimization suggestions
    if (suggest && result.issues.length > 0) {
      console.log('💡 Generating AI-powered optimization suggestions...');
      result.suggestions = await this.generateSuggestions(servicePath, result.issues);
    }

    // Run benchmarks
    if (benchmark) {
      console.log('⚡ Running performance benchmarks...');
      result.benchmarks = await this.runBenchmarks(servicePath);
    }

    return result;
  }

  /**
   * Profile service performance metrics
   */
  private async profileService(servicePath: string): Promise<AnalysisResult['metrics']> {
    const [cpuMetrics, memoryMetrics, dbMetrics] = await Promise.all([
      this.cpuProfiler.profile(servicePath),
      this.memoryProfiler.profile(servicePath),
      this.databaseProfiler.profile(servicePath),
    ]);

    return {
      cpu: cpuMetrics.usage,
      memory: memoryMetrics.heapUsed,
      responseTime: {
        p50: dbMetrics.queryStats.p50,
        p95: dbMetrics.queryStats.p95,
        p99: dbMetrics.queryStats.p99,
      },
    };
  }

  /**
   * Detect performance issues using various detectors
   */
  private async detectIssues(servicePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    // Detect N+1 queries
    const nPlusOneIssues = await this.nPlusOneDetector.detect(servicePath);
    issues.push(...nPlusOneIssues);

    // Detect memory leaks
    const memoryLeakIssues = await this.memoryLeakDetector.detect(servicePath);
    issues.push(...memoryLeakIssues);

    // Detect inefficient algorithms
    const algorithmIssues = await this.algorithmDetector.detect(servicePath);
    issues.push(...algorithmIssues);

    // Detect missing caching opportunities
    const cachingIssues = await this.cachingDetector.detect(servicePath);
    issues.push(...cachingIssues);

    return issues.sort((a, b) => this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity));
  }

  /**
   * Generate AI-powered optimization suggestions
   */
  private async generateSuggestions(
    servicePath: string,
    issues: PerformanceIssue[]
  ): Promise<OptimizationSuggestion[]> {
    return await this.optimizationSuggester.generateSuggestions(servicePath, issues);
  }

  /**
   * Run performance benchmarks
   */
  private async runBenchmarks(servicePath: string): Promise<BenchmarkResult[]> {
    return await this.benchmarkRunner.runBenchmarks(servicePath);
  }

  /**
   * Analyze code for anti-patterns
   */
  async analyzeCodePatterns(filePath: string): Promise<{
    antiPatterns: Array<{
      type: string;
      line: number;
      description: string;
      suggestion: string;
    }>;
  }> {
    const code = await readFile(filePath, 'utf-8');
    const antiPatterns = [];

    // Check for common anti-patterns
    const patterns = [
      {
        regex: /\.forEach\(.*await/g,
        type: 'async-foreach',
        description: 'Using await inside forEach',
        suggestion: 'Use Promise.all with map or for...of loop',
      },
      {
        regex: /for.*\.length/g,
        type: 'loop-length-calc',
        description: 'Calculating length in loop condition',
        suggestion: 'Cache length in a variable',
      },
      {
        regex: /JSON\.parse\(JSON\.stringify/g,
        type: 'json-clone',
        description: 'Using JSON for deep cloning',
        suggestion: 'Use structuredClone or a proper deep clone utility',
      },
      {
        regex: /new Date\(\).*loop/g,
        type: 'date-in-loop',
        description: 'Creating new Date objects in loops',
        suggestion: 'Create Date once outside the loop',
      },
    ];

    const lines = code.split('\n');
    patterns.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.regex.test(line)) {
          antiPatterns.push({
            type: pattern.type,
            line: index + 1,
            description: pattern.description,
            suggestion: pattern.suggestion,
          });
        }
      });
    });

    return { antiPatterns };
  }

  /**
   * Compare performance before and after optimization
   */
  async comparePerformance(
    servicePath: string,
    beforeSnapshot: AnalysisResult,
    afterSnapshot: AnalysisResult
  ): Promise<{
    improvements: Array<{
      metric: string;
      before: number;
      after: number;
      improvement: number;
      percentage: number;
    }>;
    regressions: Array<{
      metric: string;
      before: number;
      after: number;
      degradation: number;
      percentage: number;
    }>;
  }> {
    const improvements = [];
    const regressions = [];

    // Compare CPU
    const cpuChange = beforeSnapshot.metrics.cpu - afterSnapshot.metrics.cpu;
    if (cpuChange > 0) {
      improvements.push({
        metric: 'CPU Usage',
        before: beforeSnapshot.metrics.cpu,
        after: afterSnapshot.metrics.cpu,
        improvement: cpuChange,
        percentage: (cpuChange / beforeSnapshot.metrics.cpu) * 100,
      });
    } else if (cpuChange < 0) {
      regressions.push({
        metric: 'CPU Usage',
        before: beforeSnapshot.metrics.cpu,
        after: afterSnapshot.metrics.cpu,
        degradation: Math.abs(cpuChange),
        percentage: (Math.abs(cpuChange) / beforeSnapshot.metrics.cpu) * 100,
      });
    }

    // Compare Memory
    const memChange = beforeSnapshot.metrics.memory - afterSnapshot.metrics.memory;
    if (memChange > 0) {
      improvements.push({
        metric: 'Memory Usage',
        before: beforeSnapshot.metrics.memory,
        after: afterSnapshot.metrics.memory,
        improvement: memChange,
        percentage: (memChange / beforeSnapshot.metrics.memory) * 100,
      });
    } else if (memChange < 0) {
      regressions.push({
        metric: 'Memory Usage',
        before: beforeSnapshot.metrics.memory,
        after: afterSnapshot.metrics.memory,
        degradation: Math.abs(memChange),
        percentage: (Math.abs(memChange) / beforeSnapshot.metrics.memory) * 100,
      });
    }

    // Compare Response Time (P95)
    const p95Change = beforeSnapshot.metrics.responseTime.p95 - afterSnapshot.metrics.responseTime.p95;
    if (p95Change > 0) {
      improvements.push({
        metric: 'Response Time (P95)',
        before: beforeSnapshot.metrics.responseTime.p95,
        after: afterSnapshot.metrics.responseTime.p95,
        improvement: p95Change,
        percentage: (p95Change / beforeSnapshot.metrics.responseTime.p95) * 100,
      });
    } else if (p95Change < 0) {
      regressions.push({
        metric: 'Response Time (P95)',
        before: beforeSnapshot.metrics.responseTime.p95,
        after: afterSnapshot.metrics.responseTime.p95,
        degradation: Math.abs(p95Change),
        percentage: (Math.abs(p95Change) / beforeSnapshot.metrics.responseTime.p95) * 100,
      });
    }

    return { improvements, regressions };
  }

  private getSeverityScore(severity: PerformanceIssue['severity']): number {
    const scores = { critical: 4, high: 3, medium: 2, low: 1 };
    return scores[severity] || 0;
  }

  /**
   * Generate performance report
   */
  async generateReport(result: AnalysisResult, format: 'json' | 'markdown' | 'html' = 'markdown'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }

    if (format === 'markdown') {
      return this.generateMarkdownReport(result);
    }

    // HTML format
    return this.generateHtmlReport(result);
  }

  private generateMarkdownReport(result: AnalysisResult): string {
    let report = `# Performance Analysis Report\n\n`;
    report += `**Service:** ${result.service}\n`;
    report += `**Timestamp:** ${result.timestamp.toISOString()}\n\n`;

    report += `## Metrics\n\n`;
    report += `- **CPU Usage:** ${result.metrics.cpu.toFixed(2)}%\n`;
    report += `- **Memory Usage:** ${result.metrics.memory.toFixed(2)} MB\n`;
    report += `- **Response Time (P50):** ${result.metrics.responseTime.p50.toFixed(2)} ms\n`;
    report += `- **Response Time (P95):** ${result.metrics.responseTime.p95.toFixed(2)} ms\n`;
    report += `- **Response Time (P99):** ${result.metrics.responseTime.p99.toFixed(2)} ms\n\n`;

    if (result.issues.length > 0) {
      report += `## Issues Found (${result.issues.length})\n\n`;
      result.issues.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.type} (${issue.severity})\n\n`;
        report += `**Location:** ${issue.location}\n\n`;
        report += `**Description:** ${issue.description}\n\n`;
        report += `**Impact:** ${issue.impact}\n\n`;
      });
    }

    if (result.suggestions.length > 0) {
      report += `## Optimization Suggestions (${result.suggestions.length})\n\n`;
      result.suggestions.forEach((suggestion, index) => {
        report += `### ${index + 1}. ${suggestion.title}\n\n`;
        report += `**Category:** ${suggestion.category}\n\n`;
        report += `**Description:** ${suggestion.description}\n\n`;
        report += `**Estimated Impact:** ${suggestion.estimatedImpact.performance}% improvement\n\n`;
        report += `**Complexity:** ${suggestion.estimatedImpact.complexity}\n\n`;
        report += `**Confidence:** ${(suggestion.confidence * 100).toFixed(0)}%\n\n`;

        if (suggestion.code) {
          report += `**Code Changes:**\n\n`;
          report += `\`\`\`diff\n${suggestion.code.diff}\n\`\`\`\n\n`;
        }

        report += `**AI Reasoning:** ${suggestion.aiReasoning}\n\n`;
      });
    }

    if (result.benchmarks && result.benchmarks.length > 0) {
      report += `## Benchmarks\n\n`;
      report += `| Name | Baseline | Optimized | Improvement |\n`;
      report += `|------|----------|-----------|-------------|\n`;
      result.benchmarks.forEach(bench => {
        report += `| ${bench.name} | ${bench.baseline.toFixed(2)}ms | ${bench.optimized.toFixed(2)}ms | ${bench.improvement.toFixed(2)}% |\n`;
      });
    }

    return report;
  }

  private generateHtmlReport(result: AnalysisResult): string {
    // Simplified HTML report
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { background: #f0f0f0; padding: 10px; margin: 10px 0; }
    .issue { border-left: 3px solid #ff0000; padding: 10px; margin: 10px 0; }
    .suggestion { border-left: 3px solid #00ff00; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Performance Analysis Report</h1>
  <p><strong>Service:</strong> ${result.service}</p>
  <p><strong>Timestamp:</strong> ${result.timestamp.toISOString()}</p>

  <h2>Metrics</h2>
  <div class="metric">CPU: ${result.metrics.cpu.toFixed(2)}%</div>
  <div class="metric">Memory: ${result.metrics.memory.toFixed(2)} MB</div>

  <h2>Issues (${result.issues.length})</h2>
  ${result.issues.map(issue => `
    <div class="issue">
      <h3>${issue.type} (${issue.severity})</h3>
      <p>${issue.description}</p>
    </div>
  `).join('')}

  <h2>Suggestions (${result.suggestions.length})</h2>
  ${result.suggestions.map(suggestion => `
    <div class="suggestion">
      <h3>${suggestion.title}</h3>
      <p>${suggestion.description}</p>
    </div>
  `).join('')}
</body>
</html>
`;
  }
}
