# Performance Analyzer - Quick Reference

## Quick Commands

```bash
# Full analysis
npm run perf:analyze -- --service=packages/auth

# Profile only
npm run perf:profile -- --service=packages/auth

# Detect issues
npm run perf:detect -- --service=packages/auth

# Get AI suggestions
npm run perf:suggest -- --service=packages/auth

# Run benchmarks
npm run perf:benchmark -- --service=packages/auth

# Compare snapshots
npm run perf:compare -- --before=old.json --after=new.json
```

## Shell Scripts

```bash
# Profile service (60 seconds)
./scripts/performance/profile-service.sh auth 60 markdown

# Find slow queries (>100ms threshold)
./scripts/performance/find-slow-queries.sh 100 auth

# Memory profiling (120 seconds)
./scripts/performance/memory-profiling.sh auth 120

# Bundle analysis
./scripts/performance/bundle-analysis.sh admin-ui
```

## Claude Code

```
/optimize-performance
```

## Issue Types Detected

| Type | Severity | Description |
|------|----------|-------------|
| n-plus-one | High | Database queries in loops |
| memory-leak | High | Event listeners, timers without cleanup |
| slow-algorithm | Medium | O(n²) complexity, inefficient operations |
| missing-cache | Medium | Repeated API calls, expensive computations |
| large-bundle | Medium | Bundle size exceeds thresholds |

## Performance Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU | 70% | 85% |
| Memory | 512 MB | 1024 MB |
| Response Time (P95) | 300 ms | 500 ms |
| Database Query | 100 ms | 500 ms |
| Bundle Size | 500 KB | 1 MB |

## Common Optimizations

### N+1 Queries
```typescript
// Before
for (const order of orders) {
  const user = await userRepository.findOne(order.userId);
}

// After
const orders = await orderRepository.find({
  relations: ['user']
});
```

### Memory Leaks
```typescript
// Before
setInterval(() => { /* work */ }, 1000);

// After
const id = setInterval(() => { /* work */ }, 1000);
// Later: clearInterval(id);
```

### Inefficient Algorithms
```typescript
// Before (O(n²))
for (const a of arrayA) {
  for (const b of arrayB) {
    if (a.id === b.id) { /* match */ }
  }
}

// After (O(n))
const map = new Map(arrayB.map(b => [b.id, b]));
for (const a of arrayA) {
  const match = map.get(a.id);
}
```

### Missing Cache
```typescript
// Before
@Get('/users/:id')
async getUser(id: string) {
  return await this.userService.findById(id);
}

// After
@Get('/users/:id')
@UseInterceptors(CacheInterceptor)
@CacheTTL(300)
async getUser(id: string) {
  return await this.userService.findById(id);
}
```

## Output Formats

- `json` - Machine-readable JSON
- `markdown` - Human-readable Markdown
- `html` - HTML report

## Environment Variables

```bash
ANTHROPIC_API_KEY=your-key  # Required for AI suggestions
```

## Files & Directories

```
tools/performance-analyzer/   # Main tool
scripts/performance/          # Shell scripts
.claude/commands/             # Slash commands
docs/performance/             # Documentation
k8s/monitoring/grafana/       # Dashboards
tmp/performance/              # Reports (gitignored)
```

## Grafana Dashboard

**URL**: `http://grafana.orion.local/d/performance-optimization`

**Panels**:
- Service response times
- Memory usage
- CPU usage
- Database query performance
- Issues detected
- Optimization impact
- Performance trends

## CI/CD

**Workflow**: `.github/workflows/performance-check.yml`

**Triggers**: Pull requests to main/develop

**Actions**:
- Profiles PR changes
- Comments with performance impact
- Fails if degradation exceeds thresholds

## Help

```bash
# CLI help
npm run perf:analyze -- --help

# Documentation
cat docs/performance/optimization-guide.md

# Tool README
cat tools/performance-analyzer/README.md
```
