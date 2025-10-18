# ORION Monitoring Setup Guide

Complete guide to setting up monitoring and observability for the ORION platform.

## Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM available for monitoring stack
- 50GB free disk space for metrics/logs storage
- Access to ORION source code

## Installation Steps

### 1. Clone and Navigate

```bash
cd /path/to/orion
cd monitoring
```

### 2. Configure Environment Variables

Create a `.env` file in the monitoring directory:

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

Required variables:

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change-me-please

# AlertManager Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_SERVICE_KEY=your-pagerduty-key
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=alerts@yourcompany.com
SMTP_PASSWORD=your-smtp-password

# Database (for exporters)
DB_USER=orion
DB_PASSWORD=your-db-password
DB_NAME=orion_dev

# Redis
REDIS_PASSWORD=your-redis-password

# RabbitMQ
RABBITMQ_USER=orion
RABBITMQ_PASSWORD=your-rabbitmq-password

# Environment
ENVIRONMENT=development
REGION=us-east-1
```

### 3. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify all services are running
docker-compose -f docker-compose.monitoring.yml ps

# Check logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 4. Verify Services

```bash
# Prometheus
curl http://localhost:9090/-/healthy
# Expected: Prometheus is Healthy.

# Grafana
curl http://localhost:3100/api/health
# Expected: {"database":"ok","version":"..."}

# AlertManager
curl http://localhost:9093/-/healthy
# Expected: OK

# Loki
curl http://localhost:3101/ready
# Expected: ready

# Tempo
curl http://localhost:3102/ready
# Expected: ready
```

### 5. Configure Services for Metrics

Add metrics to each microservice:

#### A. Install Dependencies

```bash
# In each service package
pnpm add prom-client

# Install shared metrics library
cd packages/shared
pnpm install
```

#### B. Update Service Code

```typescript
// packages/auth/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { MetricsInterceptor } from '@orion/shared/metrics';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable metrics interceptor
  app.useGlobalInterceptors(app.get(MetricsInterceptor));

  await app.listen(3001);
}

bootstrap();
```

```typescript
// packages/auth/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { MetricsModule } from '@orion/shared/metrics';

@Module({
  imports: [
    MetricsModule, // Add this
    // ... other modules
  ],
})
export class AppModule {}
```

#### C. Set Service Name Environment Variable

```yaml
# docker-compose.yml
services:
  auth:
    environment:
      SERVICE_NAME: auth
      # ... other env vars
```

### 6. Configure OpenTelemetry Tracing

#### A. Install Dependencies

```bash
pnpm add @opentelemetry/api \
         @opentelemetry/sdk-node \
         @opentelemetry/auto-instrumentations-node \
         @opentelemetry/exporter-trace-otlp-http
```

#### B. Create Tracing Configuration

```typescript
// packages/auth/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'auth',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

#### C. Import Tracing in Main

```typescript
// packages/auth/src/main.ts
import './tracing'; // Must be first import!
import { NestFactory } from '@nestjs/core';
// ... rest of imports
```

### 7. Configure Structured Logging

Update logger configuration:

```typescript
// packages/auth/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { LoggerModule } from '@orion/logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      serviceName: process.env.SERVICE_NAME || 'auth',
      logLevel: process.env.LOG_LEVEL || 'info',
      enableTracing: true, // Adds trace_id to logs
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 8. Access Dashboards

#### Grafana

1. Navigate to http://localhost:3100
2. Login with credentials from .env file
3. Navigate to Dashboards → Browse
4. Open "ORION - System Overview"

#### Prometheus

1. Navigate to http://localhost:9090
2. Go to Status → Targets to verify scraping
3. Try query: `up{job=~".*"}`

#### Jaeger

1. Navigate to http://localhost:16686
2. Select a service from dropdown
3. Click "Find Traces"

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace orion-monitoring
```

### 2. Apply Configurations

```bash
# Apply Prometheus
kubectl apply -f k8s/monitoring/prometheus/

# Apply Grafana
kubectl apply -f k8s/monitoring/grafana/

# Apply AlertManager
kubectl apply -f k8s/monitoring/alertmanager/

# Apply Loki
kubectl apply -f k8s/monitoring/loki/

# Apply Tempo
kubectl apply -f k8s/monitoring/tempo/
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n orion-monitoring

# Check services
kubectl get services -n orion-monitoring

# Port forward Grafana
kubectl port-forward -n orion-monitoring svc/grafana 3100:3000
```

