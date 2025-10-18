# ORION Admin Dashboard - Technical Specification

**Service Name**: Admin Dashboard
**Type**: Frontend Application
**Version**: 1.0.0
**Status**: Planning
**Owner**: Platform Team
**Created**: 2025-10-18

---

## 1. Overview

### 1.1 Purpose
The ORION Admin Dashboard is a comprehensive web application that provides real-time monitoring, management, and analytics for the entire ORION platform. It serves as the central control plane for platform administrators, developers, and operations teams.

### 1.2 Goals
- **Real-time Monitoring**: Live service health, metrics, and performance data
- **User Management**: Complete CRUD operations for platform users
- **Feature Control**: Manage feature flags and gradual rollouts
- **Cost Visibility**: Track and optimize AI usage costs
- **Debugging**: Centralized logging with correlation tracking
- **Webhook Management**: Configure and monitor webhook integrations
- **Analytics**: Deep insights into platform usage and trends

### 1.3 Non-Goals
- Not a customer-facing application
- Not a replacement for service-specific admin panels
- Not responsible for infrastructure provisioning (K8s, etc.)

---

## 2. Architecture

### 2.1 Technology Stack

```typescript
{
  "frontend": {
    "core": {
      "framework": "React 18.2.0",
      "language": "TypeScript 5.3.3",
      "bundler": "Vite 5.0.0"
    },
    "ui": {
      "components": "shadcn/ui 0.8.0",
      "styling": "Tailwind CSS 3.4.0",
      "primitives": "Radix UI",
      "icons": "Lucide React"
    },
    "state": {
      "server": "TanStack Query 5.0.0",
      "client": "Zustand 4.4.0"
    },
    "routing": "React Router 6.20.0",
    "forms": "React Hook Form 7.48.0 + Zod 3.22.0",
    "charts": "Recharts 2.10.0 + Tremor 3.13.0",
    "tables": "TanStack Table 8.11.0",
    "realtime": "WebSocket API + EventSource"
  },
  "build": {
    "packageManager": "pnpm 8.11.0",
    "linting": "ESLint 8.54.0",
    "formatting": "Prettier 3.1.0",
    "testing": "Vitest 1.0.0 + Testing Library"
  },
  "deployment": {
    "hosting": "Vercel / S3 + CloudFront",
    "cdn": "CloudFlare",
    "monitoring": "Sentry + Analytics"
  }
}
```

### 2.2 Project Structure

