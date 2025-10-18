# Widget Template Guide

This template provides a complete, production-ready starting point for creating new widgets for the ORION Admin UI.

## Features

- **Complete implementation** - Frontend, backend, and WebSocket support
- **Error handling** - Comprehensive error states and retry logic
- **TypeScript** - Fully typed for better development experience
- **Real-time updates** - Optional WebSocket support for live data
- **Export functionality** - Built-in JSON/CSV export
- **Responsive design** - Mobile-friendly layout
- **Accessibility** - ARIA labels and semantic HTML
- **Dark mode ready** - CSS includes dark mode support
- **Performance optimized** - Caching, memoization, and lazy loading

## Quick Start

### 1. Copy the Template

```bash
# From packages/admin-ui/
cp -r templates/widget your-new-widget-name

# Navigate to your new widget
cd your-new-widget-name
```

### 2. Find and Replace Placeholders

Replace these placeholders throughout all files:

| Placeholder | Example | Description |
|------------|---------|-------------|
| `__WIDGET_NAME__` | `user-analytics` | Kebab-case widget name |
| `WidgetName` | `UserAnalytics` | PascalCase widget name |
| `WIDGET_DESCRIPTION` | `User Analytics Dashboard` | Human-readable description |
| `WIDGET_CATEGORY` | `analytics` | Category: dashboard, analytics, monitoring, system, custom |
| `WIDGET_ICON` | `chart-bar` | Icon name from your icon library |
| `WIDGET_VERSION` | `1.0.0` | Semantic version |

**Quick find/replace script:**

```bash
# In your-new-widget-name directory
find . -type f -exec sed -i '' 's/__WIDGET_NAME__/user-analytics/g' {} +
find . -type f -exec sed -i '' 's/WidgetName/UserAnalytics/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_DESCRIPTION/User Analytics Dashboard/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_CATEGORY/analytics/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_ICON/chart-bar/g' {} +
find . -type f -exec sed -i '' 's/WIDGET_VERSION/1.0.0/g' {} +
```

### 3. Rename Files

```bash
# Rename main files
mv __WIDGET_NAME__.module.ts user-analytics.module.ts
mv __WIDGET_NAME__.controller.ts user-analytics.controller.ts
mv __WIDGET_NAME__.service.ts user-analytics.service.ts
```

### 4. Move to Extensions Directory

```bash
# From packages/admin-ui/
mv templates/your-new-widget-name src/app/extensions/widgets/
```

### 5. Import in App Module

```typescript
// src/app/app.module.ts
import { UserAnalyticsModule } from './extensions/widgets/user-analytics/user-analytics.module';

@Module({
  imports: [
    // ... other imports
    UserAnalyticsModule,
  ],
})
export class AppModule {}
```

### 6. Implement Your Logic

Now customize these files for your specific needs:

#### Backend Service (`user-analytics.service.ts`)

```typescript
// In queryDataSource() method
private async queryDataSource(config?: any) {
  // Replace with your actual data query
  // Examples in the template comments
  
  const users = await this.prisma.user.findMany({
    where: { active: true },
    include: { sessions: true },
  });
  
  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.sessions.length > 0).length,
    // ... your data
  };
}
```

#### Frontend Component (`frontend/UserAnalytics.tsx`)

```typescript
// In the render section
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-label">Total Users</div>
    <div className="stat-value">
      {processedData?.totalUsers || 0}
    </div>
  </div>
  {/* Add more stats */}
</div>
```

### 7. Test Your Widget

```bash
# Start the development server
nx serve admin-ui

# Test REST endpoint
curl http://localhost:3000/api/widgets/user-analytics/data

# Open frontend
open http://localhost:3000
```

## File Structure

```
user-analytics/
├── user-analytics.module.ts           # Module definition
├── user-analytics.controller.ts       # REST API endpoints
├── user-analytics.service.ts          # Business logic
├── user-analytics.gateway.ts          # WebSocket handler (optional)
├── dto/                               # Data transfer objects
│   ├── widget-config.dto.ts          # Configuration schema
│   └── widget-data.dto.ts            # Data response schema
├── frontend/                          # Frontend components
│   ├── UserAnalytics.tsx             # Main React component
│   ├── UserAnalytics.css             # Styles
│   └── index.ts                      # Exports
├── tests/                            # Unit tests
│   ├── user-analytics.service.spec.ts
│   └── user-analytics.controller.spec.ts
└── README.md                         # Widget documentation
```

## Customization Guide

### Adding Configuration Options

1. Update the config schema in the service:

```typescript
getConfigSchema() {
  return {
    type: 'object',
    properties: {
      // ... existing properties
      dateRange: {
        type: 'string',
        enum: ['7d', '30d', '90d'],
        default: '30d',
        description: 'Data time range',
      },
    },
  };
}
```

2. Update TypeScript interface in frontend:

