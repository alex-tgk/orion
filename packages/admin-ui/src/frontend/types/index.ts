import { ReactNode } from 'react';

/**
 * Widget metadata and configuration
 */
export interface WidgetConfig {
  id: string;
  name: string;
  description?: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize?: WidgetSize;
  minSize?: WidgetSize;
  maxSize?: WidgetSize;
  category?: string;
  icon?: string;
  refreshInterval?: number; // in milliseconds
}

/**
 * Widget size specification
 */
export interface WidgetSize {
  cols: number; // number of grid columns (1-12)
  rows: number; // number of grid rows
}

/**
 * Widget position in the grid
 */
export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Props passed to widget components
 */
export interface WidgetProps {
  config?: Record<string, unknown>;
  onRefresh?: () => void;
  onRemove?: () => void;
  onConfigure?: () => void;
}

/**
 * Widget instance in the dashboard
 */
export interface WidgetInstance {
  id: string;
  widgetId: string;
  position: WidgetPosition;
  config?: Record<string, unknown>;
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  widgets: WidgetInstance[];
  columns: number;
  rowHeight: number;
}

/**
 * Navigation item for sidebar
 */
export interface NavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  badge?: string | number;
  children?: NavItem[];
}

/**
 * User information
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

/**
 * System status
 */
export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  services: {
    name: string;
    status: 'running' | 'stopped' | 'error';
  }[];
}

/**
 * Activity log entry
 */
export interface ActivityEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  user?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Statistics data
 */
export interface StatData {
  label: string;
  value: string | number;
  change?: number; // percentage change
  trend?: 'up' | 'down' | 'stable';
}