```
packages/admin-ui/
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Root component
│   │   ├── router.tsx              # Route configuration
│   │   └── providers.tsx           # Context providers
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (30+ components)
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        # Main layout
│   │   │   ├── Sidebar.tsx         # Navigation
│   │   │   ├── Header.tsx          # Top bar
│   │   │   └── Breadcrumbs.tsx
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── ServiceHealthCard.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── RequestVolumeChart.tsx
│   │   │   └── AlertBanner.tsx
│   │   ├── services/
│   │   │   ├── ServiceList.tsx
│   │   │   ├── ServiceDetail.tsx
│   │   │   ├── ServiceMetrics.tsx
│   │   │   └── HealthIndicator.tsx
│   │   ├── users/
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserDetail.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── PermissionMatrix.tsx
│   │   ├── feature-flags/
│   │   │   ├── FlagList.tsx
│   │   │   ├── FlagEditor.tsx
│   │   │   ├── RolloutControl.tsx
│   │   │   ├── TargetingRules.tsx
│   │   │   └── ABTestResults.tsx
│   │   ├── webhooks/
│   │   │   ├── WebhookList.tsx
│   │   │   ├── WebhookForm.tsx
│   │   │   ├── DeliveryLog.tsx
│   │   │   └── TestWebhook.tsx
│   │   ├── analytics/
│   │   │   ├── MetricsOverview.tsx
│   │   │   ├── UserGrowthChart.tsx
│   │   │   ├── APIUsageChart.tsx
│   │   │   ├── CostBreakdown.tsx
│   │   │   └── TopUsers.tsx
│   │   └── logs/
│   │       ├── LogViewer.tsx
│   │       ├── LogFilters.tsx
│   │       ├── LogDetail.tsx
│   │       └── CorrelationTrace.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx       # / (overview)
│   │   ├── ServicesPage.tsx        # /services
│   │   ├── ServiceDetailPage.tsx   # /services/:id
│   │   ├── UsersPage.tsx           # /users
│   │   ├── UserDetailPage.tsx      # /users/:id
│   │   ├── FlagsPage.tsx           # /flags
│   │   ├── WebhooksPage.tsx        # /webhooks
│   │   ├── AnalyticsPage.tsx       # /analytics
│   │   ├── LogsPage.tsx            # /logs
│   │   └── SettingsPage.tsx        # /settings
│   ├── hooks/
│   │   ├── useAuth.ts              # Authentication
│   │   ├── useServices.ts          # Services data
│   │   ├── useMetrics.ts           # Metrics fetching
│   │   ├── useWebSocket.ts         # WebSocket connection
│   │   ├── useRealTimeUpdates.ts   # Live data updates
│   │   ├── useFeatureFlags.ts      # Feature flag queries
│   │   └── usePagination.ts        # Table pagination
│   ├── api/
│   │   ├── client.ts               # Axios instance
│   │   ├── auth.ts                 # Auth endpoints
│   │   ├── services.ts             # Service endpoints
│   │   ├── users.ts                # User endpoints
│   │   ├── flags.ts                # Feature flag endpoints
│   │   ├── webhooks.ts             # Webhook endpoints
│   │   ├── analytics.ts            # Analytics endpoints
│   │   └── logs.ts                 # Logs endpoints
│   ├── lib/
│   │   ├── utils.ts                # Utility functions
│   │   ├── constants.ts            # Constants
│   │   ├── formatters.ts           # Data formatters
│   │   └── validators.ts           # Validation schemas
│   ├── types/
│   │   ├── api.ts                  # API response types
│   │   ├── domain.ts               # Domain models
│   │   └── index.ts                # Type exports
│   └── styles/
│       └── globals.css             # Global styles
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

### 2.3 Component Hierarchy

```
App
├── AuthProvider
│   └── QueryClientProvider
│       └── Router
│           └── AppShell
│               ├── Sidebar
│               ├── Header
│               └── Outlet (Page Content)
│                   ├── DashboardPage
│                   ├── ServicesPage
│                   ├── UsersPage
│                   ├── FlagsPage
│                   ├── WebhooksPage
│                   ├── AnalyticsPage
│                   └── LogsPage
```

---

## 3. Features & Requirements

### 3.1 Authentication & Authorization

**Requirements:**
- Login with email/password
- JWT token management (access + refresh)
- Auto-refresh on token expiration
- Role-based access control (Admin, Operator, Viewer)
- Logout functionality
- Session persistence

**API Integration:**
```typescript
POST /api/auth/login
  Body: { email: string, password: string }
  Response: { accessToken: string, refreshToken: string, user: User }

POST /api/auth/refresh
  Body: { refreshToken: string }
  Response: { accessToken: string, refreshToken: string }

POST /api/auth/logout
  Headers: { Authorization: Bearer <token> }
  Response: { success: boolean }
```

**Implementation:**
```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.getMe(),
    retry: false
  });

  const login = useMutation({
    mutationFn: (credentials: LoginCredentials) => api.auth.login(credentials),
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    }
  });

  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      localStorage.clear();
      queryClient.clear();
    }
  });

  return { user, isLoading, login, logout };
};
```

---

### 3.2 Dashboard Overview

**Requirements:**
- Real-time platform health status
- Key metrics cards (users, requests, errors)
- Service status list with health indicators
- Request volume chart (last 24h)
- Recent activity feed
- Alert notifications

**Data Sources:**
```typescript
// Real-time metrics via WebSocket
GET /api/health (polling every 30s)
GET /api/analytics/metrics/summary
GET /api/analytics/activity/recent
WebSocket: ws://gateway/metrics (real-time updates)
```

**Components:**
```typescript
// components/dashboard/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