## Configuration

### Retention Policies

#### Metrics (Prometheus)

Edit `prometheus/prometheus.yml`:

```yaml
storage:
  tsdb:
    retention.time: 30d    # Change from 15d
    retention.size: 100GB  # Change from 50GB
```

#### Logs (Loki)

Edit `loki/loki-config.yml`:

```yaml
table_manager:
  retention_deletes_enabled: true
  retention_period: 336h  # 14 days (change from 168h/7 days)
```

#### Traces (Tempo)

Edit `tempo/tempo.yml`:

```yaml
compactor:
  compaction:
    block_retention: 168h  # 7 days (change from 48h)
```

### Alert Channels

#### Slack

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Update `.env`: `SLACK_WEBHOOK_URL=https://hooks.slack.com/...`
3. Restart AlertManager: `docker-compose restart alertmanager`

#### PagerDuty

1. Get integration key from PagerDuty
2. Update `.env`: `PAGERDUTY_SERVICE_KEY=your-key`
3. Restart AlertManager

#### Email

Update `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=alerts@yourcompany.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=ops@yourcompany.com
```

### Custom Metrics

Add custom metrics in your service:

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '@orion/shared/metrics';

@Injectable()
export class PaymentService {
  constructor(private metricsService: MetricsService) {}

  async processPayment(amount: number) {
    const start = Date.now();

    try {
      // Payment processing logic
      const result = await this.externalPaymentApi.charge(amount);

      // Record successful payment
      this.metricsService.recordExternalApiCall(
        'user-service',
        'stripe',
        '/v1/charges',
        200,
        Date.now() - start,
      );

      return result;
    } catch (error) {
      // Record failed payment
      this.metricsService.recordExternalApiCall(
        'user-service',
        'stripe',
        '/v1/charges',
        error.status || 500,
        Date.now() - start,
      );

      throw error;
    }
  }
}
```

## Troubleshooting

### Prometheus Not Scraping Services

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq

# Verify service exposes metrics
curl http://SERVICE_HOST:PORT/metrics

# Check Prometheus logs
docker logs orion-prometheus
```

### Grafana Dashboards Not Loading

```bash
# Check Grafana logs
docker logs orion-grafana

# Verify datasources
curl -u admin:admin http://localhost:3100/api/datasources

# Test Prometheus connection
curl -u admin:admin http://localhost:3100/api/datasources/proxy/1/api/v1/query?query=up
```

### Traces Not Appearing

```bash
# Check OpenTelemetry collector
docker logs orion-otel-collector

# Verify Tempo is receiving traces
curl http://localhost:3102/status

# Check service environment variables
docker exec orion-SERVICE_NAME env | grep OTEL
```

### High Memory Usage

```bash
# Check container stats
docker stats --no-stream

# Adjust Prometheus retention
# Edit prometheus.yml storage.tsdb.retention.size

# Adjust Loki limits
# Edit loki-config.yml limits_config
```

## Best Practices

### 1. Metric Naming

Follow Prometheus naming conventions:

- Use `_total` suffix for counters
- Use `_seconds` for durations
- Use `_bytes` for sizes
- Use base units (seconds, not milliseconds)

### 2. Label Cardinality

Avoid high-cardinality labels:

```typescript
// Bad - user_id has high cardinality
metricsService.recordHttpRequest(service, method, route, status, duration, user_id);

// Good - use dimensions with limited values
metricsService.recordHttpRequest(service, method, route, status, duration);
```

### 3. Sampling

Adjust sampling rates based on traffic:

```typescript
// High traffic - sample less
const samplingRate = process.env.TRACE_SAMPLING_RATE || 0.01; // 1%

// Low traffic - sample more
const samplingRate = process.env.TRACE_SAMPLING_RATE || 0.1; // 10%
```

### 4. Alert Fatigue

- Start with critical alerts only
- Gradually add warning alerts
- Regularly review and tune thresholds
- Use inhibition rules to reduce noise

## Next Steps

1. [Review Dashboards](./DASHBOARD_GUIDE.md)
2. [Configure Alerts](./ALERTING_GUIDE.md)
3. [Read Runbooks](./runbooks/)
4. [Learn Query Syntax](./QUERY_GUIDE.md)

## Support

For help:
- Documentation: `/monitoring/docs/`
- Slack: #orion-monitoring
- Email: platform-team@yourcompany.com
