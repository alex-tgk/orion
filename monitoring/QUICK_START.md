# ORION Monitoring - Quick Start Guide

Get monitoring up and running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- ORION services running

## Step 1: Configure Environment (1 min)

```bash
cd monitoring
cp .env.example .env
nano .env  # Update GRAFANA_ADMIN_PASSWORD and notification channels
```

Minimum required:
```bash
GRAFANA_ADMIN_PASSWORD=your-secure-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

## Step 2: Start Monitoring Stack (2 min)

```bash
./start-monitoring.sh
```

Wait for health checks to pass.

## Step 3: Access Grafana (30 sec)

1. Open http://localhost:3100
2. Login: `admin` / (password from .env)
3. Navigate to **Dashboards → Browse**
4. Open **ORION - System Overview**

## Step 4: Add Metrics to Services (1 min per service)

### A. Install Dependencies

```bash
cd packages/auth  # or any service
pnpm add prom-client
```

### B. Update Code

```typescript
// src/main.ts
import { MetricsInterceptor } from '@orion/shared/metrics';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add this line
  app.useGlobalInterceptors(app.get(MetricsInterceptor));

  await app.listen(3001);
}
```

```typescript
// src/app/app.module.ts
import { MetricsModule } from '@orion/shared/metrics';

@Module({
  imports: [
    MetricsModule,  // Add this
    // ... other modules
  ],
})
export class AppModule {}
```

### C. Set Environment Variable

```bash
# In docker-compose.yml or .env
SERVICE_NAME=auth  # or gateway, user, notifications
```

### D. Restart Service

```bash
docker-compose restart auth
```

## Step 5: Verify (30 sec)

### Check Metrics Endpoint

```bash
curl http://localhost:3001/api/auth/metrics
```

Should return Prometheus metrics format.

### Check Prometheus Targets

1. Open http://localhost:9090
2. Go to **Status → Targets**
3. Verify service is UP

### Check Grafana Dashboard

1. Open **System Overview** dashboard
2. Service should show as UP
3. Request metrics should appear after some traffic

## Done! 🎉

You now have:
- ✅ Metrics collection
- ✅ Visualization dashboards
- ✅ Alert rules configured
- ✅ Health monitoring

## Next Steps

### 1. Configure Alerts (5 min)

```bash
# Update AlertManager with your notification channels
nano monitoring/alertmanager/alertmanager.yml

# Update Slack webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Restart AlertManager
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### 2. Add Tracing (10 min)

```bash
cd packages/auth
pnpm add @opentelemetry/api \
         @opentelemetry/sdk-node \
         @opentelemetry/auto-instrumentations-node \
         @opentelemetry/exporter-trace-otlp-http
```

Create `src/tracing.ts`:
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

Import in `main.ts`:
```typescript
import './tracing';  // Must be first!
import { NestFactory } from '@nestjs/core';
// ... rest of imports
```

### 3. Review Dashboards (5 min)

Explore pre-configured dashboards:
- System Overview
- Service Performance
- Infrastructure Metrics

### 4. Test Alerts (5 min)

Trigger a test alert:
```bash
# Stop a service
docker-compose stop auth

# Wait 2 minutes
# Check Slack for alert

# Restart service
docker-compose start auth
```

## Common Commands

### View Logs
```bash
# All monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml logs -f

# Specific service
docker logs orion-prometheus -f
```

### Restart Services
```bash
# Restart monitoring stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml restart

# Restart single component
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Stop Monitoring
```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml down
```

### Check Service Health
```bash
# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3100/api/health

# Loki
curl http://localhost:3101/ready

# Tempo
curl http://localhost:3102/ready
```

## Useful Queries

### In Prometheus (http://localhost:9090)

```promql
# Request rate
sum(rate(http_requests_total[5m])) by (service)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)

# P95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le))

# Service status
up{job=~"auth|gateway|user|notifications"}
```

### In Loki (via Grafana)

```logql
# All logs from auth service
{service="auth"}

# Errors only
{service="auth"} |= "error"

# By log level
{service="auth"} | json | level="error"
```

## Troubleshooting

### Services Not Showing in Prometheus

1. Check service exposes `/metrics`:
   ```bash
   curl http://localhost:3001/api/auth/metrics
   ```

2. Check Prometheus config:
   ```bash
   docker exec orion-prometheus cat /etc/prometheus/prometheus.yml
   ```

3. Check Prometheus logs:
   ```bash
   docker logs orion-prometheus
   ```

### Grafana Dashboards Empty

1. Check datasource connection:
   ```bash
   curl -u admin:admin http://localhost:3100/api/datasources
   ```

2. Test Prometheus query:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=up'
   ```

3. Verify time range in Grafana (top right)

### Alerts Not Firing

1. Check AlertManager is running:
   ```bash
   docker ps | grep alertmanager
   ```

2. Check alert rules loaded:
   ```bash
   curl http://localhost:9090/api/v1/rules
   ```

3. Check AlertManager config:
   ```bash
   docker exec orion-alertmanager cat /etc/alertmanager/alertmanager.yml
   ```

## Resources

- **Full Documentation**: `/monitoring/README.md`
- **Setup Guide**: `/monitoring/docs/SETUP_GUIDE.md`
- **Metrics Reference**: `/monitoring/docs/METRICS_REFERENCE.md`
- **Runbooks**: `/monitoring/docs/runbooks/`

## Support

Need help? Check:
1. Documentation in `/monitoring/docs/`
2. Logs: `docker-compose logs`
3. Slack: #orion-monitoring

---

**Time to Production Monitoring**: ~15 minutes
**Services Covered**: All microservices + infrastructure
**Metrics Collected**: 27+ metric types
**Alerts Configured**: 25+ rules
**Dashboards**: System overview + templates
