/**
 * Widget lifecycle hooks
 */
export interface WidgetLifecycle {
  /** Called when widget is mounted to DOM */
  onMount?(container: HTMLElement, config: any): void | Promise<void>;

  /** Called when widget configuration changes */
  onConfigChange?(newConfig: any, oldConfig: any): void | Promise<void>;

  /** Called when widget needs to refresh data */
  onRefresh?(): void | Promise<void>;

  /** Called when widget is resized */
  onResize?(width: number, height: number): void | Promise<void>;

  /** Called when widget enters full-screen mode */
  onFullscreen?(enabled: boolean): void | Promise<void>;

  /** Called when widget is unmounted from DOM */
  onUnmount?(): void | Promise<void>;

  /** Called when widget is destroyed */
  onDestroy?(): void | Promise<void>;
}

/**
 * Widget data source configuration
 */
export interface WidgetDataSource {
  /** Data source type */
  type: 'rest' | 'websocket' | 'graphql' | 'static';

  /** API endpoint or URL */
  url?: string;

  /** HTTP method (for REST) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /** Request headers */
  headers?: Record<string, string>;

  /** Request body */
  body?: any;

  /** Query parameters */
  params?: Record<string, any>;

  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;

  /** WebSocket event to subscribe to */
  event?: string;

  /** Data transformation function */
  transform?: (data: any) => any;
}

/**
 * Widget state
 */
export interface WidgetState {
  /** Widget is currently loading data */
  loading: boolean;

  /** Widget has an error */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  /** Widget data */
  data?: any;

  /** Last update timestamp */
  lastUpdate?: Date;

  /** Widget configuration */
  config?: any;
}

/**
 * Widget action definition
 */
export interface WidgetAction {
  /** Action identifier */
  id: string;

  /** Action label */
  label: string;

  /** Action icon */
  icon?: string;

  /** Action handler */
  handler: () => void | Promise<void>;

  /** Action is disabled */
  disabled?: boolean;

  /** Action requires confirmation */
  confirm?: boolean;

  /** Confirmation message */
  confirmMessage?: string;
}

/**
 * Widget export options
 */
export interface WidgetExportOptions {
  /** Export format */
  format: 'csv' | 'json' | 'pdf' | 'png';

  /** File name (without extension) */
  filename?: string;

  /** Include timestamp in filename */
  includeTimestamp?: boolean;

  /** Additional export options */
  options?: Record<string, any>;
}
