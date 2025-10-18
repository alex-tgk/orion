# Runbook: Service Down

## Alert

**Alert Name**: ServiceDown
**Severity**: Critical
**Description**: A microservice is not responding to health checks

## Symptoms

- Service health check failing
- Increased error rates from dependent services
- Users unable to access features provided by the service

## Impact

**Severity**: Critical
**Affected Users**: All users of the service
**Business Impact**: Service functionality unavailable

## Diagnosis

### 1. Verify the Alert

```bash
# Check service status
curl http://SERVICE_HOST:PORT/health

# Check container status
docker ps -a | grep orion-SERVICE_NAME

# Check Kubernetes pod status (if applicable)
kubectl get pods -n orion-production | grep SERVICE_NAME
```

### 2. Check Service Logs

```bash
# Docker logs
docker logs orion-SERVICE_NAME --tail=100

# Kubernetes logs
kubectl logs -n orion-production SERVICE_NAME --tail=100

# Check for common error patterns
docker logs orion-SERVICE_NAME 2>&1 | grep -i "error\|exception\|fatal"
```

### 3. Check Dependencies

```bash
# Check database connectivity
docker exec orion-postgres pg_isready

# Check Redis
docker exec orion-redis redis-cli ping

# Check RabbitMQ
docker exec orion-rabbitmq rabbitmq-diagnostics ping
```

### 4. Check Resource Usage

```bash
# Check memory and CPU
docker stats orion-SERVICE_NAME --no-stream

# Check disk space
df -h

# Check Grafana dashboard for resource metrics
```

## Resolution

### Scenario 1: Container Crashed

```bash
# Restart the container
docker restart orion-SERVICE_NAME

# Or restart via docker-compose
docker-compose restart SERVICE_NAME

# Kubernetes restart
kubectl rollout restart deployment/SERVICE_NAME -n orion-production
```

### Scenario 2: Database Connection Issues

```bash
# Verify database is running
docker ps | grep postgres

# Check database logs
docker logs orion-postgres --tail=50

# Restart database if needed
docker restart orion-postgres

# Wait for database to be ready
docker exec orion-postgres pg_isready

# Restart affected service
docker restart orion-SERVICE_NAME
```

### Scenario 3: Out of Memory

```bash
# Check memory usage
docker stats orion-SERVICE_NAME --no-stream

# Increase memory limit in docker-compose.yml
# Or scale horizontally in Kubernetes

# Restart with new limits
docker-compose up -d SERVICE_NAME
```

### Scenario 4: Application Error

```bash
# Check application logs for stack trace
docker logs orion-SERVICE_NAME --tail=200 | grep -A 20 "ERROR"

# If recent deployment caused issue
git log --oneline -5
git diff HEAD~1

# Rollback to previous version
kubectl rollout undo deployment/SERVICE_NAME -n orion-production

# Or rebuild from previous commit
git checkout PREVIOUS_COMMIT
docker-compose build SERVICE_NAME
docker-compose up -d SERVICE_NAME
```

## Mitigation

### Immediate Actions

1. **Page on-call engineer** if not already alerted
2. **Check incident timeline** - was there a recent deployment?
3. **Enable circuit breakers** for dependent services
4. **Scale up** healthy instances if possible
5. **Communicate** status in #orion-incidents Slack channel

### Temporary Workarounds

1. **Route traffic** to backup region/cluster
2. **Enable maintenance mode** if complete outage
3. **Cache** responses at API Gateway level
4. **Disable** non-critical features dependent on service

## Prevention

### Short-term

1. Add health check monitoring
2. Implement circuit breakers
3. Add retry logic with exponential backoff
4. Improve error logging

### Long-term

1. Implement chaos engineering tests
2. Add automated rollback on failed health checks
3. Improve resource allocation and auto-scaling
4. Add comprehensive integration tests
5. Implement canary deployments

## Validation

### Service is Healthy

```bash
# Verify health check
curl http://SERVICE_HOST:PORT/health
# Expected: {"status": "ok"}

# Check Prometheus
curl 'http://prometheus:9090/api/v1/query?query=up{job="SERVICE_NAME"}'
# Expected: value = 1

# Check recent error rates
curl 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total{service="SERVICE_NAME",status=~"5.."}[5m])'
# Expected: value = 0 or very low
```

### Dependent Services Working

```bash
# Test end-to-end flow
curl -X POST http://gateway:3000/api/test-endpoint

# Check dependent service logs
docker logs orion-DEPENDENT_SERVICE --tail=20

# Verify no errors in Grafana dashboard
```

## Escalation

### Level 1: DevOps Engineer (15 minutes)
- Restart service
- Check logs
- Verify infrastructure

### Level 2: Backend Team Lead (30 minutes)
- Deep dive into application logs
- Review recent code changes
- Coordinate rollback if needed

### Level 3: Engineering Manager (1 hour)
- Engage additional team members
- Coordinate with other teams
- Prepare customer communication

### Level 4: CTO (2 hours)
- Major incident coordination
- Customer communication
- Post-mortem planning

## Post-Incident

### Required Actions

1. **Create incident report** in Jira
2. **Update runbook** with learnings
3. **Schedule post-mortem** meeting
4. **Implement preventive measures**
5. **Update monitoring/alerting** as needed

### Post-Mortem Template

```markdown
# Incident Post-Mortem: Service Down

## Summary
Brief description of incident

## Timeline
- HH:MM - Alert fired
- HH:MM - Engineer acknowledged
- HH:MM - Root cause identified
- HH:MM - Service restored

## Root Cause
Detailed explanation

## Impact
- Duration: X minutes
- Users affected: Y
- Revenue impact: $Z

## What Went Well
-
-

## What Went Wrong
-
-

## Action Items
1. [ ] Task 1 (Owner: XX, Due: DATE)
2. [ ] Task 2 (Owner: YY, Due: DATE)
```

## Related Runbooks

- [High Error Rate](./high-error-rate.md)
- [Database Down](./postgres-down.md)
- [High Latency](./high-latency.md)

## Related Alerts

- HighErrorRate
- ServiceHealthCheckFailing
- HighLatency

## Monitoring

- **Grafana Dashboard**: System Overview
- **Logs**: Loki query: `{service="SERVICE_NAME"} |= "error"`
- **Traces**: Jaeger service view
- **Metrics**: Prometheus query: `up{job="SERVICE_NAME"}`