// components/dashboard/ServiceHealthCard.tsx
interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number; // percentage
  responseTime: number; // ms
  requestsPerMinute: number;
}

// components/dashboard/RequestVolumeChart.tsx
interface RequestData {
  timestamp: string;
  count: number;
}
```

**Layout:**
```tsx
<DashboardPage>
  <Grid cols={3} gap={4}>
    <MetricCard title="Active Users" value={1247} change={12} />
    <MetricCard title="API Requests" value="45.2K/min" change={8} />
    <MetricCard title="Errors" value={12} change={-45} />
  </Grid>

  <ServiceHealthList services={services} />

  <Grid cols={2} gap={4}>
    <RequestVolumeChart data={volumeData} />
    <ActivityFeed items={recentActivity} />
  </Grid>
</DashboardPage>
```

---

### 3.3 Service Health Monitor

**Requirements:**
- List all microservices with current status
- Detailed view for each service
- Real-time metrics (response time, error rate, uptime)
- Resource usage (CPU, memory, replicas)
- Database and dependency health
- Historical performance graphs
- Incident timeline

**Data Sources:**
```typescript
GET /api/services
  Response: Service[]

GET /api/services/:id
  Response: ServiceDetail

GET /api/services/:id/metrics?timeRange=1h
  Response: Metrics[]

WebSocket: ws://gateway/services/:id/metrics (real-time)
```

**Service Model:**
```typescript
interface Service {
  id: string;
  name: string;
  version: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  uptime: number; // percentage (last 30 days)
  health: {
    database: { status: 'connected' | 'disconnected', latency: number };
    redis?: { status: 'connected' | 'disconnected', latency: number };
    dependencies: { name: string, status: string }[];
  };
  metrics: {
    responseTime: { p50: number, p95: number, p99: number };
    errorRate: number;
    requestsPerMinute: number;
    cpu: number; // percentage
    memory: { used: number, limit: number }; // bytes
    replicas: { current: number, desired: number };
  };
  incidents: Incident[];
}

interface Incident {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  resolved: boolean;
  resolvedAt?: string;
}
```

**Components:**
```tsx
<ServicesPage>
  <Filters>
    <Select options={['All', 'Operational', 'Degraded', 'Down']} />
    <TimeRangeSelect />
    <LiveToggle />
  </Filters>

  <ServiceList>
    {services.map(service => (
      <ServiceHealthCard key={service.id} service={service} />
    ))}
  </ServiceList>
</ServicesPage>

<ServiceDetailPage>
  <ServiceHeader service={service} />

  <Tabs>
    <Tab label="Metrics">
      <MetricsCharts service={service} />
    </Tab>
    <Tab label="Health">
      <HealthChecks service={service} />
    </Tab>
    <Tab label="Incidents">
      <IncidentTimeline incidents={service.incidents} />
    </Tab>
    <Tab label="Logs">
      <ServiceLogs serviceId={service.id} />
    </Tab>
  </Tabs>
</ServiceDetailPage>
```

---

### 3.4 User Management

**Requirements:**
- List all platform users with search and filters
- Create, read, update, delete users
- Manage user roles and permissions
- View user activity and usage metrics
- Disable/enable user accounts
- Reset passwords
- Bulk operations

**Data Sources:**
```typescript
GET /api/users?page=1&limit=20&search=john&role=admin
  Response: { users: User[], total: number, page: number }

GET /api/users/:id
  Response: UserDetail

POST /api/users
  Body: CreateUserDto
  Response: User

PATCH /api/users/:id
  Body: UpdateUserDto
  Response: User

DELETE /api/users/:id
  Response: { success: boolean }

POST /api/users/:id/reset-password
  Response: { success: boolean }

GET /api/users/:id/activity
  Response: UserActivity[]
