# Metrics Viewer Specification

## Overview
Advanced metrics visualization and analysis tool for ORION platform, providing real-time Prometheus metrics display, custom queries, time-series analysis, and alerting configuration.

## Features

### 1. Real-time Prometheus Metrics Display
- Live metrics streaming from Prometheus endpoints
- Auto-refresh with configurable intervals
- Support for all Prometheus metric types (Counter, Gauge, Histogram, Summary)
- Pre-configured dashboard templates for common metrics
- Multi-service metric aggregation

### 2. Custom Metric Queries
- PromQL query builder with syntax highlighting
- Query history and favorites
- Query validation and error messages
- Template variables for dynamic queries
- Query result export (CSV, JSON)

### 3. Time-Series Charts
- Line charts for trends
- Bar charts for comparisons
- Heatmaps for distribution analysis
- Area charts for stacked metrics
- Customizable time ranges (1h, 6h, 24h, 7d, 30d, custom)
- Multiple chart layouts (grid, tabs, full-screen)

### 4. Metric Alerts Configuration
- Threshold-based alerts
- Rate of change alerts
- Anomaly detection alerts
- Alert rule creation UI
- Alert preview and testing
- Integration with notification system

### 5. Export Capabilities
- Export charts as PNG/SVG
- Export data as CSV/JSON
- Generate shareable dashboard links
- Schedule periodic reports
- PDF report generation

## Technical Architecture

### Frontend Components

#### Pages
- **MetricsViewerPage** (`packages/admin-ui/src/frontend/pages/MetricsViewer/`)
  - Main metrics dashboard
  - Query builder interface
  - Chart configuration panel
  - Alert management section

#### Components
- **MetricChart** - Configurable time-series chart
- **QueryBuilder** - PromQL query editor
- **MetricSelector** - Metric browser and selector
- **ChartControls** - Time range and refresh controls
- **AlertRuleEditor** - Alert configuration UI
- **ExportDialog** - Export options and settings

### Backend Endpoints

#### Metrics Controller (`packages/admin-ui/src/app/controllers/metrics.controller.ts`)

```typescript
GET /api/metrics/query
- Query: promql, start, end, step
- Returns: MetricQueryResult
- Description: Execute custom PromQL query

GET /api/metrics/services/:serviceName
- Query: timeRange, metrics[]
- Returns: ServiceMetrics
- Description: Get metrics for specific service

GET /api/metrics/available
- Returns: AvailableMetrics[]
- Description: List all available metrics

POST /api/metrics/query/batch
- Body: { queries: PromQLQuery[] }
- Returns: MetricQueryResult[]
- Description: Execute multiple queries

GET /api/metrics/labels
- Query: metric
- Returns: MetricLabels
- Description: Get available labels for metric

POST /api/metrics/alerts
- Body: AlertRule
- Returns: AlertRule
- Description: Create new alert rule

GET /api/metrics/alerts
- Returns: AlertRule[]
- Description: List all alert rules

PUT /api/metrics/alerts/:id
- Body: Partial<AlertRule>
- Returns: AlertRule
- Description: Update alert rule

DELETE /api/metrics/alerts/:id
- Returns: void
- Description: Delete alert rule

POST /api/metrics/export
- Body: ExportRequest
- Returns: ExportResult
- Description: Export metrics data
```

#### Prometheus Proxy
```typescript
// Proxy to Prometheus API with caching
GET /api/metrics/prometheus/*
- Description: Proxies requests to Prometheus server
- Features: Request caching, authentication, rate limiting
```

## Data Models

### MetricQueryResult
```typescript
interface MetricQueryResult {
  status: 'success' | 'error';
  data: {
    resultType: 'matrix' | 'vector' | 'scalar' | 'string';
    result: MetricResult[];
  };
  error?: string;
  warnings?: string[];
}

interface MetricResult {
  metric: Record<string, string>; // labels
  values?: [number, string][]; // [timestamp, value]
  value?: [number, string]; // instant query
}
```

### ServiceMetrics
```typescript
interface ServiceMetrics {
  serviceName: string;
  timestamp: string;
  timeRange: number; // minutes
  metrics: {
    cpu: MetricData;
    memory: MetricData;
    requestRate: MetricData;
    errorRate: MetricData;
    responseTime: MetricData;
    activeConnections: MetricData;
    custom?: Record<string, MetricData>;
  };
}

interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  current: number;
  average: number;
  min: number;
  max: number;
  unit: string;
  timeSeries: DataPoint[];
}

interface DataPoint {
  timestamp: number;
  value: number;
}
```

### AvailableMetrics
```typescript
interface AvailableMetrics {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels: string[];
  services: string[];
}
```

### AlertRule
```typescript
interface AlertRule {
  id: string;
  name: string;
  description: string;
  promql: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  duration: number; // seconds
  threshold: number;
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
}
```

