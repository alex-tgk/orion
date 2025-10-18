# ORION Admin Dashboard - Widget System

## Overview

The ORION Admin Dashboard uses an extensible plugin-based widget architecture that makes it easy to add new widgets without modifying core dashboard code.

## Architecture

### Widget Registry

The `WidgetRegistry` is the central service that manages all available widgets:

```typescript
import { WidgetRegistry } from './services/widget-registry';
```

### Widget Configuration

Each widget is defined by a `WidgetConfig` object:

```typescript
interface WidgetConfig {
  id: string;                              // Unique identifier
  name: string;                            // Display name
  description?: string;                    // Optional description
  component: React.ComponentType<WidgetProps>;  // React component
  defaultSize?: WidgetSize;                // Default grid size
  minSize?: WidgetSize;                    // Minimum allowed size
  maxSize?: WidgetSize;                    // Maximum allowed size
  category?: string;                       // Category for grouping
  icon?: string;                          // Icon identifier
  refreshInterval?: number;                // Auto-refresh interval (ms)
}
```

## Creating a New Widget

### Step 1: Create the Widget Component

Create a new file in `/src/frontend/widgets/YourWidget.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { WidgetProps } from '../types';

export const YourWidget: React.FC<WidgetProps> = ({ config, onRefresh }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Load your data here
    loadData();
  }, []);

  const loadData = async () => {
    // Fetch data from API or other source
  };

  return (
    <div className="widget-card">
      <h3 className="widget-header">Your Widget Title</h3>
      {/* Your widget content */}
    </div>
  );
};
```

### Step 2: Export the Widget

Add your widget to `/src/frontend/widgets/index.ts`:

```typescript
export { YourWidget } from './YourWidget';
```

### Step 3: Register the Widget

In `/src/frontend/App.tsx`, add your widget to the `registerWidgets()` function:

```typescript
const registerWidgets = () => {
  // ... existing widgets ...

  WidgetRegistry.register({
    id: 'your-widget',
    name: 'Your Widget Name',
    description: 'Description of what your widget does',
    component: YourWidget,
    category: 'analytics', // or 'monitoring', 'system', etc.
    defaultSize: { cols: 4, rows: 2 },
  });
};
```

### Step 4: Add Widget to Dashboard

Add your widget to the dashboard layout in `App.tsx`:

```typescript
const defaultWidgets: WidgetInstance[] = [
  // ... existing widgets ...
  {
    id: 'widget-unique-id',
    widgetId: 'your-widget',
    position: { x: 0, y: 3, width: 6, height: 2 },
    config: {
      // Optional widget-specific configuration
      customParam: 'value',
    },
  },
];
```

## Widget Props

All widgets receive the following props:

```typescript
interface WidgetProps {
  config?: Record<string, unknown>;  // Widget-specific configuration
  onRefresh?: () => void;           // Callback when widget is refreshed
  onRemove?: () => void;            // Callback when widget is removed
  onConfigure?: () => void;         // Callback to open settings
}
```

## Grid System

The dashboard uses a 12-column grid system:

- `cols`: Number of columns (1-12)
- `rows`: Number of rows (height)
- `x`: Starting column (0-11)
- `y`: Starting row (0+)

### Grid Size Examples

```typescript
// Full width widget
{ width: 12, height: 1 }

// Half width widget
{ width: 6, height: 2 }

// Quarter width widget
{ width: 3, height: 2 }
```

## Styling

### Using CSS Classes

Predefined CSS classes in `globals.css`:

- `.widget-card` - Standard widget container with shadow and padding
- `.widget-header` - Widget title styling
- `.stat-value` - Large numeric values
- `.stat-label` - Small label text
- `.btn-primary` - Primary button style
- `.btn-secondary` - Secondary button style

### Example Widget Structure

```typescript
<div className="widget-card">
  <div className="flex items-center justify-between mb-4">
    <h3 className="widget-header">Widget Title</h3>
    <button onClick={onRefresh} className="btn-secondary">
      Refresh
    </button>
  </div>

  <div className="space-y-4">
    <div className="stat-label">Label</div>
    <div className="stat-value">123</div>
  </div>
</div>
```

## Data Fetching

Use the API service for backend communication:

```typescript
import { API } from '../services/api';

const loadData = async () => {
  try {
    const data = await API.getYourData();
    setData(data);
  } catch (error) {
    console.error('Failed to load data:', error);
  }
};
```

## Auto-Refresh

Implement auto-refresh using `useEffect`:

```typescript
useEffect(() => {
  loadData();
  const interval = setInterval(loadData, 30000); // 30 seconds
  return () => clearInterval(interval);
}, []);
```

## Best Practices

1. **Keep widgets self-contained** - Each widget should manage its own state and data
2. **Handle loading states** - Show loading indicators while fetching data
3. **Handle errors gracefully** - Display error messages instead of breaking
4. **Use TypeScript** - Define proper types for your data
5. **Optimize performance** - Avoid unnecessary re-renders
6. **Make it responsive** - Test at different grid sizes
7. **Add refresh capability** - Allow users to manually refresh data

## Available Widgets

### System Overview Widget
- **ID**: `system-overview`
- **Category**: monitoring
- **Size**: 6x2
- **Description**: Displays system health and service status

### Recent Activity Widget
- **ID**: `recent-activity`
- **Category**: monitoring
- **Size**: 6x2
- **Description**: Shows recent system events and activities

### Quick Stats Widget
- **ID**: `quick-stats`
- **Category**: analytics
- **Size**: 12x1
- **Description**: Displays key metrics in a grid

## Example: Custom Widget

```typescript
// src/frontend/widgets/CustomMetricsWidget.tsx
import React, { useState, useEffect } from 'react';
import { WidgetProps } from '../types';
import { API } from '../services/api';

export const CustomMetricsWidget: React.FC<WidgetProps> = ({ config, onRefresh }) => {
  const [metrics, setMetrics] = useState({ cpu: 0, memory: 0, disk: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Replace with your actual API call
      const data = await API.getCustomMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="widget-card">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <h3 className="widget-header">System Metrics</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="stat-label">CPU</div>
          <div className="stat-value">{metrics.cpu}%</div>
        </div>
        <div>
          <div className="stat-label">Memory</div>
          <div className="stat-value">{metrics.memory}%</div>
        </div>
        <div>
          <div className="stat-label">Disk</div>
          <div className="stat-value">{metrics.disk}%</div>
        </div>
      </div>
    </div>
  );
};

// Register in App.tsx
WidgetRegistry.register({
  id: 'custom-metrics',
  name: 'System Metrics',
  description: 'Real-time system resource usage',
  component: CustomMetricsWidget,
  category: 'monitoring',
  defaultSize: { cols: 8, rows: 1 },
  refreshInterval: 5000,
});
```

## Troubleshooting

### Widget Not Appearing
1. Ensure the widget is registered in `App.tsx`
2. Check that the widget ID matches in registration and instance
3. Verify the widget component is exported from `widgets/index.ts`

### Styling Issues
1. Make sure Tailwind classes are used correctly
2. Check that `globals.css` is imported in `index.tsx`
3. Verify the widget is wrapped in `widget-card` class

### Data Not Loading
1. Check browser console for errors
2. Verify API endpoint is correct
3. Ensure error handling is implemented
4. Check network tab for failed requests
