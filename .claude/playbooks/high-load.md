# High Load Playbook

**Version:** 1.0.0
**Last Updated:** 2025-10-18
**Severity:** Typically SEV-2 or SEV-3

---

## Quick Reference

```bash
# 1. Check current load
docker stats --no-stream

# 2. Check request rates
npm run metrics

# 3. Scale critical services
docker compose up -d --scale gateway=3 --scale auth=2

# 4. Enable rate limiting
# (Edit service configuration)

# 5. Check resource bottlenecks
docker compose exec [service] top
```

---

## Detection

### Automated Alerts
- CPU usage > 80% for 5+ minutes
- Memory usage > 90%
- Response time P95 > 2 seconds
- Error rate > 5%
- Request queue depth > 1000
- Database connection pool exhausted

### Manual Detection
```bash
# Check system resources
docker stats --no-stream

# Check service response times
time curl http://localhost:3000/health

# Check request rates
npm run metrics

# Check error logs
docker compose logs --tail=100 | grep -i error
```

---

## Diagnosis

### Step 1: Identify the Bottleneck

```bash
# Check overall system load
docker stats --no-stream

# Check specific service load
docker stats [service-name] --no-stream

# Check CPU usage per service
docker compose exec [service] top -bn1 | head -20

# Check memory usage
docker compose exec [service] free -h

# Check disk I/O
docker compose exec [service] iostat -x 1 5
```

**Bottleneck Indicators:**
- **CPU-bound**: CPU near 100%, I/O wait low
- **Memory-bound**: High memory usage, swap usage increasing
- **I/O-bound**: High I/O wait, disk queue depth high
- **Network-bound**: High network throughput, packet loss
- **Database-bound**: High database CPU/memory, slow queries

---

### Step 2: Analyze Request Patterns

```bash
# Check request distribution
docker compose logs gateway --since "5m" | \
  grep "GET\|POST\|PUT\|DELETE" | \
  awk '{print $X}' | sort | uniq -c | sort -rn

# Check slowest endpoints
docker compose logs gateway --since "5m" | \
  grep "duration" | sort -k duration -rn | head -20

# Check error rates by endpoint
docker compose logs gateway --since "5m" | \
  grep -E "500|502|503|504" | wc -l

# Check rate limit hits
docker compose logs gateway --since "5m" | \
  grep "429" | wc -l
```

---

### Step 3: Check External Dependencies

```bash
# Check database load
docker compose exec postgres psql -U orion -c "
  SELECT
    count(*) as active_queries,
    count(*) filter (where wait_event_type IS NOT NULL) as waiting_queries
  FROM pg_stat_activity
  WHERE state = 'active';
"

# Check Redis memory
docker compose exec redis redis-cli INFO memory

# Check message queue depth
docker compose exec rabbitmq rabbitmqctl list_queues

# Test external API latency
time curl -s http://external-api.example.com/health
```

---

### Step 4: Profile Application

```bash
# Enable Node.js profiling
docker compose exec [service] node --prof app.js

# Generate flame graph (if available)
npm run profile:start

# Check event loop delay
docker compose exec [service] npm run metrics:event-loop

# Check garbage collection
docker compose exec [service] node --trace-gc app.js
```

---

## Resolution Strategies

### Strategy 1: Horizontal Scaling (Quick Win)

```bash
# Scale gateway service
docker compose up -d --scale gateway=5

# Scale auth service
docker compose up -d --scale auth=3

# Scale user service
docker compose up -d --scale user=3

# Verify scaling
docker compose ps

# Check load distribution
docker stats --no-stream
```

**When to use:**
- Stateless services
- Load can be distributed
- Infrastructure can handle more containers
- Quick temporary relief needed

---

### Strategy 2: Enable Caching

```bash
# Enable Redis caching for frequently accessed data
docker compose exec [service] npm run cache:enable

# Configure cache TTL
docker compose exec [service] npm run cache:configure -- --ttl=300

# Clear cache if needed
docker compose exec redis redis-cli FLUSHDB
```

**Caching Strategy:**
```typescript
// Add caching to expensive operations
@Cacheable({
  ttl: 300, // 5 minutes
  key: 'user-profile',
})
async getUserProfile(userId: string) {
  return await this.userService.findOne(userId);
}

// Implement cache-aside pattern
async getData(key: string) {
  // Try cache first
  let data = await this.cache.get(key);
  if (!data) {
    // Fetch from database
    data = await this.database.query(key);
    // Store in cache
    await this.cache.set(key, data, 300);
  }
  return data;
}
```

