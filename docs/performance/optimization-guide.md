# Performance Optimization Guide

Complete guide to optimizing performance in ORION microservices using AI-powered analysis tools.

## Table of Contents

1. [Introduction](#introduction)
2. [Common Performance Issues](#common-performance-issues)
3. [Optimization Techniques](#optimization-techniques)
4. [Using the AI Optimizer](#using-the-ai-optimizer)
5. [Benchmarking Best Practices](#benchmarking-best-practices)
6. [Performance Budgets](#performance-budgets)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Case Studies](#case-studies)

## Introduction

Performance optimization is critical for microservices to handle scale efficiently. ORION provides AI-powered tools to automatically detect performance issues and suggest optimizations.

### Key Features

- **Automated Detection**: Find N+1 queries, memory leaks, and algorithmic inefficiencies
- **AI-Powered Suggestions**: Get specific optimization recommendations from Claude
- **Continuous Monitoring**: Track performance metrics in real-time
- **CI/CD Integration**: Catch regressions before they reach production

## Common Performance Issues

### 1. N+1 Query Problem

**Symptoms:**
- Slow API response times
- High database connection usage
- Many similar queries in logs

**Example:**
```typescript
// BAD: N+1 query
for (const order of orders) {
  const user = await userRepository.findOne(order.userId);
  order.userName = user.name;
}

// GOOD: Eager loading
const orders = await orderRepository.find({
  relations: ['user']
});
```

**Detection:**
```bash
./scripts/performance/find-slow-queries.sh auth
```

### 2. Memory Leaks

**Common Causes:**
- Event listeners not removed
- Timers (setInterval) not cleared
- Unbounded caches
- Closures capturing large objects

**Example:**
```typescript
// BAD: Memory leak
class MyService {
  init() {
    setInterval(() => {
      this.doWork();
    }, 1000);
  }
  // No cleanup!
}

// GOOD: Proper cleanup
class MyService implements OnDestroy {
  private intervalId: NodeJS.Timeout;

  init() {
    this.intervalId = setInterval(() => {
      this.doWork();
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
```

**Detection:**
```bash
./scripts/performance/memory-profiling.sh auth 120
```

### 3. Inefficient Algorithms

**Common Issues:**
- Nested loops (O(n²))
- Linear search in loops
- Repeated sorting
- Inefficient data structures

**Example:**
```typescript
// BAD: O(n²) complexity
for (const item1 of array1) {
  for (const item2 of array2) {
    if (item1.id === item2.id) {
      // match found
    }
  }
}

// GOOD: O(n) with Map
const map = new Map(array2.map(item => [item.id, item]));
for (const item1 of array1) {
  const match = map.get(item1.id);
  if (match) {
    // match found
  }
}
```

### 4. Missing Caching

**When to Cache:**
- Expensive computations
- External API calls
- Database queries for static data
- Complex transformations

**Example:**
```typescript
// BAD: No caching
@Get('/users/:id')
async getUser(id: string) {
  return await this.userService.findById(id); // DB call every time
}

// GOOD: With caching
@Get('/users/:id')
@UseInterceptors(CacheInterceptor)
@CacheTTL(300) // 5 minutes
async getUser(id: string) {
  return await this.userService.findById(id);
}
```

### 5. Large Bundle Sizes

**Causes:**
- Importing entire libraries
- No code splitting
- Duplicate dependencies
- Unused code not tree-shaken

**Detection:**
```bash
./scripts/performance/bundle-analysis.sh admin-ui
```

## Optimization Techniques

### Database Optimization

#### 1. Use Indexes

```sql
-- Add index for frequently filtered columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Composite indexes for multiple columns
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

#### 2. Optimize Queries

```typescript
// Use select to fetch only needed fields
const users = await userRepository.find({
  select: ['id', 'name', 'email'], // Don't fetch all fields
  where: { active: true },
});

// Use query builder for complex queries
const result = await this.dataSource
  .createQueryBuilder('order')
  .leftJoinAndSelect('order.user', 'user')
  .where('order.status = :status', { status: 'pending' })
  .andWhere('order.createdAt > :date', { date: lastWeek })
  .getMany();
```

#### 3. Connection Pooling

```typescript
// TypeORM configuration
{
  type: 'postgres',
  poolSize: 20, // Adjust based on load
  maxQueryExecutionTime: 1000, // Log slow queries
}
```

### Algorithm Optimization

#### 1. Choose Right Data Structure

```typescript
// Use Set for lookups
const userIds = new Set(users.map(u => u.id));
if (userIds.has(targetId)) {
  // O(1) instead of O(n)
}

// Use Map for key-value lookups
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(targetId);
```

#### 2. Avoid Nested Loops

```typescript
// BAD: O(n²)
const matches = [];
for (const a of arrayA) {
  for (const b of arrayB) {
    if (a.id === b.id) matches.push({ a, b });
  }
}

// GOOD: O(n)
const bMap = new Map(arrayB.map(b => [b.id, b]));
const matches = arrayA
  .map(a => ({ a, b: bMap.get(a.id) }))
  .filter(m => m.b);
```

#### 3. Memoization

```typescript
// Decorator for memoization
function Memoize() {
  const cache = new Map();

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const key = JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = originalMethod.apply(this, args);
      cache.set(key, result);
      return result;
    };

    return descriptor;
  };
}

// Usage
@Memoize()
calculateExpensiveValue(input: number): number {
  // expensive calculation
  return input ** 10;
}
```

### Caching Strategies

#### 1. In-Memory Cache

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async findById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // Check cache
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) return cached;

    // Fetch from DB
    const user = await this.userRepository.findOne({ where: { id } });

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, user, 300000);

    return user;
  }
}
```

#### 2. Redis Cache

```typescript
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  constructor(private redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### 3. HTTP Caching

```typescript
@Controller('users')
export class UserController {
  @Get(':id')
  @Header('Cache-Control', 'public, max-age=300')
  @Header('ETag', 'W/"user-123"')
  async getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
```

### Frontend Optimization

#### 1. Code Splitting

```typescript
// Lazy load routes
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
  },
];
```

#### 2. Bundle Optimization

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
        },
      },
    },
  },
};
```

## Using the AI Optimizer

### Quick Start

```bash
# Run optimization analysis
npm run optimize-performance

# Or via Claude Code
/optimize-performance
```

### Analyze Specific Service

```bash
node -r ts-node/register tools/performance-analyzer/cli.ts \
  --service=packages/auth \
  --profile \
  --detect \
  --suggest
```

### Understanding AI Suggestions

AI suggestions include:

1. **Title**: Clear description of the optimization
2. **Category**: Type (database, algorithm, memory, caching, etc.)
3. **Code Diff**: Before/after code examples
4. **Estimated Impact**: Expected performance improvement (%)
5. **Complexity**: Implementation difficulty (low/medium/high)
6. **Confidence**: AI's confidence in the suggestion (0-1)
7. **Reasoning**: Why this optimization helps

### Example Output

```
Suggestion 1: Replace N+1 Query with Eager Loading
Category: database
Impact: ~65% faster query time
Complexity: low
Confidence: 95%

Code Changes:
```diff
-for (const order of orders) {
-  const user = await userRepository.findOne(order.userId);
-}
+const orders = await orderRepository.find({
+  relations: ['user']
+});
```

Reasoning: The current implementation executes N+1 queries (1 for orders,
then 1 per order for user). Using eager loading executes a single JOIN query,
reducing database round trips and improving performance significantly.
```

## Benchmarking Best Practices

### 1. Create Benchmarks

```typescript
import { BenchmarkRunner } from '../tools/performance-analyzer/benchmarks/benchmark-runner';

const runner = new BenchmarkRunner({
  iterations: 100,
  warmupRuns: 10,
  timeout: 30000,
  parallel: false,
});

// Define benchmark
const suite = BenchmarkRunner.createSuite('User Operations', [
  BenchmarkRunner.createBenchmark('Find user by ID', async () => {
    await userService.findById('123');
  }),
  BenchmarkRunner.createBenchmark('Create user', async () => {
    await userService.create({ name: 'Test', email: 'test@example.com' });
  }),
]);

// Run benchmarks
const results = await runner.runBenchmarks('./packages/user');
console.log(runner.generateReport(results));
```

### 2. Compare Before/After

```bash
# Run baseline benchmark
npm run perf:benchmark -- --service=auth > baseline.json

# Make optimizations
# ...

# Run after benchmark
npm run perf:benchmark -- --service=auth > optimized.json

# Compare
node -r ts-node/register tools/performance-analyzer/cli.ts \
  --compare baseline.json optimized.json
```

### 3. Continuous Benchmarking

Benchmarks run automatically in CI/CD on pull requests. See `.github/workflows/performance-check.yml`.

## Performance Budgets

### Setting Budgets

Edit `tools/performance-analyzer/config.json`:

```json
{
  "performanceBudgets": {
    "api": {
      "responseTime": {
        "target": 200,
        "budget": 300
      },
      "throughput": {
        "target": 1000,
        "budget": 800
      }
    },
    "frontend": {
      "firstContentfulPaint": 1500,
      "timeToInteractive": 3500,
      "totalBundleSize": 500000
    }
  }
}
```

### Enforcing Budgets

Budgets are enforced in:
- CI/CD pipeline (fails PR if exceeded)
- Performance monitoring (alerts triggered)
- Development (warnings during build)

## Monitoring and Alerting

### Grafana Dashboard

View real-time performance metrics:
```
http://grafana.orion.local/d/performance-optimization
```

Key metrics:
- Response times (P50, P95, P99)
- Memory usage by service
- CPU usage
- Database query performance
- Performance issues detected
- Optimization impact

### Alerts

Configured in `k8s/monitoring/prometheus/alerts/performance.yml`:

- High response time (P95 > 500ms for 5m)
- Memory usage > 1GB
- CPU usage > 85%
- Critical performance issues detected
- Performance regression in PR

## Case Studies

### Case Study 1: Optimizing User Service

**Problem**: User listing endpoint slow (2.5s response time)

**Analysis:**
```bash
./scripts/performance/profile-service.sh user
```

**Issues Found:**
1. N+1 query fetching user profiles
2. No pagination
3. Missing index on frequently filtered column

**Optimizations:**
1. Added eager loading for profiles
2. Implemented pagination (limit 50)
3. Added index on `last_login` column

**Results:**
- Response time: 2.5s → 180ms (93% improvement)
- Database queries: 1000+ → 2
- Memory usage: -40%

### Case Study 2: Frontend Bundle Size

**Problem**: Initial bundle size 1.2MB

**Analysis:**
```bash
./scripts/performance/bundle-analysis.sh admin-ui
```

**Issues Found:**
1. Importing entire lodash library
2. No code splitting
3. Duplicate React instances

**Optimizations:**
1. Use lodash-es with tree shaking
2. Lazy load admin routes
3. Configure webpack to dedupe React

**Results:**
- Bundle size: 1.2MB → 450KB (62% reduction)
- First Contentful Paint: 3.2s → 1.4s
- Time to Interactive: 5.8s → 2.9s

## Additional Resources

- [NestJS Performance](https://docs.nestjs.com/techniques/performance)
- [TypeORM Performance](https://typeorm.io/performance)
- [Web Performance Best Practices](https://web.dev/performance/)
- [Node.js Performance Monitoring](https://nodejs.org/api/perf_hooks.html)

## Getting Help

- Run `/optimize-performance` in Claude Code
- Check Grafana dashboards for metrics
- Review performance alerts in Slack
- Consult this guide for common patterns

---

**Last Updated**: 2025-10-18
**Maintained By**: ORION Performance Team
