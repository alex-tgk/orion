# Cost Management Guide

## Overview

The ORION Cost Tracking system provides comprehensive monitoring and analysis of resource usage and costs across the entire platform. This guide explains how to use the cost tracking features to optimize spending and manage budgets effectively.

## Table of Contents

1. [Architecture](#architecture)
2. [Getting Started](#getting-started)
3. [Cost Tracking Features](#cost-tracking-features)
4. [Budget Management](#budget-management)
5. [Cost Optimization](#cost-optimization)
6. [API Reference](#api-reference)
7. [Dashboard Usage](#dashboard-usage)
8. [Best Practices](#best-practices)

## Architecture

The cost tracking system consists of several components:

- **Cost Tracking Service**: Core service that collects metrics and calculates costs
- **Kubernetes Metrics Collector**: Monitors CPU, memory, and storage usage from Kubernetes
- **Database Metrics Collector**: Tracks database storage, IOPS, and connection usage
- **Cost Calculator**: Calculates costs based on resource usage and pricing models
- **Alert System**: Monitors budgets and sends alerts when thresholds are exceeded
- **Grafana Dashboard**: Provides visualization of costs and trends

## Getting Started

### Prerequisites

- PostgreSQL database for cost tracking data
- Kubernetes cluster with metrics-server enabled (for K8s cost tracking)
- Access to the Cost Tracking API (default port: 20010)

### Configuration

The cost tracking service is configured through environment variables:

```bash
# Service configuration
COST_TRACKING_PORT=20010
COST_TRACKING_DATABASE_URL=postgresql://localhost:5432/orion_cost_tracking

# Kubernetes metrics
K8S_METRICS_ENABLED=true
K8S_METRICS_SERVER=http://metrics-server.kube-system:443
K8S_NAMESPACE=default
K8S_POLL_INTERVAL=300000  # 5 minutes

# Database metrics
DB_POLL_INTERVAL=300000  # 5 minutes

# Alerts
ALERT_CHECK_INTERVAL=3600000  # 1 hour
ALERT_EMAIL_ENABLED=true
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Forecasting
FORECAST_METHOD=linear_regression
FORECAST_DAYS=30
FORECAST_CONFIDENCE=0.95

# Currency
COST_CURRENCY=USD
```

### Database Setup

Run Prisma migrations to set up the cost tracking database:

```bash
cd packages/cost-tracking
npx prisma migrate dev
npx prisma generate
```

### Starting the Service

```bash
# Development
npm run dev:service cost-tracking

# Production
npm run build cost-tracking
node dist/packages/cost-tracking/main.js
```

## Cost Tracking Features

### Resource Types Tracked

The system tracks costs for the following resource types:

**Compute:**
- Kubernetes CPU usage
- Kubernetes Memory usage

**Storage:**
- Kubernetes persistent volumes
- Database storage
- Object storage
- Backup storage
- Logs storage
- Metrics storage

**Network:**
- API Gateway requests
- API Gateway bandwidth
- Egress bandwidth
- Ingress bandwidth
- Load balancers
- CDN bandwidth

**Database:**
- Database IOPS
- Database connections
- Database storage

**CI/CD:**
- Build minutes

**External Services:**
- External API calls

### Cost Periods

Costs can be aggregated by different time periods:

- **HOURLY**: Hour-by-hour costs
- **DAILY**: Daily aggregated costs
- **WEEKLY**: Weekly aggregated costs
- **MONTHLY**: Monthly aggregated costs
- **YEARLY**: Yearly aggregated costs

### Cost Categories

Costs are categorized into:

- COMPUTE
- STORAGE
- NETWORK
- DATABASE
- MONITORING
- LOGGING
- SECURITY
- CI_CD
- EXTERNAL_SERVICES
- OTHER

## Budget Management

### Creating a Budget

Create a budget using the API:

```bash
curl -X POST http://localhost:20010/costs/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Environment Budget",
    "description": "Monthly budget for production services",
    "budgetType": "namespace",
    "budgetKey": "production",
    "budgetName": "Production",
    "period": "MONTHLY",
    "amount": 10000,
    "startDate": "2024-01-01T00:00:00Z",
    "warningThreshold": 80,
    "criticalThreshold": 95,
    "notificationEmails": ["ops@example.com"],
    "notificationSlack": "https://hooks.slack.com/services/YOUR/WEBHOOK"
  }'
```

### Budget Types

Budgets can be created for different scopes:

- **service**: Budget for a specific service
- **team**: Budget for a team's resources
- **namespace**: Budget for a Kubernetes namespace
- **global**: Overall platform budget

### Alert Thresholds

Configure alert thresholds as percentages of the budget:

- **Warning Threshold** (default: 80%): Triggers a warning alert
- **Critical Threshold** (default: 95%): Triggers a critical alert
- **Exceeded**: Triggers when budget is exceeded (100%+)

### Monitoring Budgets

Get budget status:

```bash
# Get all budgets
curl http://localhost:20010/costs/budgets

# Get specific budget
curl http://localhost:20010/costs/budgets/{budget-id}

# Get active alerts
curl http://localhost:20010/costs/alerts
```

## Cost Optimization

### Running Cost Analysis

Use the cost optimization script to analyze costs and get recommendations:

```bash
# Run full analysis
./scripts/analysis/cost-optimization.sh

# Generate markdown report
OUTPUT_FORMAT=markdown ./scripts/analysis/cost-optimization.sh > cost-report.md

# Get JSON output
OUTPUT_FORMAT=json ./scripts/analysis/cost-optimization.sh
```

### Getting Optimization Recommendations

Retrieve optimization recommendations from the API:

```bash
# Get all recommendations
curl http://localhost:20010/costs/optimizations

# Filter by minimum savings
curl "http://localhost:20010/costs/optimizations?minSavings=100"

# Filter by category
curl "http://localhost:20010/costs/optimizations?category=COMPUTE"
```

### Common Optimization Strategies

#### 1. Right-sizing Resources

Identify and right-size overprovisioned resources:

- Review pods with low CPU/memory utilization (<20%)
- Adjust resource requests and limits
- Use Vertical Pod Autoscaler (VPA) for automatic right-sizing

#### 2. Horizontal Scaling

Implement autoscaling for variable workloads:

- Configure Horizontal Pod Autoscaler (HPA)
- Set appropriate scaling thresholds
- Monitor scaling metrics

#### 3. Storage Optimization

Reduce storage costs:

- Delete unused Persistent Volume Claims
- Enable compression for logs and backups
- Implement data lifecycle policies
- Review backup retention settings

#### 4. Database Optimization

Optimize database costs:

- Identify and optimize slow queries
- Add missing indexes
- Review connection pool settings
- Archive old data
- Consider read replicas for read-heavy workloads

#### 5. Network Optimization

Reduce network costs:

- Use CDN for static assets
- Enable response compression
- Implement caching strategies
- Optimize cross-region traffic
- Review external API usage

## API Reference

### Endpoints

#### GET /costs/current
Get current period costs.

**Query Parameters:**
- `period` (optional): Cost period (HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY)

**Response:**
```json
{
  "period": "MONTHLY",
  "periodStart": "2024-01-01T00:00:00Z",
  "periodEnd": "2024-02-01T00:00:00Z",
  "totalCost": 8543.21,
  "currency": "USD",
  "byCategory": {
    "COMPUTE": 4200.00,
    "STORAGE": 1500.00,
    "NETWORK": 800.00,
    "DATABASE": 1500.00
  }
}
```

#### GET /costs/trend
Get historical cost trends.

**Query Parameters:**
- `period` (optional): Aggregation period
- `days` (optional): Number of days to include (default: 30)

#### GET /costs/by-service
Get cost breakdown by service.

**Query Parameters:**
- `period` (optional): Cost period

#### GET /costs/forecast
Get cost forecast.

**Query Parameters:**
- `days` (optional): Number of days to forecast (default: 30)

#### POST /costs/budgets
Create a new budget.

#### GET /costs/budgets
Get all budgets.

#### GET /costs/budgets/:id
Get specific budget.

#### PUT /costs/budgets/:id
Update a budget.

#### GET /costs/alerts
Get cost alerts.

**Query Parameters:**
- `status` (optional): Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)
- `severity` (optional): Filter by severity (INFO, WARNING, CRITICAL)

#### GET /costs/optimizations
Get optimization recommendations.

#### GET /costs/summary
Get cost summary dashboard data.

## Dashboard Usage

### Accessing the Dashboard

The Grafana cost tracking dashboard is available at:
```
http://your-grafana-instance/d/cost-tracking
```

### Dashboard Panels

1. **Current Month Total Cost**: Shows total spending for the current month
2. **Budget vs Actual**: Gauge showing budget usage percentage
3. **Cost Trend**: Historical cost trend over the last 30 days
4. **Cost by Category**: Pie chart of costs by category
5. **Cost by Service**: Bar chart showing top services by cost
6. **Resource Utilization vs Cost**: Graph of resource usage and costs
7. **Top Cost Drivers**: Table of resources with highest costs
8. **Cost Forecast**: Predicted costs for the next 30 days
9. **Active Cost Alerts**: Table of active cost alerts
10. **Cost Optimization Opportunities**: Table of optimization recommendations
11. **Kubernetes CPU/Memory Costs**: Graphs of K8s resource costs
12. **Storage/Network/Database Costs**: Graphs of costs by type

### Dashboard Variables

Use the dashboard variables to filter data:

- **Namespace**: Filter by Kubernetes namespace
- **Service**: Filter by service name
- **Environment**: Filter by environment (dev, staging, production)

## Best Practices

### 1. Set Realistic Budgets

- Base budgets on historical data
- Account for growth and seasonal variations
- Review and adjust budgets quarterly
- Set different budgets for different environments

### 2. Monitor Costs Regularly

- Review cost dashboard daily
- Set up automated alerts
- Analyze cost trends weekly
- Review optimization recommendations monthly

### 3. Implement Cost Allocation

- Tag resources with service, team, and environment labels
- Use namespaces for cost isolation
- Allocate shared costs appropriately
- Generate cost reports by team/project

### 4. Optimize Continuously

- Act on optimization recommendations promptly
- Review resource utilization regularly
- Right-size resources based on actual usage
- Implement autoscaling where appropriate

### 5. Plan for Growth

- Forecast costs for new features
- Budget for scaling requirements
- Monitor cost trends during growth periods
- Optimize before scaling

### 6. Document Cost Changes

- Track reasons for cost increases/decreases
- Document optimization actions taken
- Maintain a cost optimization log
- Share cost insights with the team

### 7. Automate Cost Management

- Use Infrastructure as Code for resource provisioning
- Implement automated cleanup of unused resources
- Schedule non-critical workloads during off-peak hours
- Automate cost reporting

## Troubleshooting

### High Costs

1. Check the cost dashboard for anomalies
2. Review top cost drivers
3. Check for unexpected resource usage spikes
4. Review recent deployments and changes
5. Check for resource leaks or runaway processes

### Missing Cost Data

1. Verify cost tracking service is running
2. Check Kubernetes metrics-server is running
3. Verify database connectivity
4. Check service logs for errors
5. Ensure proper permissions for metrics collection

### Inaccurate Forecasts

1. Ensure sufficient historical data (at least 30 days)
2. Review forecast method configuration
3. Check for data anomalies or outliers
4. Consider using different forecasting methods
5. Account for seasonal variations

## Support

For issues or questions about cost tracking:

- Check service logs: `kubectl logs -n orion deploy/cost-tracking`
- Review API documentation: `http://localhost:20010/api/docs`
- Contact the platform team

## Appendix

### Pricing Model

The default pricing model uses estimated on-premise costs:

- **CPU**: $0.05 per core-hour
- **Memory**: $0.01 per GB-hour
- **Storage**: $0.02 per GB-month
- **Database IOPS**: $0.0001 per IOPS-month
- **Database Connections**: $0.001 per connection-hour
- **Network Egress**: $0.001 per GB
- **API Gateway Requests**: $0.001 per million requests
- **Build Minutes**: $0.005 per minute

Adjust these values in the configuration to match your cloud provider's pricing.

### Cost Allocation Tags

Recommended tags for cost allocation:

- `service`: Service name
- `team`: Team responsible
- `environment`: dev, staging, production
- `cost-center`: Cost center code
- `project`: Project name
- `owner`: Resource owner

### Related Documentation

- [Monitoring Guide](./monitoring.md)
- [Alert Management](./alerts.md)
- [Resource Management](./resources.md)
- [Budget Planning](./budget-planning.md)
