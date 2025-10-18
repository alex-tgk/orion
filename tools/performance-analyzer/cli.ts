#!/usr/bin/env node

/**
 * Performance Analyzer CLI
 *
 * Command-line interface for the performance optimization tools
 */

import { PerformanceAnalyzer } from './analyzer';
import { program } from 'commander';
import { writeFile } from 'fs/promises';

program
  .name('perf-analyzer')
  .description('AI-powered performance optimization tool')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze service performance')
  .requiredOption('-s, --service <path>', 'Service path to analyze')
  .option('-p, --profile', 'Enable profiling', true)
  .option('-d, --detect', 'Detect performance issues', true)
  .option('-g, --suggest', 'Generate AI suggestions', true)
  .option('-b, --benchmark', 'Run benchmarks', false)
  .option('-f, --format <format>', 'Output format (json|markdown|html)', 'markdown')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    console.log('🚀 Starting performance analysis...\n');

    const analyzer = new PerformanceAnalyzer();

    try {
      const result = await analyzer.analyzeService(options.service, {
        profile: options.profile,
        detect: options.detect,
        suggest: options.suggest,
        benchmark: options.benchmark,
      });

      // Generate report
      const report = await analyzer.generateReport(result, options.format);

      if (options.output) {
        await writeFile(options.output, report);
        console.log(`\n✅ Report saved to: ${options.output}`);
      } else {
        console.log('\n' + report);
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('profile')
  .description('Profile service performance metrics')
  .requiredOption('-s, --service <path>', 'Service path to profile')
  .option('-d, --duration <seconds>', 'Profiling duration', '60')
  .option('-f, --format <format>', 'Output format', 'json')
  .action(async (options) => {
    console.log(`📊 Profiling ${options.service} for ${options.duration}s...\n`);

    const analyzer = new PerformanceAnalyzer();

    try {
      const result = await analyzer.analyzeService(options.service, {
        profile: true,
        detect: false,
        suggest: false,
        benchmark: false,
      });

      console.log('Metrics:');
      console.log(`  CPU Usage: ${result.metrics.cpu.toFixed(2)}%`);
      console.log(`  Memory: ${result.metrics.memory.toFixed(2)} MB`);
      console.log(`  Response Time (P50): ${result.metrics.responseTime.p50.toFixed(2)}ms`);
      console.log(`  Response Time (P95): ${result.metrics.responseTime.p95.toFixed(2)}ms`);
      console.log(`  Response Time (P99): ${result.metrics.responseTime.p99.toFixed(2)}ms`);
    } catch (error) {
      console.error('❌ Profiling failed:', error);
      process.exit(1);
    }
  });

program
  .command('detect')
  .description('Detect performance issues')
  .requiredOption('-s, --service <path>', 'Service path to analyze')
  .option('-t, --type <types>', 'Issue types to detect (comma-separated)')
  .action(async (options) => {
    console.log(`🔍 Detecting performance issues in ${options.service}...\n`);

    const analyzer = new PerformanceAnalyzer();

    try {
      const result = await analyzer.analyzeService(options.service, {
        profile: false,
        detect: true,
        suggest: false,
        benchmark: false,
      });

      if (result.issues.length === 0) {
        console.log('✅ No performance issues detected!');
      } else {
        console.log(`Found ${result.issues.length} issues:\n`);

        result.issues.forEach((issue, idx) => {
          const severityIcon = issue.severity === 'critical' ? '🔴' :
                               issue.severity === 'high' ? '🟠' :
                               issue.severity === 'medium' ? '🟡' : '🟢';

          console.log(`${idx + 1}. ${severityIcon} ${issue.type} (${issue.severity})`);
          console.log(`   Location: ${issue.location}`);
          console.log(`   ${issue.description}`);
          console.log(`   Impact: ${issue.impact}\n`);
        });
      }
    } catch (error) {
      console.error('❌ Detection failed:', error);
      process.exit(1);
    }
  });

program
  .command('suggest')
  .description('Generate AI-powered optimization suggestions')
  .requiredOption('-s, --service <path>', 'Service path to analyze')
  .option('-m, --max <count>', 'Maximum suggestions', '10')
  .action(async (options) => {
    console.log(`💡 Generating optimization suggestions for ${options.service}...\n`);

    const analyzer = new PerformanceAnalyzer();

    try {
      const result = await analyzer.analyzeService(options.service, {
        profile: true,
        detect: true,
        suggest: true,
        benchmark: false,
      });

      if (result.suggestions.length === 0) {
        console.log('No suggestions generated.');
      } else {
        console.log(`Generated ${result.suggestions.length} suggestions:\n`);

        result.suggestions.slice(0, parseInt(options.max)).forEach((suggestion, idx) => {
          console.log(`${idx + 1}. ${suggestion.title}`);
          console.log(`   Category: ${suggestion.category}`);
          console.log(`   Impact: ${suggestion.estimatedImpact.performance}% improvement`);
          console.log(`   Complexity: ${suggestion.estimatedImpact.complexity}`);
          console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
          console.log(`   ${suggestion.description}\n`);
        });
      }
    } catch (error) {
      console.error('❌ Suggestion generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('benchmark')
  .description('Run performance benchmarks')
  .requiredOption('-s, --service <path>', 'Service path to benchmark')
  .option('-i, --iterations <count>', 'Benchmark iterations', '10')
  .action(async (options) => {
    console.log(`⚡ Running benchmarks for ${options.service}...\n`);

    const analyzer = new PerformanceAnalyzer();

    try {
      const result = await analyzer.analyzeService(options.service, {
        profile: false,
        detect: false,
        suggest: false,
        benchmark: true,
      });

      if (result.benchmarks && result.benchmarks.length > 0) {
        console.log('Benchmark Results:\n');

        result.benchmarks.forEach(bench => {
          console.log(`${bench.name}:`);
          console.log(`  Baseline: ${bench.baseline.toFixed(2)}ms`);
          console.log(`  Optimized: ${bench.optimized.toFixed(2)}ms`);
          console.log(`  Improvement: ${bench.improvement.toFixed(2)}%\n`);
        });
      } else {
        console.log('No benchmarks available.');
      }
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  });

program
  .command('compare')
  .description('Compare two performance snapshots')
  .requiredOption('-b, --before <file>', 'Before snapshot file')
  .requiredOption('-a, --after <file>', 'After snapshot file')
  .action(async (options) => {
    console.log('📊 Comparing performance snapshots...\n');

    const analyzer = new PerformanceAnalyzer();

    try {
      const { readFile } = await import('fs/promises');

      const beforeData = JSON.parse(await readFile(options.before, 'utf-8'));
      const afterData = JSON.parse(await readFile(options.after, 'utf-8'));

      const comparison = await analyzer.comparePerformance(
        '.',
        beforeData,
        afterData
      );

      if (comparison.improvements.length > 0) {
        console.log('✅ Improvements:\n');
        comparison.improvements.forEach(imp => {
          console.log(`  ${imp.metric}: ${imp.before.toFixed(2)} → ${imp.after.toFixed(2)} (${imp.percentage.toFixed(2)}% better)`);
        });
        console.log('');
      }

      if (comparison.regressions.length > 0) {
        console.log('⚠️  Regressions:\n');
        comparison.regressions.forEach(reg => {
          console.log(`  ${reg.metric}: ${reg.before.toFixed(2)} → ${reg.after.toFixed(2)} (${reg.percentage.toFixed(2)}% worse)`);
        });
        console.log('');
      }

      if (comparison.improvements.length === 0 && comparison.regressions.length === 0) {
        console.log('➖ No significant changes detected.');
      }
    } catch (error) {
      console.error('❌ Comparison failed:', error);
      process.exit(1);
    }
  });

program.parse();