### ExportRequest
```typescript
interface ExportRequest {
  format: 'csv' | 'json' | 'png' | 'svg' | 'pdf';
  queries: PromQLQuery[];
  timeRange: {
    start: string;
    end: string;
  };
  options?: {
    includeLabels?: boolean;
    resolution?: number;
    chartConfig?: ChartConfig;
  };
}
```

## UI/UX Requirements

### Layout
- Three-panel layout: Metric Browser | Chart Area | Controls
- Collapsible panels for maximizing chart space
- Tab-based navigation for multiple dashboards
- Responsive design with mobile-optimized views

### Chart Configurations
- **Default Charts**: CPU, Memory, Request Rate, Error Rate, Response Time
- **Custom Charts**: User-defined PromQL queries
- **Chart Types**: Line, Area, Bar, Stacked Area, Heatmap
- **Annotations**: Mark incidents, deployments, alerts

### Query Builder
- Autocomplete for metrics and labels
- Syntax highlighting with CodeMirror or Monaco
- Query validation before execution
- Query templates and snippets
- History with search and filter

### Color Schemes
- Metric lines: Sequential color palette
- Thresholds: Warning (Yellow), Critical (Red)
- Custom colors per metric
- Dark/light theme support

### Interactions
- Zoom: Click and drag to zoom time range
- Pan: Shift+drag to pan timeline
- Tooltip: Hover for exact values
- Legend: Click to show/hide series
- Context menu: Right-click for actions

### Performance
- Virtual scrolling for large metric lists
- Chart rendering optimization with canvas
- Query result caching (1 minute TTL)
- Lazy loading of chart data
- Debounced chart updates

## Testing Requirements

### Unit Tests
- MetricChart component with various data
- QueryBuilder validation logic
- Data transformation utilities
- Alert rule validation

### Integration Tests
- Prometheus API integration
- Query execution and result parsing
- Alert rule CRUD operations
- Export functionality

### E2E Tests (Playwright)
- Load default dashboard
- Execute custom query
- Create and trigger alert
- Export chart as image
- Navigate between time ranges

## Storybook Stories

### MetricChart
- Line chart with single metric
- Multi-series line chart
- Chart with threshold lines
- Loading and error states
- Empty state (no data)

### QueryBuilder
- Empty builder
- With pre-filled query
- Validation errors
- Autocomplete suggestions

### AlertRuleEditor
- Create new rule
- Edit existing rule
- Validation states
- Preview alert condition

## Implementation Phases

### Phase 1: Barebone (Functional)
- Basic chart rendering with recharts
- Prometheus query execution
- Metric listing and selection
- Simple time range controls
- Data export (JSON/CSV)

### Phase 2: Pretty (Styled)
- Tailwind CSS styling
- Consistent color scheme
- Loading skeletons
- Error boundaries
- Responsive layout

### Phase 3: Polish (Optimized)
- Advanced query builder with autocomplete
- Chart annotations and markers
- Performance optimizations (virtual scrolling, memoization)
- Advanced alert rules
- PDF export with charts
- Keyboard shortcuts

## Dependencies

```json
{
  "recharts": "^2.10.3",
  "monaco-editor": "^0.45.0",
  "@monaco-editor/react": "^4.6.0",
  "date-fns": "^3.0.0",
  "file-saver": "^2.0.5",
  "html2canvas": "^1.4.1",
  "jspdf": "^2.5.1",
  "papaparse": "^5.4.1",
  "zod": "^3.22.4"
}
```

## Prometheus Integration

### Supported PromQL Functions
- Aggregation: sum, avg, min, max, count, stddev, stdvar
- Rate: rate, irate, increase
- Math: abs, ceil, floor, round, sqrt
- Comparison: >, <, ==, !=, >=, <=
- Logical: and, or, unless

### Pre-configured Queries
```promql
# HTTP Request Rate
rate(http_requests_total[5m])

# Error Rate
rate(http_requests_total{status=~"5.."}[5m])

# Response Time (P95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory Usage
process_resident_memory_bytes / 1024 / 1024

# CPU Usage
rate(process_cpu_seconds_total[5m]) * 100

# Active Database Connections
pg_stat_activity_count
```

## Alert Rule Examples

### High Error Rate
```yaml
name: High Error Rate
promql: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
severity: error
duration: 300 # 5 minutes
threshold: 0.01
operator: >
```

### Memory Pressure
```yaml
name: Memory Pressure
promql: process_resident_memory_bytes / 1024 / 1024 / 1024 > 2
severity: warning
duration: 60
threshold: 2
operator: >
unit: GB
```

## Security Considerations

- Prometheus endpoint authentication
- Query injection prevention
- Rate limiting on query execution
- Resource limits for complex queries
- Audit logging for alert modifications

## Monitoring

### Viewer Metrics
- Query execution time
- Chart render time
- Cache hit rate
- Export request volume
- Alert rule evaluation frequency

## Future Enhancements

- Metric correlation analysis
- Anomaly detection with ML
- Custom dashboard sharing
- Real-time metric streaming (WebSocket)
- Integration with Grafana
- Multi-Prometheus federation support
- Custom metric ingestion
- Advanced analytics and forecasting
