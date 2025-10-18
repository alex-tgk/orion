import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { DashboardLayout } from './components/DashboardLayout';
import { WidgetGrid } from './components/WidgetGrid';
import { WidgetRegistry } from './services/widget-registry';
import { NavItem, WidgetInstance, User } from './types';
import {
  SystemOverviewWidget,
  RecentActivityWidget,
  QuickStatsWidget,
  ServicesStatusWidget,
} from './widgets';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Retry failed requests once
      staleTime: 5000, // Consider data fresh for 5 seconds
    },
  },
});

/**
 * Register all available widgets
 * This is where you add new widgets to make them available in the dashboard
 */
const registerWidgets = () => {
  WidgetRegistry.register({
    id: 'system-overview',
    name: 'System Overview',
    description: 'Display system health and service status',
    component: SystemOverviewWidget,
    category: 'monitoring',
    defaultSize: { cols: 4, rows: 2 },
  });

  WidgetRegistry.register({
    id: 'services-status',
    name: 'Services Status',
    description: 'Monitor all microservices health and status',
    component: ServicesStatusWidget,
    category: 'monitoring',
    defaultSize: { cols: 6, rows: 2 },
  });

  WidgetRegistry.register({
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Show recent system events and activities',
    component: RecentActivityWidget,
    category: 'monitoring',
    defaultSize: { cols: 4, rows: 2 },
  });

  WidgetRegistry.register({
    id: 'quick-stats',
    name: 'Quick Stats',
    description: 'Display key metrics and statistics',
    component: QuickStatsWidget,
    category: 'analytics',
    defaultSize: { cols: 8, rows: 1 },
  });
};

// Default navigation items
const defaultNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/',
  },
  {
    id: 'services',
    label: 'Services',
    icon: '🔧',
    badge: '8',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📈',
  },
  {
    id: 'users',
    label: 'Users',
    icon: '👥',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    children: [
      {
        id: 'settings-general',
        label: 'General',
      },
      {
        id: 'settings-security',
        label: 'Security',
      },
    ],
  },
];

// Default dashboard layout
const defaultWidgets: WidgetInstance[] = [
  {
    id: 'widget-1',
    widgetId: 'quick-stats',
    position: { x: 0, y: 0, width: 12, height: 1 },
  },
  {
    id: 'widget-2',
    widgetId: 'system-overview',
    position: { x: 0, y: 1, width: 6, height: 2 },
  },
  {
    id: 'widget-3',
    widgetId: 'services-status',
    position: { x: 6, y: 1, width: 6, height: 2 },
  },
  {
    id: 'widget-4',
    widgetId: 'recent-activity',
    position: { x: 0, y: 3, width: 12, height: 2 },
  },
];

export const App: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetInstance[]>(defaultWidgets);
  const [user] = useState<User>({
    id: '1',
    name: 'Admin User',
    email: 'admin@orion.io',
    role: 'Administrator',
  });

  // Register widgets on mount
  useEffect(() => {
    registerWidgets();
    console.log('ORION Admin Dashboard initialized');
    console.log('Registered widgets:', WidgetRegistry.getAll().map(w => w.name));
  }, []);

  const handleNavClick = (item: NavItem) => {
    console.log('Navigation clicked:', item.label);
    // TODO: Implement routing/navigation
  };

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout
        navItems={defaultNavItems}
        user={user}
        onNavClick={handleNavClick}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.name}</h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your system today.</p>
          </div>

          <WidgetGrid widgets={widgets} columns={12} gap={6} />
        </div>
      </DashboardLayout>
      {/* React Query Devtools - only shows in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
