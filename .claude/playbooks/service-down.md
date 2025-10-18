# Service Down Playbook

**Version:** 1.0.0
**Last Updated:** 2025-10-18
**Severity:** Typically SEV-1 or SEV-2

---

## Quick Reference

```bash
# 1. Identify which service is down
npm run health

# 2. Check service status
docker compose ps

# 3. View service logs
docker compose logs -f [service-name] --tail=100

# 4. Restart service
docker compose restart [service-name]

# 5. If restart fails, rebuild and restart
docker compose up -d --build [service-name]
```

---

## Detection

### Automated Alerts
- Health check endpoint returning 503
- No heartbeat from service for 2+ minutes
- High error rate (>50%) from dependent services
- Container restart loop detected

### Manual Detection
```bash
# Check all service health
npm run health

# Check Docker service status
docker compose ps

# Expected output:
# NAME            STATUS          PORTS
# auth            Up 2 hours      0.0.0.0:3001->3001/tcp
# gateway         Up 2 hours      0.0.0.0:3000->3000/tcp
# user            Restarting      <-- PROBLEM!
```

---

## Diagnosis Steps

### Step 1: Identify the Service

```bash
# List all services and their status
docker compose ps

# Check service health endpoint
curl http://localhost:3001/health  # Auth service
curl http://localhost:3002/health  # User service
curl http://localhost:3003/health  # Notification service

# Use health check script
npm run health
```

---

### Step 2: Check Service Logs

```bash
# View recent logs (last 100 lines)
docker compose logs [service-name] --tail=100

# Follow logs in real-time
docker compose logs -f [service-name]

# Search for errors
docker compose logs [service-name] | grep -i error

# Search for specific patterns
docker compose logs [service-name] | grep -E "(ERROR|FATAL|EXCEPTION)"

# Check logs from specific time
docker compose logs [service-name] --since "2025-10-18T14:30:00"
```

**Common Error Patterns:**
- `ECONNREFUSED` - Cannot connect to dependency (DB, Redis, etc.)
- `EADDRINUSE` - Port already in use
- `OOMKilled` - Out of memory
- `Segmentation fault` - Application crash
- `Cannot find module` - Missing dependency
- `FATAL ERROR: ... JavaScript heap out of memory` - Memory limit exceeded

---

### Step 3: Check Resource Usage

```bash
# Check container resource usage
docker stats [service-name] --no-stream

# Check host resource usage
top
# or
htop

# Check disk space
df -h

# Check memory
free -h

# Check if service was OOM killed
docker inspect [service-name] | grep OOMKilled
```

**Resource Issue Indicators:**
- CPU at 100%
- Memory usage at container limit
- Disk space < 10% free
- Too many open file descriptors

---

### Step 4: Check Dependencies

```bash
# Check database connection
docker compose exec postgres psql -U orion -c "SELECT version();"

# Check Redis connection
docker compose exec redis redis-cli PING

# Check RabbitMQ
docker compose exec rabbitmq rabbitmqctl status

# Test network connectivity between services
docker compose exec [service-name] ping postgres
docker compose exec [service-name] ping redis
```

---

### Step 5: Check Configuration

```bash
# Verify environment variables
docker compose exec [service-name] env | sort

# Check mounted volumes
docker compose exec [service-name] ls -la /app

# Verify configuration files
docker compose exec [service-name] cat /app/.env

# Check file permissions
docker compose exec [service-name] ls -la /app/dist
```

---

## Resolution Strategies

### Strategy 1: Simple Restart (Try First)

```bash
# Restart the service
docker compose restart [service-name]

# Wait 30 seconds for startup
sleep 30

# Verify service is healthy
curl http://localhost:[port]/health

# Check logs for successful startup
docker compose logs [service-name] --tail=50
```

**When to use:**
- Transient network errors
- Temporary resource exhaustion
- One-time initialization failures

---

### Strategy 2: Force Rebuild

```bash
# Stop the service
docker compose stop [service-name]

# Remove the container
docker compose rm -f [service-name]

# Rebuild and start
docker compose up -d --build [service-name]

# Monitor startup
docker compose logs -f [service-name]
```