```

**User Model:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'power_user' | 'user' | 'viewer';
  status: 'active' | 'disabled' | 'pending';
  createdAt: string;
  lastLoginAt?: string;
  permissions: Permission[];
}

interface UserDetail extends User {
  activity: {
    apiRequests: number; // last 24h
    aiUsage: number; // cost in last 30d
    featuresUsed: string[];
  };
  usage: {
    storage: number; // bytes
    bandwidth: number; // bytes
    aiTokens: number; // last 30d
  };
}

interface Permission {
  resource: string; // e.g., 'users', 'webhooks'
  actions: ('create' | 'read' | 'update' | 'delete')[];
}
```

**Components:**
```tsx
<UsersPage>
  <UserTableToolbar>
    <SearchInput />
    <RoleFilter />
    <StatusFilter />
    <Button onClick={openCreateDialog}>+ New User</Button>
  </UserTableToolbar>

  <UserTable
    data={users}
    columns={['name', 'email', 'role', 'status', 'lastLogin']}
    onRowClick={navigateToDetail}
    actions={['edit', 'disable', 'delete']}
  />

  <Pagination
    page={page}
    total={total}
    onPageChange={setPage}
  />
</UsersPage>

<UserDetailPage>
  <UserHeader user={user} />

  <Tabs>
    <Tab label="Overview">
      <UserInfo user={user} />
      <UserPermissions permissions={user.permissions} />
    </Tab>
    <Tab label="Activity">
      <UserActivityChart activity={user.activity} />
    </Tab>
    <Tab label="Usage">
      <UsageMetrics usage={user.usage} />
    </Tab>
  </Tabs>

  <CardFooter>
    <Button variant="outline" onClick={resetPassword}>Reset Password</Button>
    <Button variant="destructive" onClick={disableUser}>Disable User</Button>
  </CardFooter>
</UserDetailPage>
```

---

### 3.5 Feature Flags Management

**Requirements:**
- List all feature flags
- Create, edit, delete flags
- Control rollout percentage
- User/group targeting rules
- A/B test variants
- Real-time flag evaluation preview
- Flag usage analytics
- Change history

**Data Sources:**
```typescript
GET /api/flags
  Response: FeatureFlag[]

GET /api/flags/:key
  Response: FeatureFlagDetail

POST /api/flags
  Body: CreateFlagDto
  Response: FeatureFlag

PATCH /api/flags/:key
  Body: UpdateFlagDto
  Response: FeatureFlag

DELETE /api/flags/:key
  Response: { success: boolean }

POST /api/flags/:key/evaluate
  Body: { userId?: string, context?: Record<string, any> }
  Response: { enabled: boolean, variant?: string }

GET /api/flags/:key/analytics
  Response: FlagAnalytics
```

**Feature Flag Model:**
```typescript
interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'json' | 'multivariate';
  enabled: boolean;
  rollout: {
    percentage: number; // 0-100
    targeting: TargetingRule[];
  };
  variants?: Variant[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface TargetingRule {
  attribute: string; // e.g., 'userId', 'email', 'tier'
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan';
  value: string | number;
}

interface Variant {
  key: string;
  name: string;
  weight: number; // 0-100
  value: any;
}

interface FlagAnalytics {
  evaluations: number; // total
  enabled: number; // count
  disabled: number; // count
  byVariant?: Record<string, number>;
  topUsers: { userId: string, count: number }[];
}
```

**Components:**
```tsx
<FlagsPage>
  <FlagList>
    {flags.map(flag => (
      <FlagCard key={flag.key}>
        <FlagHeader
          name={flag.name}
          enabled={flag.enabled}
          rollout={flag.rollout.percentage}
        />
        <FlagStats flag={flag} />
        <FlagActions
          onEdit={() => openEditor(flag)}
          onToggle={() => toggleFlag(flag)}
          onDelete={() => deleteFlag(flag)}
        />
      </FlagCard>
    ))}
  </FlagList>
</FlagsPage>

<FlagEditorDialog flag={flag}>
  <Form>
    <Input name="key" label="Flag Key" />
    <Input name="name" label="Display Name" />
    <Textarea name="description" />

    <Select name="type" options={flagTypes} />

    <RolloutControl
      percentage={rollout.percentage}
      onChange={setRollout}
    />

    <TargetingRulesBuilder
      rules={rollout.targeting}
      onChange={setRules}
    />

    {flag.type === 'multivariate' && (
      <VariantsEditor
        variants={flag.variants}
        onChange={setVariants}
      />
    )}

    <FlagPreview flag={previewFlag} />
  </Form>
</FlagEditorDialog>
```

