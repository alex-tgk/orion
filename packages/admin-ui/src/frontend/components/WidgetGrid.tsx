import React from 'react';
import { WidgetInstance } from '../types';
import { WidgetRegistry } from '../services/widget-registry';

interface WidgetGridProps {
  widgets: WidgetInstance[];
  columns?: number;
  gap?: number;
}

/**
 * WidgetGrid - Responsive grid layout for dashboard widgets
 *
 * Features:
 * - CSS Grid-based layout
 * - Configurable columns (default 12)
 * - Responsive widget sizing
 * - Dynamic widget loading from registry
 */
export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  columns = 12,
  gap = 6,
}) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: `${gap * 4}px`, // Tailwind spacing (gap-6 = 24px)
    width: '100%',
  };

  const getWidgetStyle = (widget: WidgetInstance) => {
    const { position } = widget;
    return {
      gridColumn: `span ${Math.min(position.width, columns)}`,
      gridRow: `span ${position.height}`,
    };
  };

  return (
    <div style={gridStyle}>
      {widgets.map(widget => {
        const config = WidgetRegistry.get(widget.widgetId);

        if (!config) {
          console.error(`Widget not found in registry: ${widget.widgetId}`);
          return (
            <div key={widget.id} style={getWidgetStyle(widget)} className="widget-card">
              <div className="text-red-600">Widget not found: {widget.widgetId}</div>
            </div>
          );
        }

        const WidgetComponent = config.component;

        return (
          <div key={widget.id} style={getWidgetStyle(widget)}>
            <WidgetComponent config={widget.config} />
          </div>
        );
      })}
    </div>
  );
};
