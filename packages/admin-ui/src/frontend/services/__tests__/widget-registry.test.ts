import { WidgetRegistryService } from '../widget-registry';
import { WidgetConfig, WidgetInstance, WidgetProps } from '../../types';
import React from 'react';

// Mock widget component
const MockWidget: React.FC<WidgetProps> = () => null;

describe('WidgetRegistryService', () => {
  let registry: WidgetRegistryService;

  beforeEach(() => {
    registry = new WidgetRegistryService();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register a new widget', () => {
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
        category: 'test',
      };

      registry.register(config);

      expect(registry.has('test-widget')).toBe(true);
      expect(registry.get('test-widget')).toEqual(config);
    });

    it('should overwrite existing widget with same ID', () => {
      const config1: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget 1',
        component: MockWidget,
      };

      const config2: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget 2',
        component: MockWidget,
      };

      registry.register(config1);
      registry.register(config2);

      expect(registry.get('test-widget')?.name).toBe('Test Widget 2');
    });

    it('should register multiple widgets', () => {
      const configs: WidgetConfig[] = [
        { id: 'widget-1', name: 'Widget 1', component: MockWidget },
        { id: 'widget-2', name: 'Widget 2', component: MockWidget },
        { id: 'widget-3', name: 'Widget 3', component: MockWidget },
      ];

      configs.forEach(config => registry.register(config));

      expect(registry.getAll()).toHaveLength(3);
    });
  });

  describe('unregister', () => {
    it('should unregister a widget', () => {
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
      };

      registry.register(config);
      expect(registry.has('test-widget')).toBe(true);

      const result = registry.unregister('test-widget');

      expect(result).toBe(true);
      expect(registry.has('test-widget')).toBe(false);
    });

    it('should return false when unregistering non-existent widget', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return widget configuration by ID', () => {
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
      };

      registry.register(config);

      expect(registry.get('test-widget')).toEqual(config);
    });

    it('should return undefined for non-existent widget', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered widgets', () => {
      const configs: WidgetConfig[] = [
        { id: 'widget-1', name: 'Widget 1', component: MockWidget },
        { id: 'widget-2', name: 'Widget 2', component: MockWidget },
      ];

      configs.forEach(config => registry.register(config));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(configs[0]);
      expect(all).toContainEqual(configs[1]);
    });

    it('should return empty array when no widgets registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('getByCategory', () => {
    it('should return widgets filtered by category', () => {
      const configs: WidgetConfig[] = [
        { id: 'widget-1', name: 'Widget 1', component: MockWidget, category: 'analytics' },
        { id: 'widget-2', name: 'Widget 2', component: MockWidget, category: 'monitoring' },
        { id: 'widget-3', name: 'Widget 3', component: MockWidget, category: 'analytics' },
      ];

      configs.forEach(config => registry.register(config));

      const analytics = registry.getByCategory('analytics');
      expect(analytics).toHaveLength(2);
      expect(analytics.every(w => w.category === 'analytics')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      expect(registry.getByCategory('non-existent')).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('should return all unique categories', () => {
      const configs: WidgetConfig[] = [
        { id: 'widget-1', name: 'Widget 1', component: MockWidget, category: 'analytics' },
        { id: 'widget-2', name: 'Widget 2', component: MockWidget, category: 'monitoring' },
        { id: 'widget-3', name: 'Widget 3', component: MockWidget, category: 'analytics' },
        { id: 'widget-4', name: 'Widget 4', component: MockWidget }, // no category
      ];

      configs.forEach(config => registry.register(config));

      const categories = registry.getCategories();
      expect(categories).toHaveLength(2);
      expect(categories).toContain('analytics');
      expect(categories).toContain('monitoring');
    });
  });

  describe('lifecycle hooks', () => {
    it('should call onMount when mounting an instance', async () => {
      const onMount = jest.fn();
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
        lifecycle: { onMount },
      };

      registry.register(config);

      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'test-widget',
        position: { x: 0, y: 0, width: 4, height: 2 },
        config: { foo: 'bar' },
      };

      await registry.mountInstance(instance);

      expect(onMount).toHaveBeenCalledWith('instance-1', { foo: 'bar' });
    });

    it('should call onUnmount when unmounting an instance', async () => {
      const onUnmount = jest.fn();
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
        lifecycle: { onUnmount },
      };

      registry.register(config);

      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'test-widget',
        position: { x: 0, y: 0, width: 4, height: 2 },
      };

      await registry.mountInstance(instance);
      await registry.unmountInstance('instance-1');

      expect(onUnmount).toHaveBeenCalledWith('instance-1');
    });

    it('should call onUpdate when updating an instance', async () => {
      const onUpdate = jest.fn();
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
        lifecycle: { onUpdate },
      };

      registry.register(config);

      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'test-widget',
        position: { x: 0, y: 0, width: 4, height: 2 },
        config: { foo: 'bar' },
      };

      await registry.mountInstance(instance);
      await registry.updateInstance('instance-1', { foo: 'baz' });

      expect(onUpdate).toHaveBeenCalledWith('instance-1', { foo: 'bar' }, { foo: 'baz' });
    });

    it('should call onRefresh when refreshing an instance', async () => {
      const onRefresh = jest.fn();
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
        lifecycle: { onRefresh },
      };

      registry.register(config);

      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'test-widget',
        position: { x: 0, y: 0, width: 4, height: 2 },
      };

      await registry.mountInstance(instance);
      await registry.refreshInstance('instance-1');

      expect(onRefresh).toHaveBeenCalledWith('instance-1');
    });

    it('should throw error when mounting instance of unregistered widget', async () => {
      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'non-existent',
        position: { x: 0, y: 0, width: 4, height: 2 },
      };

      await expect(registry.mountInstance(instance)).rejects.toThrow(
        'Widget with id "non-existent" is not registered'
      );
    });

    it('should throw error when updating non-existent instance', async () => {
      await expect(registry.updateInstance('non-existent', {})).rejects.toThrow(
        'Widget instance with id "non-existent" not found'
      );
    });
  });

  describe('instance management', () => {
    beforeEach(() => {
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
      };
      registry.register(config);
    });

    it('should track mounted instances', async () => {
      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'test-widget',
        position: { x: 0, y: 0, width: 4, height: 2 },
      };

      await registry.mountInstance(instance);

      expect(registry.getInstance('instance-1')).toEqual(instance);
      expect(registry.getAllInstances()).toHaveLength(1);
    });

    it('should remove instance on unmount', async () => {
      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'test-widget',
        position: { x: 0, y: 0, width: 4, height: 2 },
      };

      await registry.mountInstance(instance);
      await registry.unmountInstance('instance-1');

      expect(registry.getInstance('instance-1')).toBeUndefined();
      expect(registry.getAllInstances()).toHaveLength(0);
    });

    it('should handle multiple instances', async () => {
      const instances: WidgetInstance[] = [
        { id: 'instance-1', widgetId: 'test-widget', position: { x: 0, y: 0, width: 4, height: 2 } },
        { id: 'instance-2', widgetId: 'test-widget', position: { x: 4, y: 0, width: 4, height: 2 } },
      ];

      for (const instance of instances) {
        await registry.mountInstance(instance);
      }

      expect(registry.getAllInstances()).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should remove all widgets and instances', async () => {
      const config: WidgetConfig = {
        id: 'test-widget',
        name: 'Test Widget',
        component: MockWidget,
      };

      registry.register(config);

      const instance: WidgetInstance = {
        id: 'instance-1',
        widgetId: 'test-widget',
        position: { x: 0, y: 0, width: 4, height: 2 },
      };

      await registry.mountInstance(instance);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      expect(registry.getAllInstances()).toHaveLength(0);
    });
  });
});
