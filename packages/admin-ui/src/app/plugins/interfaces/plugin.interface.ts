/**
 * Base plugin interface for all ORION Admin UI plugins
 */
export interface Plugin {
  /** Unique identifier for the plugin */
  id: string;

  /** Human-readable name */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Brief description of plugin functionality */
  description?: string;

  /** Plugin author or team */
  author?: string;

  /** Plugin tags for categorization */
  tags?: string[];

  /** Lifecycle: Called when plugin is registered */
  onRegister?(): void | Promise<void>;

  /** Lifecycle: Called when plugin is enabled */
  onEnable?(): void | Promise<void>;

  /** Lifecycle: Called when plugin is disabled */
  onDisable?(): void | Promise<void>;

  /** Lifecycle: Called when plugin is unregistered */
  onUnregister?(): void | Promise<void>;
}

/**
 * Widget-specific plugin interface
 */
export interface WidgetPlugin extends Plugin {
  /** Widget category for organization */
  category: 'dashboard' | 'analytics' | 'monitoring' | 'system' | 'custom';

  /** Icon name (from icon library) */
  icon?: string;

  /** Default widget size on dashboard grid */
  defaultSize?: {
    width: number;  // Grid columns (1-12)
    height: number; // Grid rows (1-10)
  };

  /** Minimum widget size constraints */
  minSize?: {
    width: number;
    height: number;
  };

  /** Maximum widget size constraints */
  maxSize?: {
    width: number;
    height: number;
  };

  /** JSON Schema for widget configuration */
  configSchema?: any;

  /** Required permissions to use this widget */
  permissions?: string[];

  /** Widget can be resized */
  resizable?: boolean;

  /** Widget supports full-screen mode */
  fullscreenCapable?: boolean;

  /** Widget supports export functionality */
  exportable?: boolean;

  /** Export formats supported */
  exportFormats?: ('csv' | 'json' | 'pdf' | 'png')[];
}

/**
 * Plugin metadata returned from registry
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  enabled: boolean;
  registeredAt: Date;
  enabledAt?: Date;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  [key: string]: any;
}

/**
 * Plugin lifecycle events
 */
export enum PluginEvent {
  REGISTERED = 'plugin:registered',
  ENABLED = 'plugin:enabled',
  DISABLED = 'plugin:disabled',
  UNREGISTERED = 'plugin:unregistered',
  ERROR = 'plugin:error',
}
