---
description: Analyze code and suggest performance optimizations
---

# Performance Optimization Analysis

Run comprehensive performance analysis and get AI-powered optimization suggestions for your code.

## Usage

This command will:
1. Profile CPU, memory, and database performance
2. Detect performance anti-patterns (N+1 queries, memory leaks, inefficient algorithms)
3. Identify caching opportunities
4. Generate AI-powered optimization suggestions using Claude
5. Provide benchmarks and performance metrics
6. Suggest concrete code improvements

## What Gets Analyzed

### Performance Profiling
- CPU usage and hotspots
- Memory consumption and leak detection
- Database query performance
- API response times
- Bundle sizes

### Issue Detection
- **N+1 Queries**: Database queries in loops
- **Memory Leaks**: Event listeners, timers, unbounded caches
- **Slow Algorithms**: O(n²) complexity, inefficient operations
- **Missing Caching**: Repeated API calls, expensive computations
- **Large Bundles**: Unnecessary dependencies, missing code splitting

### AI-Powered Suggestions
Claude analyzes your code and provides:
- Specific optimization strategies
- Before/after code examples
- Estimated performance impact
- Implementation complexity assessment
- Reasoning for each suggestion

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
  • Missing cache in api.service.ts:89 (MEDIUM)
  • String concat in loop in builder.ts:34 (LOW)

💡 Generating AI-powered optimization suggestions...

Suggestion 1: Optimize User Loading with Eager Loading
Category: database
Impact: ~65% faster query time
Complexity: low
Confidence: 95%

Before:
```typescript
for (const order of orders) {
  const user = await userRepository.findOne(order.userId);
}
```

After:
```typescript
const orders = await orderRepository.find({
  relations: ['user']
});
```

⚡ Running performance benchmarks...
Baseline: 285ms → Optimized: 112ms (60.7% improvement)
```

## Configuration

Performance thresholds can be configured in:
`tools/performance-analyzer/config.json`

```json
{
  "thresholds": {
    "cpu": { "warning": 70, "critical": 85 },
    "memory": { "warning": 512, "critical": 1024 },
    "responseTime": { "p95": 500, "p99": 1000 }
  }
}
```

## Running Specific Analyses

### Profile Only
```bash
npm run perf:profile -- --service=auth
```

### Detect Issues Only
```bash
npm run perf:detect -- --service=gateway
```

### Generate Suggestions
```bash
npm run perf:suggest -- --service=notifications
```

### Run Benchmarks
```bash
npm run perf:benchmark -- --service=user
```

## Integration with CI/CD

Performance checks run automatically on pull requests via:
`.github/workflows/performance-check.yml`

The workflow will:
- Comment on PR with performance impact
- Fail if performance degrades significantly
- Track metrics over time
- Generate comparison reports

## Best Practices

1. **Run locally before committing** - Catch issues early
2. **Review AI suggestions** - Understand the reasoning before applying
3. **Benchmark changes** - Verify actual impact
4. **Set performance budgets** - Prevent regressions
5. **Monitor in production** - Use Grafana dashboards

## Resources

- [Optimization Guide](../../docs/performance/optimization-guide.md)
- [Performance Budgets](../../docs/performance/budgets.md)
- [Grafana Dashboards](../../k8s/monitoring/grafana/dashboards/)
- [Benchmarking Guide](../../docs/performance/benchmarking.md)