---

### Strategy 3: Implement Rate Limiting

```bash
# Enable aggressive rate limiting during high load
docker compose exec gateway npm run rate-limit:enable

# Configure limits
docker compose exec gateway npm run rate-limit:configure \
  --default=50 \
  --auth=10 \
  --public=20
```

**Rate Limiting Configuration:**
```typescript
// In gateway configuration
const rateLimits = {
  // Stricter limits during high load
  '/api/v1/auth/*': { limit: 10, window: 60 },     // 10 req/min
  '/api/v1/users/*': { limit: 50, window: 60 },    // 50 req/min
  '/api/v1/public/*': { limit: 20, window: 60 },   // 20 req/min
  default: { limit: 50, window: 60 }               // 50 req/min
};
```

---

### Strategy 4: Database Optimization

```bash
# Add database connection pooling
docker compose exec [service] npm run db:configure-pool \
  --min=5 \
  --max=50 \
  --idle=10000

# Add query caching
docker compose exec postgres psql -U orion -c "
  ALTER SYSTEM SET shared_buffers = '512MB';
  ALTER SYSTEM SET effective_cache_size = '2GB';
"

# Restart database
docker compose restart postgres

# Add missing indexes
docker compose exec postgres psql -U orion -c "
  CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
"

# Vacuum database
docker compose exec postgres psql -U orion -c "VACUUM ANALYZE;"
```

---

### Strategy 5: Circuit Breaker Pattern

```typescript
// Implement circuit breaker for failing dependencies
import { Injectable } from '@nestjs/common';
import CircuitBreaker from 'opossum';

@Injectable()
export class ExternalApiService {
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker(this.callApi, {
      timeout: 3000,          // Timeout after 3s
      errorThresholdPercentage: 50,  // Open after 50% errors
      resetTimeout: 30000,    // Try again after 30s
    });
  }

  async callApi() {
    // API call logic
  }

  async safeCall() {
    try {
      return await this.circuitBreaker.fire();
    } catch (error) {
      // Return cached data or default response
      return this.getFallbackData();
    }
  }
}
```

---

### Strategy 6: Load Shedding

```typescript
// Implement priority-based load shedding
@Injectable()
export class LoadSheddingMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const systemLoad = await this.getSystemLoad();

    if (systemLoad > 90) {
      // Reject low-priority requests
      if (this.isLowPriority(req)) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          retryAfter: 60,
        });
      }
    }

    if (systemLoad > 95) {
      // Reject medium-priority requests
      if (!this.isHighPriority(req)) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          retryAfter: 120,
        });
      }
    }

    next();
  }

  private isHighPriority(req: Request): boolean {
    // Authentication, critical business operations
    return req.path.startsWith('/api/v1/auth') ||
           req.path.startsWith('/api/v1/payments');
  }
}
```

---

### Strategy 7: Optimize Heavy Operations

```bash
# Identify slow operations
docker compose logs [service] --since "5m" | \
  grep "duration" | awk '{print $duration}' | sort -rn | head -20

# Profile Node.js application
docker compose exec [service] node --inspect app.js

# Analyze and optimize
```

**Optimization Techniques:**

```typescript
// 1. Batch operations
// Bad: N queries
for (const userId of userIds) {
  await this.userService.findOne(userId);
}

// Good: 1 query
await this.userService.findMany({ where: { id: { in: userIds } } });

// 2. Lazy loading
// Bad: Load everything
const user = await this.userService.findOne(id, {
  include: { posts: true, comments: true, likes: true }
});

// Good: Load only what's needed
const user = await this.userService.findOne(id);
if (needPosts) {
  user.posts = await this.postService.findByUser(id);
}

// 3. Pagination
// Bad: Load all records
const users = await this.userService.findAll();

// Good: Paginate
const users = await this.userService.findAll({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// 4. Async processing
// Bad: Process synchronously
await this.sendEmail(user);
await this.updateAnalytics(user);
await this.notifyAdmins(user);

// Good: Process async via queue
await this.queue.add('send-email', { userId: user.id });
await this.queue.add('update-analytics', { userId: user.id });
await this.queue.add('notify-admins', { userId: user.id });
```

---

### Strategy 8: Content Delivery Optimization

```typescript
// 1. Enable compression
app.use(compression());

// 2. Add ETag caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
});

// 3. Implement CDN for static assets
// Configure CloudFront/Cloudflare

// 4. Use streaming for large responses
@Get('large-data')
async streamLargeData(@Res() res: Response) {
  const stream = await this.dataService.getDataStream();
  stream.pipe(res);
}
```

