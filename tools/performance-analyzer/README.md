# Performance Analyzer

AI-powered performance optimization toolkit for ORION microservices.

## Quick Start

```bash
# Analyze a service
npm run perf:analyze -- --service=packages/auth

# Profile performance
npm run perf:profile -- --service=packages/auth

# Detect issues
npm run perf:detect -- --service=packages/gateway

# Get AI suggestions
npm run perf:suggest -- --service=packages/notifications

# Run benchmarks
npm run perf:benchmark -- --service=packages/user
```

## Features

### 1. Performance Profiling
- CPU usage tracking
- Memory profiling with heap snapshots
- Database query performance
- API response time metrics

### 2. Issue Detection
- **N+1 Queries**: Detects database queries in loops
- **Memory Leaks**: Event listeners, timers, unbounded caches
- **Slow Algorithms**: O(n²) complexity, inefficient operations
- **Missing Caching**: Repeated API calls, expensive computations

### 3. AI-Powered Optimization
- Claude-based code analysis
- Specific optimization suggestions
- Before/after code examples
- Estimated performance impact
- Implementation complexity assessment

### 4. Benchmarking
- Automated benchmark suite execution
- Before/after comparisons
- Statistical analysis (mean, median, P95, P99)
- Performance regression detection

## Architecture

```
tools/performance-analyzer/
├── analyzer.ts              # Main performance analyzer
├── cli.ts                   # Command-line interface
├── config.json              # Performance thresholds and settings
├── profilers/
│   ├── cpu-profiler.ts     # CPU usage profiling
│   ├── memory-profiler.ts  # Memory and heap analysis
│   └── database-profiler.ts # Database query profiling
├── detectors/
│   ├── n-plus-one-detector.ts    # N+1 query detection
│   ├── memory-leak-detector.ts   # Memory leak detection
│   ├── algorithm-detector.ts     # Algorithm inefficiency detection
│   └── caching-detector.ts       # Missing cache detection
├── optimizers/
│   └── suggestion-generator.ts   # AI-powered suggestions
└── benchmarks/
    └── benchmark-runner.ts       # Benchmark execution
```

## Configuration

Edit `tools/performance-analyzer/config.json`:

```json
{
  "thresholds": {
    "cpu": { "warning": 70, "critical": 85 },
    "memory": { "warning": 512, "critical": 1024 },
    "responseTime": { "p95": 500, "p99": 1000 }
  },
  "optimization": {
    "aiModel": "claude-3-5-sonnet-20241022",
    "maxSuggestions": 10,
    "confidenceThreshold": 0.7
  }
}
```

## CLI Commands

### Analyze
```bash
npm run perf:analyze -- \
  --service=packages/auth \
  --profile \
  --detect \
  --suggest \
  --benchmark \
  --format=markdown \
  --output=report.md
```

### Profile
```bash
npm run perf:profile -- \
  --service=packages/auth \
  --duration=60 \
  --format=json
```

### Detect
```bash
npm run perf:detect -- \
  --service=packages/auth \
  --type=n-plus-one,memory-leak
```

### Suggest
```bash
npm run perf:suggest -- \
  --service=packages/auth \
  --max=10
```

### Benchmark
```bash
npm run perf:benchmark -- \
  --service=packages/auth \
  --iterations=100
```

### Compare
```bash
npm run perf:compare -- \
  --before=baseline.json \
  --after=optimized.json
```

## Integration

### CI/CD
Performance checks run automatically on pull requests:
- `.github/workflows/performance-check.yml`
- Comments on PR with performance impact
- Fails if performance degrades significantly

### Monitoring
View metrics in Grafana:
- Dashboard: `k8s/monitoring/grafana/dashboards/performance-optimization.json`
- Real-time performance tracking
- Historical trends
- Alert integration

### Claude Code
Use the slash command:
```
/optimize-performance
```

## Scripts

### Profile Service
```bash
./scripts/performance/profile-service.sh auth 60 markdown
```

### Find Slow Queries
```bash
./scripts/performance/find-slow-queries.sh 100 auth
```

### Memory Profiling
```bash
./scripts/performance/memory-profiling.sh auth 120
```

### Bundle Analysis
```bash
./scripts/performance/bundle-analysis.sh admin-ui
```

## Example Output

```
🔍 Profiling service performance...
✓ CPU: 45.2% (Warning threshold: 70%)
✓ Memory: 342 MB (Warning threshold: 512 MB)
✓ Response Time P95: 285ms (Target: 500ms)

🔎 Detecting performance issues...
Found 5 issues:
  • N+1 Query in users.service.ts:42 (HIGH)
  • Memory leak in websocket.gateway.ts:120 (HIGH)
  • Inefficient algorithm in transformer.ts:56 (MEDIUM)

💡 Generating AI-powered optimization suggestions...

Suggestion 1: Optimize User Loading with Eager Loading
Category: database
Impact: ~65% faster query time
Complexity: low
Confidence: 95%

Before:
for (const order of orders) {
  const user = await userRepository.findOne(order.userId);
}

After:
const orders = await orderRepository.find({
  relations: ['user']
});

Reasoning: The current implementation executes N+1 queries...
```

## Best Practices

1. **Run locally before committing** - Catch issues early
2. **Review AI suggestions carefully** - Understand the reasoning
3. **Benchmark changes** - Verify actual impact
4. **Set performance budgets** - Prevent regressions
5. **Monitor in production** - Use Grafana dashboards

## Troubleshooting

### High Memory Usage
```bash
# Take heap snapshot
./scripts/performance/memory-profiling.sh auth 120

# Compare snapshots
# Open in Chrome DevTools > Memory tab
```

### Slow Queries
```bash
# Find slow queries
./scripts/performance/find-slow-queries.sh 100 auth

# Analyze query plans
# Check database profiler output
```

### Large Bundles
```bash
# Analyze bundle
./scripts/performance/bundle-analysis.sh admin-ui

# Use webpack-bundle-analyzer
npm install -g webpack-bundle-analyzer
webpack-bundle-analyzer dist/packages/admin-ui/stats.json
```

## Documentation

- [Optimization Guide](../../docs/performance/optimization-guide.md)
- [Benchmarking Guide](../../docs/performance/benchmarking.md)
- [Performance Budgets](../../docs/performance/budgets.md)

## Requirements

- Node.js 20+
- TypeScript 5.9+
- Anthropic API key (for AI suggestions)

## Environment Variables

```bash
# Required for AI suggestions
ANTHROPIC_API_KEY=your-api-key
```

## License

MIT
