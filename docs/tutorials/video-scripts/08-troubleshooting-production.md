# Tutorial 08: Troubleshooting Production Issues

**Duration**: 25 minutes
**Level**: Advanced
**Prerequisites**: All previous tutorials, production deployment experience

## Learning Objectives

- Follow systematic incident response procedures
- Diagnose common production issues
- Use monitoring tools for root cause analysis
- Handle database performance problems
- Detect and resolve memory leaks
- Conduct effective post-incident reviews

## Tutorial Outline

### Part 1: Incident Response Framework (5 minutes)
### Part 2: Common Production Issues (10 minutes)
### Part 3: Diagnostic Tools & Techniques (7 minutes)
### Part 4: Post-Incident Analysis (3 minutes)

---

## Part 1: Incident Response Framework

### Incident Severity Levels

**P0 - Critical**
- Complete service outage
- Data loss or corruption
- Security breach
- Response time: Immediate

**P1 - High**
- Partial service degradation
- High error rates (>5%)
- Performance issues affecting users
- Response time: <15 minutes

**P2 - Medium**
- Minor functionality issues
- Non-critical feature failures
- Response time: <1 hour

**P3 - Low**
- Minor bugs
- Cosmetic issues
- Response time: <1 day

### Incident Response Steps

1. **Detect** - Alert triggers or user report
2. **Acknowledge** - Confirm issue and severity
3. **Diagnose** - Identify root cause
4. **Mitigate** - Restore service
5. **Resolve** - Fix underlying issue
6. **Review** - Post-incident analysis

---

## Part 2: Common Production Issues

### Issue 1: High CPU Usage

**Symptoms:**
```bash
# Check pod CPU usage
kubectl top pods -n orion-prod

NAME                            CPU(cores)   MEMORY(bytes)
task-service-7d9f4c8b9-abc12    950m         256Mi  # High!
```

**Diagnosis:**
```bash
# Check logs for patterns
kubectl logs task-service-7d9f4c8b9-abc12 -n orion-prod --tail=1000 | grep ERROR

# Profile the application
kubectl exec -it task-service-7d9f4c8b9-abc12 -n orion-prod -- node --prof
```

**Common Causes:**
- Infinite loops
- Heavy computation
- Inefficient algorithms
- Too many concurrent requests

**Solutions:**
```bash
# Scale horizontally
kubectl scale deployment task-service --replicas=5 -n orion-prod

# Add resource limits
# Update deployment with appropriate CPU requests/limits
```

### Issue 2: Memory Leak

**Symptoms:**
```bash
# Memory usage climbing over time
kubectl top pods -n orion-prod --watch

NAME                            MEMORY(bytes)
task-service-7d9f4c8b9-abc12    450Mi  # Growing
task-service-7d9f4c8b9-abc12    485Mi
task-service-7d9f4c8b9-abc12    520Mi  # Still growing!
```

**Diagnosis:**
```typescript
// Add memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  logger.info('Memory usage', {
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(usage.external / 1024 / 1024) + 'MB',
  });
}, 60000);
```

**Common Causes:**
- Event listeners not removed
- Large caches without limits
- Circular references
- Database connections not closed

**Solutions:**
```typescript
// Implement cache limits
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500,
  maxAge: 1000 * 60 * 60, // 1 hour
});

// Always clean up listeners
class TaskService {
  private emitter = new EventEmitter();

  async create() {
    const handler = () => { /* ... */ };
    this.emitter.on('task.created', handler);

    try {
      // Do work
    } finally {
      this.emitter.off('task.created', handler); // Clean up!
    }
  }
}
```

### Issue 3: Database Connection Pool Exhausted

**Symptoms:**
```
Error: P1001: Timed out trying to acquire a connection from the pool
```

**Diagnosis:**
```bash
# Check active connections
kubectl exec -it postgres-0 -n orion-prod -- psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"

# View connection details
kubectl exec -it postgres-0 -n orion-prod -- psql -U postgres -c \
  "SELECT datname, usename, application_name, state, query FROM pg_stat_activity;"
```

**Solutions:**
```typescript
// Configure Prisma connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Adjust pool size based on load
  connection: {
    pool: {
      min: 5,
      max: 20, // Increased from default 10
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
    },
  },
});

// Always close connections properly
async function cleanup() {
  await prisma.$disconnect();
}

process.on('beforeExit', cleanup);
```

### Issue 4: Slow Database Queries

**Symptoms:**
```
Query execution time: 5432ms (expected < 100ms)
```

**Diagnosis:**
```bash
# Enable query logging
# In PostgreSQL config:
log_min_duration_statement = 1000  # Log queries > 1s

# View slow queries
kubectl logs postgres-0 -n orion-prod | grep "duration:" | sort -k3 -n
```

```sql
-- Find missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
AND n_distinct > 100  -- High cardinality
AND correlation < 0.1; -- Low correlation

-- Check table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_tasks_user_status
ON tasks(userId, status)
WHERE status != 'DONE';

-- Update statistics
ANALYZE tasks;

-- Vacuum to reclaim space
VACUUM ANALYZE tasks;
```