---

### 3.6 Webhooks Manager

**Requirements:**
- List all webhooks
- Create, edit, delete webhooks
- Configure events to subscribe to
- Test webhook with sample payload
- View delivery logs and status
- Retry failed deliveries
- Monitor delivery success rate
- Configure retry policies

**Data Sources:**
```typescript
GET /api/webhooks
  Response: Webhook[]

GET /api/webhooks/:id
  Response: WebhookDetail

POST /api/webhooks
  Body: CreateWebhookDto
  Response: Webhook

PATCH /api/webhooks/:id
  Body: UpdateWebhookDto
  Response: Webhook

DELETE /api/webhooks/:id
  Response: { success: boolean }

POST /api/webhooks/:id/test
  Body: { event: string, data: any }
  Response: { success: boolean, response: any }

GET /api/webhooks/:id/deliveries
  Response: WebhookDelivery[]

POST /api/webhooks/:id/deliveries/:deliveryId/retry
  Response: { success: boolean }
```

**Webhook Model:**
```typescript
interface Webhook {
  id: string;
  url: string;
  events: string[]; // ['user.created', 'order.completed']
  secret: string; // for HMAC signing
  status: 'active' | 'paused' | 'failed';
  createdAt: string;
  stats: {
    totalDeliveries: number;
    successRate: number;
    lastDelivery?: string;
    averageResponseTime: number;
  };
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  statusCode?: number;
  response?: any;
  error?: string;
  deliveredAt?: string;
  duration?: number; // ms
}
```

**Components:**
```tsx
<WebhooksPage>
  <Button onClick={openCreateDialog}>+ New Webhook</Button>

  <WebhookList>
    {webhooks.map(webhook => (
      <WebhookCard key={webhook.id}>
        <WebhookUrl url={webhook.url} />
        <WebhookEvents events={webhook.events} />
        <WebhookStats stats={webhook.stats} />
        <WebhookActions
          onTest={() => testWebhook(webhook)}
          onEdit={() => editWebhook(webhook)}
          onDisable={() => disableWebhook(webhook)}
        />
      </WebhookCard>
    ))}
  </WebhookList>
</WebhooksPage>

<WebhookFormDialog>
  <Form>
    <Input name="url" label="Webhook URL" />
    <MultiSelect name="events" options={availableEvents} />
    <Input name="secret" label="Secret Key" type="password" />

    <Accordion title="Advanced">
      <Input name="timeout" label="Timeout (seconds)" />
      <Input name="retryAttempts" label="Retry Attempts" />
      <JsonEditor name="customHeaders" label="Custom Headers" />
    </Accordion>
  </Form>
</WebhookFormDialog>

<DeliveryLogDialog webhook={webhook}>
  <DeliveryTable
    deliveries={deliveries}
    columns={['time', 'event', 'status', 'duration']}
    actions={['viewPayload', 'retry']}
  />
</DeliveryLogDialog>
```

---

### 3.7 Analytics Dashboard

**Requirements:**
- Platform-wide metrics overview
- User growth charts
- API usage by service
- AI usage and cost tracking
- Feature adoption metrics
- Custom date ranges
- Export reports (CSV, PDF)
- Scheduled reports

**Data Sources:**
```typescript
GET /api/analytics/overview?from=2025-10-01&to=2025-10-31
  Response: AnalyticsOverview

GET /api/analytics/users/growth?period=30d
  Response: GrowthData[]

GET /api/analytics/api/usage?groupBy=service&period=7d
  Response: UsageData[]

GET /api/analytics/ai/costs?period=30d
  Response: CostData

GET /api/analytics/features/adoption
  Response: FeatureAdoption[]
```