**When to use:**
- Code changes not reflected
- Corrupted container state
- Dependency version mismatch

---

### Strategy 3: Rollback Deployment

```bash
# Check recent changes
git log --oneline --since="2 hours ago"

# Identify problematic commit
git log --oneline -10

# Revert to previous version
git revert [commit-hash]

# Rebuild affected service
npm run build:[service-name]

# Restart service
docker compose up -d --build [service-name]
```

**When to use:**
- Recent deployment caused the issue
- Clear correlation between deployment and failure
- No quick fix available

---

### Strategy 4: Scale Up / Replace Instance

```bash
# If using Docker Swarm or Kubernetes
# Remove unhealthy instance
docker compose stop [service-name]

# Start fresh instance
docker compose up -d [service-name]

# Or scale to multiple instances
docker compose up -d --scale [service-name]=3
```

**When to use:**
- Container is corrupted
- Persistent application bug
- Need to maintain uptime during debugging

---

### Strategy 5: Enable Degraded Mode

```bash
# If service has feature flags or degraded mode
docker compose exec [service-name] curl -X POST \
  http://localhost:3000/admin/feature-flags \
  -H "Content-Type: application/json" \
  -d '{"degradedMode": true}'

# Or update environment variable
# Edit docker-compose.yml
# Set DEGRADED_MODE=true
docker compose up -d [service-name]
```

**When to use:**
- Service is partially functional
- Can disable non-critical features
- Need time to investigate without full outage

---

## Service-Specific Runbooks

### Auth Service (Port 3001)

**Critical Dependencies:**
- PostgreSQL database
- Redis cache
- JWT secret configuration

**Common Issues:**

#### Database Connection Failure
```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check connection from auth service
docker compose exec auth npx prisma db push --skip-generate

# Verify database credentials
docker compose exec auth env | grep DATABASE_URL

# Check database connections
docker compose exec postgres psql -U orion -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

#### Redis Connection Issues
```bash
# Check Redis is running
docker compose exec redis redis-cli PING

# Check Redis from auth service
docker compose exec auth redis-cli -h redis PING

# Verify Redis configuration
docker compose exec auth env | grep REDIS_
```

#### JWT Issues
```bash
# Verify JWT secret is set
docker compose exec auth env | grep JWT_SECRET

# Check JWT token generation
docker compose exec auth npm run test:jwt
```

---

### Gateway Service (Port 3000)

**Critical Dependencies:**
- All backend services (auth, user, notifications)
- Redis for rate limiting

**Common Issues:**

#### Backend Service Unreachable
```bash
# Test connectivity to backend services
docker compose exec gateway curl http://auth:3001/health
docker compose exec gateway curl http://user:3002/health
docker compose exec gateway curl http://notifications:3003/health

# Check service discovery configuration
docker compose exec gateway env | grep SERVICE_URL

# Verify network connectivity
docker network inspect orion_default
```

#### Rate Limiting Issues
```bash
# Check Redis connection for rate limiting
docker compose exec gateway redis-cli -h redis INFO

# Clear rate limit cache if needed
docker compose exec redis redis-cli FLUSHDB

# Check rate limit configuration
docker compose exec gateway env | grep RATE_LIMIT
```

---

### User Service (Port 3002)

**Critical Dependencies:**
- PostgreSQL database
- Message queue (RabbitMQ)

**Common Issues:**

#### Database Migration Issues
```bash
# Check migration status
docker compose exec user npx prisma migrate status

# Run pending migrations
docker compose exec user npx prisma migrate deploy

# Reset database if needed (CAUTION: Development only!)
docker compose exec user npx prisma migrate reset --force
```

#### Message Queue Connection
```bash
# Check RabbitMQ connection
docker compose exec rabbitmq rabbitmqctl status

# Check queue depth
docker compose exec rabbitmq rabbitmqctl list_queues