### Issue 5: High Error Rate

**Symptoms:**
```
Alert: Error rate > 5% for last 5 minutes
```

**Diagnosis:**
```bash
# Check error logs
kubectl logs -l app=task-service -n orion-prod \
  --since=10m | grep ERROR | head -50

# Group errors by type
kubectl logs -l app=task-service -n orion-prod \
  --since=10m | grep ERROR | cut -d: -f2 | sort | uniq -c | sort -rn
```

**Common Patterns:**
- External service timeouts
- Database connection errors
- Validation failures
- Authentication errors

**Solutions:**
```typescript
// Implement circuit breaker
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(externalApiCall, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => {
  return { data: cachedResponse };
});

// Add retries with exponential backoff
import retry from 'async-retry';

await retry(
  async () => {
    return await externalService.call();
  },
  {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000,
  }
);
```

---

## Part 3: Diagnostic Tools

### Essential Commands

```bash
# Pod diagnostics
kubectl describe pod <pod-name> -n orion-prod
kubectl logs <pod-name> -n orion-prod --tail=100 --follow
kubectl exec -it <pod-name> -n orion-prod -- /bin/sh

# Resource usage
kubectl top nodes
kubectl top pods -n orion-prod
kubectl get hpa -n orion-prod  # Horizontal Pod Autoscaler

# Events
kubectl get events -n orion-prod --sort-by='.lastTimestamp'

# Network debugging
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- /bin/bash
# Inside container:
curl http://task-service/health
nslookup task-service
```

### Prometheus Queries

```promql
# Error rate by service
rate(http_requests_total{status=~"5.."}[5m])

# Response time P95
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)

# Memory usage trend
container_memory_usage_bytes{pod=~"task-service.*"}

# Request rate
rate(http_requests_total[5m])
```

### Jaeger Trace Analysis

```bash
# Find slow traces
# In Jaeger UI:
# 1. Select service: task-service
# 2. Set min duration: 1000ms
# 3. Look for:
#    - Long database queries
#    - External API calls
#    - Cache misses
```

---

## Part 4: Post-Incident Review

### Incident Report Template

```markdown
# Incident Report: [Title]

**Date**: 2025-10-18
**Duration**: 2 hours 15 minutes
**Severity**: P1 (High)
**Services Affected**: task-service, notification-service

## Summary
Brief description of what happened

## Timeline
- 14:00 - Alert triggered: High error rate
- 14:05 - On-call engineer acknowledged
- 14:15 - Root cause identified: Database connection pool exhaustion
- 14:30 - Mitigation: Scaled up replicas, increased pool size
- 16:15 - Fully resolved: All metrics normal

## Root Cause
Database connection pool size (10) was insufficient for traffic spike.
Connections were not being released due to missing error handling in cleanup code.

## Impact
- 2,500 requests failed (5% error rate)
- Average response time increased from 150ms to 3000ms
- No data loss

## Resolution
1. Increased connection pool size from 10 to 20
2. Added proper connection cleanup in error handlers
3. Implemented connection monitoring alerts

## Action Items
- [ ] Add connection pool metrics to dashboard
- [ ] Implement automatic scaling based on connection usage
- [ ] Review all services for similar issues
- [ ] Add integration test for connection cleanup

## Lessons Learned
- Need better visibility into connection pool usage
- Error handling must include resource cleanup
- Load testing should include connection pool stress tests
```

---

## Runbook Examples

### Service Not Starting

```bash
# 1. Check pod status
kubectl get pods -n orion-prod -l app=task-service

# 2. View pod events
kubectl describe pod <pod-name> -n orion-prod

# 3. Check logs
kubectl logs <pod-name> -n orion-prod

# Common issues:
# - Image pull errors → Check registry access
# - CrashLoopBackOff → Check application logs
# - Pending → Check resource availability
```

### Database Migration Failure

```bash
# 1. Check migration status
kubectl logs <pod-name> -n orion-prod | grep migration

# 2. Connect to database
kubectl exec -it postgres-0 -n orion-prod -- psql -U postgres

# 3. Check migration table
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;

# 4. Fix and retry
# Option A: Rollback and rerun
npx prisma migrate resolve --rolled-back <migration>
npx prisma migrate deploy

# Option B: Mark as applied if manually fixed
npx prisma migrate resolve --applied <migration>
```

---

## Quick Reference

### HTTP Status Codes
- 400-499: Client errors (check request validation)
- 500-502: Application errors (check logs)
- 503: Service unavailable (check health endpoint)
- 504: Gateway timeout (check upstream services)

### Common Log Patterns
- `ECONNREFUSED`: Service not running or wrong port
- `ETIMEDOUT`: Network issue or slow response
- `ENOTFOUND`: DNS resolution failed
- `SequelizeConnectionError`: Database connection issue
- `P1001`: Prisma connection timeout

---

**Script Version**: 1.0
**Last Updated**: October 2025
**Estimated Recording Time**: 30 minutes
