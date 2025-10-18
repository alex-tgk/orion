/**
 * Custom React hooks for data fetching and WebSocket integration
 * Data fetching hooks use React Query for caching, automatic refetching, and state management
 * WebSocket hooks provide real-time updates
 */

// WebSocket hooks
export { useWebSocket } from './useWebSocket';
export { useServiceHealth } from './useServiceHealth';
export { useSystemEvents } from './useSystemEvents';
export { useMetrics } from './useMetrics';
export { useAlerts } from './useAlerts';

// Data fetching hooks (React Query) - to be implemented or already exist
export type { UseSystemEventsOptions } from './useSystemEvents';
export type { UseMetricsOptions } from './useMetrics';
export type { UseAlertsOptions } from './useAlerts';
