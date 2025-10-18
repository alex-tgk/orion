import { SetMetadata } from '@nestjs/common';
import { WidgetPlugin } from '../interfaces/plugin.interface';

/**
 * Metadata key for plugin information
 */
export const PLUGIN_METADATA = 'plugin:metadata';

/**
 * Widget decorator to mark a module as a widget plugin
 *
 * @example
 * ```typescript
 * @Widget({
 *   id: 'system-health',
 *   name: 'System Health Monitor',
 *   version: '1.0.0',
 *   category: 'monitoring',
 *   icon: 'heartbeat',
 *   defaultSize: { width: 4, height: 3 },
 * })
 * @Module({
 *   controllers: [SystemHealthController],
 *   providers: [SystemHealthService],
 * })
 * export class SystemHealthWidgetModule {}
 * ```
 */
export const Widget = (
  metadata: Omit<WidgetPlugin, 'onRegister' | 'onEnable' | 'onDisable' | 'onUnregister'>
): ClassDecorator => {
  return (target: any) => {
    Reflect.defineMetadata(PLUGIN_METADATA, metadata, target);
    return target;
  };
};

/**
 * Mark a method to be called during plugin registration
 */
export const OnPluginRegister = (): MethodDecorator => {
  return (target: any, propertyKey: string | symbol) => {
    Reflect.defineMetadata('plugin:onRegister', propertyKey, target.constructor);
  };
};

/**
 * Mark a method to be called when plugin is enabled
 */
export const OnPluginEnable = (): MethodDecorator => {
  return (target: any, propertyKey: string | symbol) => {
    Reflect.defineMetadata('plugin:onEnable', propertyKey, target.constructor);
  };
};

/**
 * Mark a method to be called when plugin is disabled
 */
export const OnPluginDisable = (): MethodDecorator => {
  return (target: any, propertyKey: string | symbol) => {
    Reflect.defineMetadata('plugin:onDisable', propertyKey, target.constructor);
  };
};
