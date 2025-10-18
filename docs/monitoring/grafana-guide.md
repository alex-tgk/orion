# ORION Grafana Monitoring Guide

## Overview

Grafana is the primary visualization and dashboarding platform for the ORION microservices system. This guide covers accessing Grafana, using pre-built dashboards, creating custom dashboards, and configuring alerts.

## Table of Contents

1. [Accessing Grafana](#accessing-grafana)
2. [Dashboard Overview](#dashboard-overview)
3. [Using Pre-built Dashboards](#using-pre-built-dashboards)
4. [Creating Custom Dashboards](#creating-custom-dashboards)
5. [Alert Configuration](#alert-configuration)
6. [Data Source Setup](#data-source-setup)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Accessing Grafana

### Local Development

For local development with port-forwarding:

```bash
kubectl port-forward -n monitoring svc/grafana 3000:80
```

Access Grafana at: `http://localhost:3000`

### Production Access

In production, Grafana is available at: `https://grafana.orion.local`

### Default Credentials

- **Username**: `admin`
- **Password**: Stored in Kubernetes secret `grafana-credentials`

To retrieve the password:

```bash
kubectl get secret grafana-credentials -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d
```

**Important**: Change the default password immediately after first login!

## Dashboard Overview

ORION provides 8 comprehensive pre-built dashboards:

| Dashboard | Purpose | Key Metrics |
|-----------|---------|-------------|
| **System Overview** | High-level system health | Services up, success rate, latency, request rate |
| **Service Performance** | Per-service detailed metrics | SLIs, latency percentiles, endpoint performance |
| **Database Performance** | PostgreSQL & Redis metrics | Connections, transactions, cache hit ratio |
| **API Analytics** | API usage and patterns | Request methods, endpoints, status codes |
| **Business Metrics** | User and business KPIs | User registrations, active users, conversions |
| **Kubernetes Cluster** | K8s resource usage | CPU, memory, pods, network I/O |
| **Error Tracking** | Error rates and patterns | Error budget, error types, top failing endpoints |
| **Security Monitoring** | Auth and security events | Failed logins, blocked IPs, suspicious activity |

## Using Pre-built Dashboards

### Navigation

1. Click the **Dashboards** icon (four squares) in the left sidebar
2. Navigate to the **ORION** folder
3. Select a dashboard

### Time Range Selection

Use the time picker in the top-right corner:

- **Quick ranges**: Last 5m, 15m, 1h, 6h, 24h, 7d, 30d
- **Custom range**: Specify exact start and end times
- **Refresh interval**: Auto-refresh every 5s, 10s, 30s, 1m, 5m

### Variables and Filters

Many dashboards support variable filtering:

- **Service**: Filter by specific microservice
- **Interval**: Adjust aggregation interval (1m, 5m, 15m, 1h)
- **Database**: Filter by database name (for database dashboard)

### Panel Interactions

- **Zoom**: Click and drag on any graph to zoom
- **Legend**: Click legend items to show/hide series
- **Inspect**: Click panel title → Inspect → Data/Query to see raw data
- **Share**: Click panel title → Share to create shareable links

## Creating Custom Dashboards

### Step 1: Create New Dashboard

1. Click **+** icon in left sidebar
2. Select **Dashboard**
3. Click **Add visualization**

### Step 2: Select Data Source

1. Choose **Prometheus** (primary data source)
2. Or select **Loki** for log-based panels

### Step 3: Configure Query

#### Prometheus Query Examples

```promql
# Request rate by service
sum by (service) (rate(http_server_requests_seconds_count[5m]))

# P95 latency
histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))

# Error rate
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m]))

# CPU usage
sum(rate(container_cpu_usage_seconds_total{namespace="orion"}[5m])) by (pod) * 100

# Memory usage
sum(container_memory_usage_bytes{namespace="orion"}) by (pod)
```

#### Loki Query Examples

```logql
# All error logs
{namespace="orion"} |= "error" or "ERROR"

# Auth service logs
{namespace="orion",service="auth-service"}

# Logs with JSON parsing
{namespace="orion"} | json | level="error"
```

### Step 4: Configure Visualization

1. Select visualization type:
   - **Time series**: Line/area charts for metrics over time
   - **Stat**: Single value with optional sparkline
   - **Gauge**: Progress towards threshold
   - **Bar chart**: Categorical comparisons
   - **Table**: Tabular data display
   - **Heatmap**: Density visualization
   - **Pie chart**: Proportional data
   - **Logs**: Log stream display

2. Configure panel options:
   - Title and description
   - Unit (ms, bytes, percent, etc.)
   - Min/max values
   - Thresholds and colors
   - Legend placement

### Step 5: Save Dashboard

1. Click **Save** icon (disk) in top-right
2. Enter dashboard name
3. Select folder (create **Custom** folder)
4. Add tags for organization
5. Click **Save**

## Alert Configuration

### Creating Alerts

Grafana supports unified alerting with Prometheus-style alert rules.

#### Step 1: Create Alert Rule

1. Navigate to **Alerting** → **Alert rules**
2. Click **New alert rule**
3. Configure:
   - **Rule name**: Descriptive name (e.g., "High Error Rate")
   - **Query**: Prometheus query that returns alerting condition
   - **Condition**: Threshold for triggering alert

#### Step 2: Example Alert Rules

**High Error Rate Alert**:

```yaml
Name: High Error Rate
Query: sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m]))
Condition: > 0.01  # Alert if error rate > 1%
For: 5m  # Must be true for 5 minutes
```

**High Latency Alert**:

```yaml
Name: High P95 Latency
Query: histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[5m])) by (le))
Condition: > 1  # Alert if P95 > 1 second
For: 10m
```

**Service Down Alert**:

```yaml
Name: Service Unavailable
Query: up{job=~".*-service"}
Condition: == 0  # Alert if service down
For: 1m
```

**Database Connection Issues**:

```yaml
Name: High Database Connections
Query: pg_stat_activity_count
Condition: > 80  # Alert if > 80 connections
For: 5m
```

**Memory Pressure**:

```yaml
Name: High Memory Usage
Query: sum(container_memory_usage_bytes{namespace="orion"}) / sum(container_spec_memory_limit_bytes{namespace="orion"})
Condition: > 0.85  # Alert if > 85% memory used
For: 5m
```

#### Step 3: Configure Contact Points

1. Navigate to **Alerting** → **Contact points**
2. Click **New contact point**
3. Configure notification channel:

**Slack**:
```yaml
Type: Slack
Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Channel: #alerts
Username: Grafana
Icon: :chart_with_upwards_trend:
```

**Email**:
```yaml
Type: Email
Addresses: oncall@example.com, team@example.com
Single email: false
```

**PagerDuty**:
```yaml
Type: PagerDuty
Integration Key: YOUR_INTEGRATION_KEY
Severity: critical
```

**Webhook**:
```yaml
Type: Webhook
URL: https://your-service.com/alerts
HTTP Method: POST
Authorization: Bearer YOUR_TOKEN
```

#### Step 4: Create Notification Policy

1. Navigate to **Alerting** → **Notification policies**
2. Configure routing:
   - **Default policy**: Send all alerts to primary contact point
   - **Specific matchers**: Route based on labels
   - **Grouping**: Group related alerts
   - **Timing**: Configure repeat intervals

Example policy:
```yaml
Matcher: severity = critical
Contact point: pagerduty
Group by: alertname, service
Group wait: 30s
Group interval: 5m
Repeat interval: 4h
```

## Data Source Setup

### Prometheus Configuration

Prometheus is the primary data source, pre-configured with:

- **URL**: `http://prometheus-server.monitoring.svc.cluster.local`
- **Scrape interval**: 15s
- **Query timeout**: 60s
- **HTTP Method**: POST (for large queries)

### Loki Configuration

Loki provides log aggregation:

- **URL**: `http://loki.monitoring.svc.cluster.local:3100`
- **Max lines**: 1000 per query
- **Derived fields**: Automatically extract trace IDs

### Tempo Configuration

Tempo provides distributed tracing:

- **URL**: `http://tempo.monitoring.svc.cluster.local:3100`
- **Trace to logs**: Automatic correlation with Loki
- **Service map**: Enabled
- **Node graph**: Enabled

### Adding Custom Data Sources

1. Navigate to **Configuration** → **Data sources**
2. Click **Add data source**
3. Select type (Prometheus, Loki, MySQL, PostgreSQL, etc.)
4. Configure connection details
5. Click **Save & test**

## Best Practices

### Dashboard Design

1. **Start with high-level overview**: Show most critical metrics first
2. **Use consistent naming**: Follow naming conventions across dashboards
3. **Organize with rows**: Group related panels using row panels
4. **Add descriptions**: Include panel descriptions for clarity
5. **Use variables**: Make dashboards reusable with template variables
6. **Set appropriate refresh rates**: Balance freshness vs. load

### Query Optimization

1. **Use recording rules**: Pre-compute expensive queries in Prometheus
2. **Limit time ranges**: Avoid querying excessive time ranges
3. **Use rate() for counters**: Always use `rate()` or `irate()` for counter metrics
4. **Aggregate early**: Use `sum by (label)` instead of aggregating in Grafana
5. **Use $__interval**: Let Grafana optimize query resolution

### Alert Best Practices

1. **Avoid alert fatigue**: Only alert on actionable issues
2. **Use appropriate severity**: Critical, warning, info
3. **Include runbook links**: Add links to resolution procedures
4. **Set meaningful thresholds**: Based on SLOs and historical data
5. **Test alerts**: Use alert rule testing before deploying
6. **Group related alerts**: Reduce notification noise

### Performance

1. **Limit panel count**: Max 20-30 panels per dashboard
2. **Use caching**: Enable query result caching
3. **Optimize queries**: Use appropriate aggregation intervals
4. **Use dashboard variables**: Reduce number of static dashboards
5. **Archive old dashboards**: Keep active dashboard list manageable

## Troubleshooting

### Grafana Won't Start

Check pod status:
```bash
kubectl get pods -n monitoring -l app=grafana
kubectl logs -n monitoring -l app=grafana
```

Common issues:
- PVC not bound: Check storage class availability
- Secret missing: Verify `grafana-credentials` exists
- Image pull issues: Check image availability

### No Data in Dashboards

1. **Check data source connection**:
   - Configuration → Data sources → Select Prometheus → Test

2. **Verify Prometheus has data**:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus-server 9090:80
   ```
   Visit `http://localhost:9090` and run queries

3. **Check time range**: Ensure selected time range has data

4. **Inspect panel query**:
   - Panel title → Inspect → Query
   - Check for query errors

### Alerts Not Firing

1. **Check alert rule status**:
   - Alerting → Alert rules → View rule
   - Check "State" and "Last evaluation"

2. **Verify query returns data**:
   - Test query in Explore view
   - Ensure query has results during alert condition

3. **Check contact point**:
   - Alerting → Contact points → Test
   - Verify credentials and connectivity

4. **Review notification policy**:
   - Ensure matchers are correct
   - Check timing settings

### Dashboard Not Loading

1. **Clear browser cache**: Force reload (Ctrl+Shift+R)
2. **Check browser console**: Look for JavaScript errors
3. **Simplify dashboard**: Remove panels one by one to identify issue
4. **Check Grafana logs**: `kubectl logs -n monitoring -l app=grafana`

### Slow Query Performance

1. **Reduce time range**: Query smaller time windows
2. **Increase interval**: Use larger aggregation intervals
3. **Add recording rules**: Pre-compute in Prometheus
4. **Limit series**: Use label matchers to reduce cardinality
5. **Check Prometheus performance**: Ensure Prometheus is healthy

## Advanced Topics

### Provisioning Dashboards

Dashboards can be automatically provisioned via ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-dashboard
  namespace: monitoring
data:
  my-dashboard.json: |
    {
      "dashboard": { ... },
      "overwrite": true
    }
```

### Using Dashboard Variables

Create dynamic dashboards with variables:

1. **Query variable**: Populate from Prometheus query
   ```promql
   label_values(up{job=~".*-service"}, job)
   ```

2. **Custom variable**: Manual list of values
   ```
   1m,5m,15m,1h
   ```

3. **Constant**: Fixed value used in queries
4. **Ad hoc filters**: Dynamic filtering based on labels

### Grafana API

Automate dashboard management with the Grafana API:

```bash
# Get all dashboards
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://grafana.orion.local/api/search

# Create dashboard
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d @dashboard.json \
  https://grafana.orion.local/api/dashboards/db

# Create API key
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"api-key","role":"Admin"}' \
  https://grafana.orion.local/api/auth/keys
```

### Grafana Plugins

Install additional plugins for enhanced functionality:

```bash
# In Grafana deployment, set environment variable:
GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel,grafana-clock-panel

# Or use grafana-cli in pod:
kubectl exec -it -n monitoring grafana-xxx -- grafana-cli plugins install grafana-piechart-panel
```

## Support and Resources

- **Official Documentation**: https://grafana.com/docs/grafana/latest/
- **Community Forums**: https://community.grafana.com/
- **Example Dashboards**: https://grafana.com/grafana/dashboards/
- **Prometheus Query Examples**: https://prometheus.io/docs/prometheus/latest/querying/examples/

## Dashboard Export/Import

### Export Dashboard

1. Open dashboard
2. Click **Share** icon (arrow)
3. Select **Export** tab
4. Choose **Save to file** or **View JSON**
5. Copy or download JSON

### Import Dashboard

1. Click **+** → **Import**
2. Paste JSON or upload file
3. Select data source
4. Configure options
5. Click **Import**

## Conclusion

Grafana provides comprehensive monitoring and visualization for the ORION platform. Use pre-built dashboards for immediate insights, create custom dashboards for specific needs, and configure alerts to stay informed of critical issues.

For additional support, consult the ORION monitoring documentation or contact the platform team.
