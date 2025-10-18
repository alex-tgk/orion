# Cost Tracking Service

Comprehensive cost tracking and analysis service for the ORION platform. Monitors resource usage across Kubernetes, databases, and other services to provide detailed cost insights and optimization recommendations.

## Features

- **Real-time Cost Tracking**: Monitor costs across all platform resources
- **Multi-dimensional Analysis**: Break down costs by service, team, namespace, environment
- **Budget Management**: Set budgets and receive alerts when thresholds are exceeded
- **Cost Forecasting**: Predict future costs using machine learning
- **Optimization Recommendations**: Get actionable insights to reduce costs
- **Grafana Dashboard**: Comprehensive visualization of costs and trends
- **Alert System**: Automated notifications via email and Slack
- **API-first Design**: RESTful API for integration with other tools

## Tracked Resources

### Compute
- Kubernetes CPU usage
- Kubernetes Memory usage

### Storage
- Kubernetes persistent volumes
- Database storage
- Object storage
- Backup storage
- Logs storage
- Metrics storage

### Network
- API Gateway requests and bandwidth
- Egress/Ingress bandwidth
- Load balancers
- CDN bandwidth

### Database
- Database IOPS
- Database connections
- Database storage

### CI/CD
- Build minutes

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Kubernetes cluster with metrics-server (for K8s cost tracking)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npx prisma migrate dev
npx prisma generate
```

4. Start the service:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The service will be available at `http://localhost:20010`

API documentation: `http://localhost:20010/api/docs`

## Configuration

See `.env.example` for all configuration options.

Key configurations:

- **Database**: PostgreSQL connection string
- **Kubernetes**: Enable/disable K8s metrics collection
- **Alerts**: Configure email and Slack notifications
- **Forecasting**: Set forecast parameters
- **Pricing**: Configure cloud provider pricing model

## API Endpoints

### Cost Tracking
- `GET /costs/current` - Get current period costs
- `GET /costs/trend` - Get historical cost trends
- `GET /costs/by-service` - Get cost breakdown by service
- `GET /costs/forecast` - Get cost forecast
- `GET /costs/summary` - Get cost summary dashboard

### Budget Management
- `POST /costs/budgets` - Create a budget
- `GET /costs/budgets` - Get all budgets
- `GET /costs/budgets/:id` - Get specific budget
- `PUT /costs/budgets/:id` - Update budget

### Alerts & Optimization
- `GET /costs/alerts` - Get cost alerts
- `GET /costs/optimizations` - Get optimization recommendations

## Grafana Dashboard

Import the Grafana dashboard from:
```
k8s/monitoring/grafana/dashboards/cost-tracking.json
```

The dashboard includes:
- Current month costs and budget status
- Cost trends and forecasts
- Cost breakdown by category, service, and resource type
- Top cost drivers
- Active alerts
- Optimization opportunities

## Cost Optimization

Run the cost optimization analysis script:

```bash
./scripts/analysis/cost-optimization.sh

# Generate markdown report
OUTPUT_FORMAT=markdown ./scripts/analysis/cost-optimization.sh > report.md

# Get JSON output
OUTPUT_FORMAT=json ./scripts/analysis/cost-optimization.sh
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Cost Tracking Service                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Kubernetes  │  │   Database   │  │  External    │ │
│  │   Metrics    │  │   Metrics    │  │   Services   │ │
│  │  Collector   │  │  Collector   │  │  Collector   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
│                           │                            │
│                  ┌────────▼────────┐                   │
│                  │  Cost Calculator│                   │
│                  └────────┬────────┘                   │
│                           │                            │
│         ┌─────────────────┼─────────────────┐          │
│         │                 │                 │          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐│
│  │   Budget     │  │   Forecast   │  │Optimization  ││
│  │  Management  │  │    Engine    │  │    Engine    ││
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘│
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
│                           │                            │
│                  ┌────────▼────────┐                   │
│                  │ Alert & Notify  │                   │
│                  └─────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

## Development

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage
npm run test:coverage
```

### Code Generation

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name
```

## Documentation

See [docs/operations/cost-management.md](../../docs/operations/cost-management.md) for detailed usage guide.

## License

MIT
