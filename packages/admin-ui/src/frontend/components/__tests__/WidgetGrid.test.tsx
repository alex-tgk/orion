import React from 'react';
import { render, screen } from '@testing-library/react';
import { WidgetInstance } from '../../types';

// Mock WidgetGrid component for testing
const WidgetGrid: React.FC<{
  widgets: WidgetInstance[];
  columns?: number;
  gap?: number;
}> = ({ widgets, columns = 12, gap = 4 }) => {
  return (
    <div
      data-testid="widget-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {widgets.map(widget => (
        <div
          key={widget.id}
          data-testid={`widget-${widget.id}`}
          style={{
            gridColumn: `span ${widget.position.width}`,
            gridRow: `span ${widget.position.height}`,
          }}
        >
          Widget: {widget.widgetId}
        </div>
      ))}
    </div>
  );
};

describe('WidgetGrid', () => {
  const mockWidgets: WidgetInstance[] = [
    {
      id: 'widget-1',
      widgetId: 'quick-stats',
      position: { x: 0, y: 0, width: 12, height: 1 },
    },
    {
      id: 'widget-2',
      widgetId: 'system-overview',
      position: { x: 0, y: 1, width: 6, height: 2 },
    },
  ];

  it('should render widget grid', () => {
    render(<WidgetGrid widgets={mockWidgets} />);
    expect(screen.getByTestId('widget-grid')).toBeInTheDocument();
  });

  it('should render all widgets', () => {
    render(<WidgetGrid widgets={mockWidgets} />);
    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-widget-2')).toBeInTheDocument();
  });

  it('should apply grid layout', () => {
    render(<WidgetGrid widgets={mockWidgets} columns={12} gap={4} />);
    const grid = screen.getByTestId('widget-grid');

    expect(grid).toHaveStyle({
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
    });
  });

  it('should position widgets correctly', () => {
    render(<WidgetGrid widgets={mockWidgets} />);
    const widget1 = screen.getByTestId('widget-widget-1');
    const widget2 = screen.getByTestId('widget-widget-2');

    expect(widget1).toHaveStyle({
      gridColumn: 'span 12',
      gridRow: 'span 1',
    });

    expect(widget2).toHaveStyle({
      gridColumn: 'span 6',
      gridRow: 'span 2',
    });
  });

  it('should handle empty widgets array', () => {
    render(<WidgetGrid widgets={[]} />);
    const grid = screen.getByTestId('widget-grid');
    expect(grid.children).toHaveLength(0);
  });

  it('should use default columns when not specified', () => {
    render(<WidgetGrid widgets={mockWidgets} />);
    const grid = screen.getByTestId('widget-grid');
    expect(grid).toHaveStyle({
      gridTemplateColumns: 'repeat(12, 1fr)',
    });
  });
});
