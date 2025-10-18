import { WidgetConfig } from '../types';

/**
 * Widget Registry - Central plugin system for managing dashboard widgets
 *
 * This registry implements a simple plugin architecture where widgets can be
 * registered and retrieved dynamically. This makes it easy to add new widgets
 * without modifying core dashboard code.
 *
 * Usage:
 * 1. Create a widget component implementing WidgetProps interface
 * 2. Register it: WidgetRegistry.register({ id: 'my-widget', name: 'My Widget', component: MyWidget })
 * 3. The widget is now available in the dashboard
 */
class WidgetRegistryService {
  private widgets: Map<string, WidgetConfig> = new Map();

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
  }
}

// Export singleton instance
export const WidgetRegistry = new WidgetRegistryService();

// Export class for testing
export { WidgetRegistryService };