**Analytics Models:**
```typescript
interface AnalyticsOverview {
  totalUsers: { value: number, change: number };
  activeUsers: { value: number, change: number };
  apiRequests: { value: number, change: number };
  aiGenerations: { value: number, change: number };
  errorRate: { value: number, change: number };
  revenue: { value: number, change: number };
}

interface GrowthData {
  date: string;
  newUsers: number;
  activeUsers: number;
  churnedUsers: number;
}

interface UsageData {
  service: string;
  requests: number;
  errors: number;
  avgResponseTime: number;
}

interface CostData {
  total: number;
  breakdown: {
    service: string;
    provider: string;
    model: string;
    cost: number;
    tokens: number;
  }[];
  savings: {
    cacheHits: number;
    modelSelection: number;
    batchProcessing: number;
  };
}
```

**Components:**
```tsx
<AnalyticsPage>
  <AnalyticsHeader>
    <DateRangePicker onChange={setDateRange} />
    <ExportButton formats={['csv', 'pdf']} />
  </AnalyticsHeader>

  <MetricsGrid>
    <MetricCard title="Total Users" data={overview.totalUsers} />
    <MetricCard title="Active Users" data={overview.activeUsers} />
    <MetricCard title="API Requests" data={overview.apiRequests} />
    <MetricCard title="AI Generations" data={overview.aiGenerations} />
  </MetricsGrid>

  <ChartsGrid>
    <Card title="User Growth">
      <LineChart data={growthData} />
    </Card>

    <Card title="API Usage by Service">
      <BarChart data={usageData} />
    </Card>

    <Card title="AI Cost Breakdown">
      <PieChart data={costData.breakdown} />
    </Card>

    <Card title="Feature Adoption">
      <HorizontalBarChart data={adoptionData} />
    </Card>
  </ChartsGrid>

  <TopUsersTable users={topUsers} />
</AnalyticsPage>
```

---

### 3.8 Logs Viewer

**Requirements:**
- Real-time log streaming
- Search by correlation ID, user ID, service
- Filter by log level, time range
- Group related logs by correlation ID
- View full stack traces
- Export logs
- Create alerts from log patterns

**Data Sources:**
```typescript
GET /api/logs?
  service=auth&
  level=error&
  from=2025-10-18T00:00:00Z&
  to=2025-10-18T23:59:59Z&
  search=correlation_id:abc123
  Response: LogEntry[]

GET /api/logs/correlation/:correlationId
  Response: LogEntry[]

WebSocket: ws://gateway/logs/stream (real-time)
```

**Log Model:**
```typescript
interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  service: string;
  message: string;
  correlationId?: string;
  userId?: string;
  metadata: Record<string, any>;
  stackTrace?: string;
}
```

**Components:**
```tsx
<LogsPage>
  <LogFilters>
    <ServiceSelect />
    <LevelSelect />
    <DateTimeRangePicker />
    <SearchInput placeholder="Search logs, correlation IDs..." />
    <LiveToggle />
  </LogFilters>

  <LogViewer>
    {logs.map(log => (
      <LogEntry key={log.id} log={log}>
        <LogHeader
          timestamp={log.timestamp}
          level={log.level}
          service={log.service}
        />
        <LogMessage message={log.message} />
        {log.correlationId && (
          <CorrelationLink id={log.correlationId} />
        )}
        {log.stackTrace && (
          <Accordion title="Stack Trace">
            <CodeBlock code={log.stackTrace} />
          </Accordion>
        )}
      </LogEntry>
    ))}
  </LogViewer>

  <LogActions>
    <Button onClick={exportLogs}>Export</Button>
    <Button onClick={createAlert}>Create Alert</Button>
  </LogActions>
</LogsPage>

<CorrelationTraceDialog correlationId={id}>
  <Timeline>
    {relatedLogs.map(log => (
      <TimelineItem
        time={log.timestamp}
        service={log.service}
        message={log.message}
      />
    ))}
  </Timeline>
</CorrelationTraceDialog>
```

---

## 4. Performance Requirements