```typescript
interface WidgetNameProps {
  config: {
    refreshInterval: number;
    dateRange: '7d' | '30d' | '90d';  // Add new config
    // ...
  };
}
```

3. Use in your component:

```typescript
const fetchData = async () => {
  // config.dateRange is now available
  const params = new URLSearchParams({
    dateRange: config.dateRange,
    // ...
  });
};
```

### Adding WebSocket Support

The template includes WebSocket code that's commented out. To enable:

1. Install Socket.IO (if not already):

```bash
pnpm add socket.io socket.io-client
```

2. Uncomment WebSocket code in:
   - `frontend/WidgetName.tsx` (useEffect for socket connection)
   - `__WIDGET_NAME__.gateway.ts` (entire file)

3. Add gateway to module providers:

```typescript
@Module({
  providers: [
    UserAnalyticsService,
    UserAnalyticsGateway,  // Add this
  ],
})
```

### Adding New API Endpoints

```typescript
// In controller
@Get('summary')
@ApiOperation({ summary: 'Get summary statistics' })
async getSummary() {
  return this.service.getSummary();
}

@Post('action')
@ApiOperation({ summary: 'Perform custom action' })
async performAction(@Body() data: ActionDto) {
  return this.service.performAction(data);
}
```

### Adding Charts/Visualizations

Example using Chart.js:

```bash
pnpm add chart.js react-chartjs-2
```

```typescript
import { Line } from 'react-chartjs-2';

const chartData = {
  labels: history.map(h => new Date(h.timestamp).toLocaleTimeString()),
  datasets: [{
    label: 'Hit Rate',
    data: history.map(h => h.hitRate),
    borderColor: '#3b82f6',
    tension: 0.4,
  }],
};

// In component
<div className="chart-container">
  <Line data={chartData} options={chartOptions} />
</div>
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
try {
  const data = await this.externalApi.fetch();
  return { success: true, data };
} catch (error) {
  this.logger.error(`Fetch failed: ${error.message}`, error.stack);
  
  // Return user-friendly error
  return {
    success: false,
    error: {
      message: 'Unable to fetch data. Please try again.',
      code: 'FETCH_ERROR',
    },
  };
}
```

### 2. Caching

Implement caching for expensive operations:

```typescript
private async getCachedData(key: string) {
  const cached = this.dataCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.data;
  }
  
  const fresh = await this.fetchFreshData();
  this.dataCache.set(key, { data: fresh, timestamp: Date.now() });
  
  return fresh;
}
```

### 3. Performance

- Use React.memo for expensive components
- Implement debouncing for rapid updates
- Lazy load heavy dependencies
- Paginate large datasets

### 4. Security

- Validate all inputs with DTOs and class-validator
- Sanitize error messages (remove sensitive data)
- Implement authentication/authorization
- Use HTTPS for production

### 5. Testing

```typescript
// Service test example
describe('UserAnalyticsService', () => {
  let service: UserAnalyticsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserAnalyticsService],
    }).compile();

    service = module.get(UserAnalyticsService);
  });

  it('should fetch data successfully', async () => {
    const result = await service.fetchData({});
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Checklist

Use this checklist to ensure your widget is complete:

- [ ] All placeholders replaced
- [ ] Files renamed appropriately
- [ ] Module imported in app.module.ts
- [ ] Configuration schema defined
- [ ] API endpoints implemented
- [ ] Frontend component customized
- [ ] Styles updated
- [ ] WebSocket support added (if needed)
- [ ] Error handling implemented
- [ ] Loading states working
- [ ] Export functionality working
- [ ] Tests written
- [ ] README.md updated
- [ ] Widget tested in browser
- [ ] Performance optimized
- [ ] Security reviewed

## Common Issues

### Widget Not Appearing

1. Check module is imported in `app.module.ts`
2. Verify widget registration in module constructor
3. Check browser console for errors
4. Ensure API endpoints are responding

### WebSocket Not Connecting

1. Check Socket.IO versions match
2. Verify CORS configuration
3. Check WebSocket port is open
4. Review browser console for connection errors

### Styles Not Applied

1. Ensure CSS file is imported in component
2. Check class names match between TSX and CSS
3. Verify Tailwind is processing styles
4. Clear browser cache

### Type Errors

1. Update TypeScript interfaces to match your data
2. Ensure DTOs are properly defined
3. Check imports are correct
4. Run `tsc --noEmit` to check for errors

## Next Steps

- Read the full [EXTENDING.md](../../EXTENDING.md) guide
- Review example widgets in `examples/widgets/`
- Check out the [ORION Architecture docs](../../../../docs/ARCHITECTURE.md)
- Join the developer community

## Support

For questions or issues:
- Check the main EXTENDING.md documentation
- Review example widgets
- Open an issue on GitHub
- Ask in the developer Discord