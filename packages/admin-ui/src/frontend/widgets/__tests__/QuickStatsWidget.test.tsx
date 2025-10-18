import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock widget component for testing
const QuickStatsWidget: React.FC = () => {
  return (
    <div data-testid="quick-stats-widget">
      <h2>Quick Stats</h2>
      <div className="stats-grid">
        <div className="stat">
          <span className="label">Total Users</span>
          <span className="value">150</span>
        </div>
        <div className="stat">
          <span className="label">Active Services</span>
          <span className="value">8</span>
        </div>
      </div>
    </div>
  );
};

describe('QuickStatsWidget', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWidget = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <QuickStatsWidget />
      </QueryClientProvider>
    );
  };

  it('should render widget', () => {
    renderWidget();
    expect(screen.getByTestId('quick-stats-widget')).toBeInTheDocument();
  });

  it('should display title', () => {
    renderWidget();
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
  });

  it('should display stats', () => {
    renderWidget();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Active Services')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