### 4.1 Load Times
- **Initial Load**: <2s (3G connection)
- **Route Navigation**: <100ms
- **API Requests**: <500ms (P95)
- **Chart Rendering**: <200ms
- **Table Rendering**: <100ms (1000 rows with virtualization)

### 4.2 Bundle Size
- **Initial JS**: <150KB gzipped
- **Initial CSS**: <20KB gzipped
- **Code Splitting**: Routes lazy-loaded
- **Tree Shaking**: Remove unused code

### 4.3 Optimization Strategies
- Vite for fast builds
- React.lazy() for code splitting
- TanStack Query for caching
- Virtual scrolling for large lists
- Debounced search inputs
- Optimistic updates
- Service Worker for offline support

---

## 5. Accessibility

### 5.1 WCAG 2.1 AA Compliance
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus indicators
- Color contrast ratios >4.5:1
- Screen reader support

### 5.2 Keyboard Shortcuts
- `/` - Focus search
- `g d` - Go to dashboard
- `g s` - Go to services
- `g u` - Go to users
- `?` - Show keyboard shortcuts

---

## 6. Testing Strategy

### 6.1 Unit Tests (Vitest)
- Component rendering
- Hook logic
- Utility functions
- **Coverage**: >80%

### 6.2 Integration Tests (Testing Library)
- User interactions
- Form submissions
- API mocking
- Navigation flows

### 6.3 E2E Tests (Playwright)
- Critical user journeys
- Cross-browser testing
- Visual regression

---

## 7. Deployment

### 7.1 Build Process
```bash
pnpm install
pnpm build
# Output: dist/
```

### 7.2 Environment Variables
```bash
VITE_API_BASE_URL=https://api.orion.example.com
VITE_WS_URL=wss://api.orion.example.com
VITE_SENTRY_DSN=https://...
```

### 7.3 Hosting Options
1. **Vercel** (Recommended)
   - Auto preview deployments
   - Edge network
   - Analytics built-in

2. **S3 + CloudFront**
   - Full control
   - Cost-effective
   - CDN global distribution

3. **Netlify**
   - Simple deployments
   - Split testing
   - Form handling

---

## 8. Security

### 8.1 Authentication
- JWT tokens in localStorage
- Auto token refresh
- CSRF protection
- XSS prevention (React escapes by default)

### 8.2 Authorization
- Role-based access control
- Permission checks before rendering
- API-level authorization (server-side)

### 8.3 Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' wss://api.orion.example.com;
```

---

## 9. Monitoring & Analytics

### 9.1 Error Tracking (Sentry)
- JavaScript errors
- API errors
- Performance issues
- User session replay

### 9.2 Analytics
- Page views
- User actions
- Conversion funnels
- A/B test results

### 9.3 Performance Monitoring
- Core Web Vitals
- Time to Interactive
- API response times
- Bundle size tracking

---

## 10. Development Workflow

### 10.1 Local Development
```bash
pnpm install
pnpm dev
# http://localhost:5173
```

### 10.2 Code Style
- ESLint for linting
- Prettier for formatting
- Pre-commit hooks (Husky)
- Conventional commits

### 10.3 Git Workflow
- Feature branches
- Pull request reviews
- CI/CD on merge to main
- Automated testing

---

## 11. Future Enhancements

### Phase 2
- Dark mode support
- Customizable dashboards
- Saved filters and views
- Collaborative features (shared dashboards)

### Phase 3
- Mobile app (React Native)
- Advanced alerting rules
- ML-powered anomaly detection
- Cost forecasting

---

## 12. Success Metrics

### 12.1 User Satisfaction
- NPS score >50
- <5% error rate
- <2s average page load

### 12.2 Adoption
- 100% admin team usage
- 80% daily active users
- <10min onboarding time

### 12.3 Performance
- 99.9% uptime
- <100ms API response times
- <150KB initial bundle size

---

**Status**: Ready for Implementation
**Next Steps**: Initialize Vite project, setup shadcn/ui, implement authentication
**Estimated Timeline**: 2-3 weeks for Phase 1
