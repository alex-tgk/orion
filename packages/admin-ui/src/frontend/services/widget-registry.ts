import { WidgetConfig, WidgetInstance } from '../types';

/**
 * Widget Registry - Central plugin system for managing dashboard widgets
 *
 * This registry implements a plugin architecture where widgets can be
 * registered and retrieved dynamically with lifecycle hooks support.
 * This makes it easy to add new widgets without modifying core dashboard code.
 *
 * Features:
 * - Dynamic widget registration/unregistration
 * - Lifecycle hooks (onMount, onUnmount, onUpdate, onRefresh)
 * - Category-based organization
 * - Instance tracking
 *
 * Usage:
 * 1. Create a widget component implementing WidgetProps interface
 * 2. Register it: WidgetRegistry.register({ id: 'my-widget', name: 'My Widget', component: MyWidget, lifecycle: {...} })
 * 3. The widget is now available in the dashboard
 */
class WidgetRegistryService {
  private widgets: Map<string, WidgetConfig> = new Map();
  private instances: Map<string, WidgetInstance> = new Map();

  /**
   * Register a new widget
   * @param config Widget configuration
   */
  register(config: WidgetConfig): void {
    if (this.widgets.has(config.id)) {
      console.warn(`Widget with id "${config.id}" is already registered. Overwriting.`);
    }
    this.widgets.set(config.id, config);
    console.log(`Widget registered: ${config.name} (${config.id})`);
  }

  /**
   * Unregister a widget
   * @param id Widget ID
   */
  unregister(id: string): boolean {
    return this.widgets.delete(id);
  }

  /**
   * Get a widget configuration by ID
   * @param id Widget ID
   * @returns Widget configuration or undefined
   */
  get(id: string): WidgetConfig | undefined {
    return this.widgets.get(id);
  }

  /**
   * Get all registered widgets
   * @returns Array of all widget configurations
   */
  getAll(): WidgetConfig[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets by category
   * @param category Category name
   * @returns Array of matching widgets
   */
  getByCategory(category: string): WidgetConfig[] {
    return this.getAll().filter(widget => widget.category === category);
  }

  /**
   * Check if a widget is registered
   * @param id Widget ID
   * @returns true if registered, false otherwise
   */
  has(id: string): boolean {
    return this.widgets.has(id);
  }

  /**
   * Get all available categories
   * @returns Array of unique category names
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.getAll().forEach(widget => {
      if (widget.category) {
        categories.add(widget.category);
      }
    });
    return Array.from(categories);
  }

  /**
   * Clear all registered widgets (useful for testing)
   */
  clear(): void {
    this.widgets.clear();
    this.instances.clear();
  }

  /**
   * Create and mount a widget instance
   * @param instance Widget instance configuration
   */
  async mountInstance(instance: WidgetInstance): Promise<void> {
    const config = this.widgets.get(instance.widgetId);
    if (!config) {
      throw new Error(`Widget with id "${instance.widgetId}" is not registered`);
    }

    this.instances.set(instance.id, instance);

    // Call lifecycle hook
    if (config.lifecycle?.onMount) {
      await config.lifecycle.onMount(instance.id, instance.config);
    }
  }

  /**
   * Unmount and destroy a widget instance
   * @param instanceId Widget instance ID
   */
  async unmountInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    const config = this.widgets.get(instance.widgetId);
    if (config?.lifecycle?.onUnmount) {
      await config.lifecycle.onUnmount(instanceId);
    }

    this.instances.delete(instanceId);
  }

  /**
   * Update a widget instance configuration
   * @param instanceId Widget instance ID
   * @param newConfig New configuration
   */
  async updateInstance(instanceId: string, newConfig: Record<string, unknown>): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Widget instance with id "${instanceId}" not found`);
    }

    const config = this.widgets.get(instance.widgetId);
    const prevConfig = instance.config;

    instance.config = newConfig;
    this.instances.set(instanceId, instance);

    // Call lifecycle hook
    if (config?.lifecycle?.onUpdate) {
      await config.lifecycle.onUpdate(instanceId, prevConfig, newConfig);
    }
  }

  /**
   * Refresh a widget instance
   * @param instanceId Widget instance ID
   */
  async refreshInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    const config = this.widgets.get(instance.widgetId);
    if (config?.lifecycle?.onRefresh) {
      await config.lifecycle.onRefresh(instanceId);
    }
  }

  /**
   * Get a widget instance
   * @param instanceId Widget instance ID
   */
  getInstance(instanceId: string): WidgetInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get all widget instances
   */
  getAllInstances(): WidgetInstance[] {
    return Array.from(this.instances.values());
  }
}

// Export singleton instance
export const WidgetRegistry = new WidgetRegistryService();

// Export class for testing
export { WidgetRegistryService };
