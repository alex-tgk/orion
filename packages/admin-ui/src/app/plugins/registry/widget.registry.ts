import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WidgetPlugin,
  PluginMetadata,
  PluginEvent,
} from '../interfaces/plugin.interface';
import { PLUGIN_METADATA } from '../decorators/plugin.decorator';

/**
 * Central registry for managing widget plugins
 */
@Injectable()
export class WidgetRegistry implements OnModuleInit {
  private readonly logger = new Logger(WidgetRegistry.name);
  private readonly widgets = new Map<string, WidgetPlugin>();
  private readonly metadata = new Map<string, PluginMetadata>();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Widget Registry initialized');
  }

  /**
   * Register a new widget plugin
   */
  register(widget: WidgetPlugin): void {
    if (this.widgets.has(widget.id)) {
      this.logger.warn(`Widget ${widget.id} is already registered. Skipping.`);
      return;
    }

    // Validate widget
    this.validateWidget(widget);

    // Store widget
    this.widgets.set(widget.id, widget);

    // Create metadata
    const metadata: PluginMetadata = {
      id: widget.id,
      name: widget.name,
      version: widget.version,
      description: widget.description,
      category: widget.category,
      enabled: true,
      registeredAt: new Date(),
      enabledAt: new Date(),
    };
    this.metadata.set(widget.id, metadata);

    // Call lifecycle hook
    if (widget.onRegister) {
      widget.onRegister();
    }

    // Emit event
    this.eventEmitter.emit(PluginEvent.REGISTERED, metadata);

    this.logger.log(`Registered widget: ${widget.id} v${widget.version}`);
  }

  /**
   * Unregister a widget plugin
   */
  unregister(widgetId: string): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      this.logger.warn(`Widget ${widgetId} not found`);
      return;
    }

    // Call lifecycle hook
    if (widget.onUnregister) {
      widget.onUnregister();
    }

    // Remove widget
    this.widgets.delete(widgetId);
    this.metadata.delete(widgetId);

    // Emit event
    this.eventEmitter.emit(PluginEvent.UNREGISTERED, { id: widgetId });

    this.logger.log(`Unregistered widget: ${widgetId}`);
  }

  /**
   * Enable a widget
   */
  enable(widgetId: string): void {
    const widget = this.widgets.get(widgetId);
    const metadata = this.metadata.get(widgetId);

    if (!widget || !metadata) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    if (metadata.enabled) {
      this.logger.warn(`Widget ${widgetId} is already enabled`);
      return;
    }

    // Call lifecycle hook
    if (widget.onEnable) {
      widget.onEnable();
    }

    // Update metadata
    metadata.enabled = true;
    metadata.enabledAt = new Date();

    // Emit event
    this.eventEmitter.emit(PluginEvent.ENABLED, metadata);

    this.logger.log(`Enabled widget: ${widgetId}`);
  }

  /**
   * Disable a widget
   */
  disable(widgetId: string): void {
    const widget = this.widgets.get(widgetId);
    const metadata = this.metadata.get(widgetId);

    if (!widget || !metadata) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    if (!metadata.enabled) {
      this.logger.warn(`Widget ${widgetId} is already disabled`);
      return;
    }

    // Call lifecycle hook
    if (widget.onDisable) {
      widget.onDisable();
    }

    // Update metadata
    metadata.enabled = false;

    // Emit event
    this.eventEmitter.emit(PluginEvent.DISABLED, metadata);

    this.logger.log(`Disabled widget: ${widgetId}`);
  }

  /**
   * Get a specific widget
   */
  get(widgetId: string): WidgetPlugin | undefined {
    return this.widgets.get(widgetId);
  }

  /**
   * Get all registered widgets
   */
  getAll(): WidgetPlugin[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get enabled widgets
   */
  getEnabled(): WidgetPlugin[] {
    return Array.from(this.widgets.entries())
      .filter(([id]) => this.metadata.get(id)?.enabled)
      .map(([, widget]) => widget);
  }

  /**
   * Get widgets by category
   */
  getByCategory(category: string): WidgetPlugin[] {
    return Array.from(this.widgets.values()).filter(
      (widget) => widget.category === category
    );
  }

  /**
   * Get widget metadata
   */
  getMetadata(widgetId: string): PluginMetadata | undefined {
    return this.metadata.get(widgetId);
  }

  /**
   * Get all widget metadata
   */
  getAllMetadata(): PluginMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Check if widget exists
   */
  has(widgetId: string): boolean {
    return this.widgets.has(widgetId);
  }

  /**
   * Validate widget configuration
   */
  private validateWidget(widget: WidgetPlugin): void {
    if (!widget.id || typeof widget.id !== 'string') {
      throw new Error('Widget must have a valid string ID');
    }

    if (!widget.name || typeof widget.name !== 'string') {
      throw new Error('Widget must have a valid string name');
    }

    if (!widget.version || typeof widget.version !== 'string') {
      throw new Error('Widget must have a valid version string');
    }

    if (!widget.category) {
      throw new Error('Widget must have a category');
    }

    // Validate size constraints
    if (widget.defaultSize) {
      const { width, height } = widget.defaultSize;
      if (width < 1 || width > 12) {
        throw new Error('Widget default width must be between 1 and 12');
      }
      if (height < 1 || height > 10) {
        throw new Error('Widget default height must be between 1 and 10');
      }
    }
  }

  /**
   * Discover and auto-register widgets from modules
   */
  async discoverWidgets(modules: any[]): Promise<void> {
    for (const module of modules) {
      const metadata = Reflect.getMetadata(PLUGIN_METADATA, module);
      if (metadata) {
        this.register(metadata);
      }
    }
  }
}