# Verify user service can connect
docker compose logs user | grep -i rabbitmq
```

---

### Notification Service (Port 3003)

**Critical Dependencies:**
- PostgreSQL database
- Redis for job queue
- Message queue consumer

**Common Issues:**

#### Job Queue Backlog
```bash
# Check Redis queue depth
docker compose exec redis redis-cli LLEN bull:notifications:waiting

# Check active jobs
docker compose exec redis redis-cli LLEN bull:notifications:active

# Check failed jobs
docker compose exec redis redis-cli LLEN bull:notifications:failed

# Clear failed jobs (after investigation)
docker compose exec notifications npm run queue:clear-failed
```

#### Email/Push Notification Issues
```bash
# Check provider configuration
docker compose exec notifications env | grep SMTP_
docker compose exec notifications env | grep PUSH_

# Test email sending
docker compose exec notifications npm run test:email

# Check notification logs
docker compose logs notifications | grep -i "send"
```

---

## Verification Steps

After implementing a fix:

```bash
# 1. Verify service is running
docker compose ps [service-name]
# Expected: STATUS = Up

# 2. Check health endpoint
curl http://localhost:[port]/health
# Expected: HTTP 200, {"status": "healthy"}

# 3. Verify no errors in logs
docker compose logs [service-name] --since "5m" | grep -i error
# Expected: No critical errors

# 4. Test basic functionality
# Auth service
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# User service
curl http://localhost:3002/api/v1/users/me \
  -H "Authorization: Bearer [token]"

# 5. Check resource usage is normal
docker stats [service-name] --no-stream

# 6. Monitor for 15 minutes
watch -n 30 'curl -s http://localhost:[port]/health | jq'
```

---

## Communication Template

```
INCIDENT: [Service Name] Service Down
Severity: SEV-[1/2]
Status: [INVESTIGATING/IDENTIFIED/RESOLVED]

Impact:
- [Service] is unavailable
- Users cannot [specific functionality]
- Estimated affected users: [number/%]

Current Actions:
- [What's being done]

ETA: [Time estimate or "Under investigation"]

Workaround: [If available]
```

---

## Prevention Measures

### After Resolution

1. **Improve Health Checks**
   ```typescript
   // Add more comprehensive health checks
   @Get('health/detailed')
   async detailedHealth() {
     return {
       database: await this.checkDatabase(),
       redis: await this.checkRedis(),
       dependencies: await this.checkDependencies(),
     };
   }
   ```

2. **Add Circuit Breakers**
   ```typescript
   // Implement circuit breaker for external dependencies
   @UseInterceptors(CircuitBreakerInterceptor)
   async callExternalService() {
     // Service call
   }
   ```

3. **Improve Monitoring**
   ```yaml
   # Add Prometheus metrics
   - service_health_status
   - service_dependency_health
   - service_restart_count
   - service_error_rate
   ```

4. **Add Graceful Degradation**
   ```typescript
   // Return cached data if service is unavailable
   try {
     return await this.service.getData();
   } catch (error) {
     return await this.cache.getStaleData();
   }
   ```

---

## Escalation

Escalate to Engineering Lead if:
- Service cannot be restarted after 3 attempts
- Root cause is unclear after 30 minutes
- Multiple services are affected
- Data corruption suspected
- Issue requires infrastructure changes

---

## Related Playbooks

- [Incident Response](./incident-response.md) - General incident procedures
- [Database Issues](./database-issues.md) - Database-specific problems
- [High Load](./high-load.md) - Performance and scaling issues
- [Security Incident](./security-incident.md) - Security-related outages

---

## Appendix: Service Port Reference

| Service | Port | Health Endpoint |
|---------|------|-----------------|
| Gateway | 3000 | `http://localhost:3000/health` |
| Auth | 3001 | `http://localhost:3001/health` |
| User | 3002 | `http://localhost:3002/health` |
| Notifications | 3003 | `http://localhost:3003/health` |
| Admin UI | 3004 | `http://localhost:3004/health` |
| Analytics | 3005 | `http://localhost:3005/health` |

---

**Last Updated:** 2025-10-18
**Owner:** Platform Team