---

## Traffic Management

### Gradual Traffic Routing

```bash
# If using Kubernetes/Docker Swarm
# Route 90% to stable, 10% to new instance
docker service update --replicas 9 orion_gateway_stable
docker service update --replicas 1 orion_gateway_new

# Monitor new instance
watch -n 5 'docker stats orion_gateway_new --no-stream'

# Gradually increase traffic
docker service scale orion_gateway_new=3 orion_gateway_stable=7
```

---

### Geographic Load Balancing

```bash
# Route traffic based on user location
# Configure DNS-based routing or CDN edge locations

# Example: CloudFlare configuration
# North America → US-East region
# Europe → EU-West region
# Asia → AP-Southeast region
```

---

## Monitoring During High Load

### Real-Time Metrics

```bash
# Monitor all services
watch -n 5 'docker stats --no-stream'

# Monitor specific service
watch -n 1 'docker stats gateway --no-stream'

# Monitor request rate
watch -n 5 'docker compose logs gateway --since "1m" | grep -c "GET\|POST"'

# Monitor error rate
watch -n 5 'docker compose logs gateway --since "1m" | grep -c "500\|502\|503"'

# Monitor database connections
watch -n 5 'docker compose exec postgres psql -U orion -c "SELECT count(*) FROM pg_stat_activity;"'
```

---

### Alert Stakeholders

```markdown
HIGH LOAD ALERT
Severity: SEV-2
Status: MONITORING

Current Load:
- Request rate: 5000 req/min (normal: 1000)
- CPU usage: 85% (normal: 40%)
- Response time P95: 1.2s (normal: 0.3s)

Actions Taken:
- Scaled gateway to 5 instances
- Enabled aggressive caching
- Increased rate limits

Status: System stable but elevated load
Monitoring: Continuous
Next update: In 30 minutes
```

---

## Load Testing

### Simulate High Load

```bash
# Install load testing tool
npm install -g artillery

# Create load test scenario
cat > load-test.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
    - duration: 60
      arrivalRate: 200
      name: "Spike"

scenarios:
  - name: "User flow"
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "test@example.com"
            password: "password"
      - get:
          url: "/api/v1/users/me"
EOF

# Run load test
artillery run load-test.yml

# Alternative: Use k6
k6 run --vus 100 --duration 5m load-test.js
```

---

## Capacity Planning

### Calculate Resource Needs

```bash
# Measure baseline metrics
# - Requests per second per instance
# - CPU per request
# - Memory per request
# - Database queries per request

# Example calculation:
# Current: 100 req/s per instance at 50% CPU
# Target: 1000 req/s
# Required instances: 1000 / 100 = 10 instances
# With 50% headroom: 15 instances
```

---

### Auto-Scaling Configuration

```yaml
# Docker Swarm example
services:
  gateway:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      update_config:
        parallelism: 2
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Prevention Measures

### 1. Implement Queue-Based Processing

```typescript
// Offload heavy processing to queues
@Injectable()
export class UserService {
  async createUser(userData: CreateUserDto) {
    // Quick database insert
    const user = await this.prisma.user.create({ data: userData });

    // Offload to queues
    await this.emailQueue.add('welcome-email', { userId: user.id });
    await this.analyticsQueue.add('user-created', { userId: user.id });
    await this.notificationQueue.add('notify-admins', { userId: user.id });

    return user; // Return immediately
  }
}
```

---

### 2. Add Response Caching

```typescript
// Cache expensive computations
@Injectable()
export class AnalyticsService {
  @Cacheable({ ttl: 3600, key: 'dashboard-stats' })
  async getDashboardStats() {
    // Expensive aggregation query
    return await this.prisma.$queryRaw`
      SELECT ...
    `;
  }
}
```

---

### 3. Database Read Replicas

```typescript
// Route reads to replicas
export class DatabaseService {
  async read(query) {
    return await this.readReplica.query(query);
  }

  async write(query) {
    return await this.primary.query(query);
  }
}
```

---

## Escalation Criteria

Escalate to Infrastructure Team if:
- Auto-scaling not sufficient
- Need infrastructure changes (more servers, regions)
- Database can't handle load
- Network bandwidth saturated
- CDN changes required

---

## Related Playbooks

- [Incident Response](./incident-response.md) - General incident procedures
- [Database Issues](./database-issues.md) - Database performance issues
- [Service Down](./service-down.md) - Service outage handling

---

**Last Updated:** 2025-10-18
**Owner:** Platform Team
