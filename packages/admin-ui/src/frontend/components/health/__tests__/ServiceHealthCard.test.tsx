import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServiceHealthCard } from '../ServiceHealthCard';
import { ServiceHealth, ServiceStatus, HealthCheckStatus } from '../../../types/health';

const mockHealthyService: ServiceHealth = {
  serviceName: 'gateway',
  status: ServiceStatus.HEALTHY,
  uptime: 99.9,
  lastCheckTimestamp: new Date().toISOString(),
  responseTime: 45,
  version: '1.0.0',
  dependencies: ['auth', 'user'],
  checks: [
    {
      name: 'database',
      status: HealthCheckStatus.PASS,
      message: 'Connected',
      timestamp: new Date().toISOString(),
      responseTime: 12,
    },
  ],
};

const mockUnhealthyService: ServiceHealth = {
  ...mockHealthyService,
  serviceName: 'auth',
  status: ServiceStatus.UNHEALTHY,
  uptime: 85.5,
  error: 'Connection timeout',
  checks: [
    {
      name: 'database',
      status: HealthCheckStatus.FAIL,
      message: 'Connection failed',
      timestamp: new Date().toISOString(),
    },
  ],
};

describe('ServiceHealthCard', () => {
  it('renders healthy service correctly', () => {
    render(<ServiceHealthCard service={mockHealthyService} />);

    expect(screen.getByText('gateway')).toBeInTheDocument();
    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
    expect(screen.getByText('99.90%')).toBeInTheDocument();
    expect(screen.getByText('45ms')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('renders unhealthy service with error message', () => {
    render(<ServiceHealthCard service={mockUnhealthyService} />);

    expect(screen.getByText('auth')).toBeInTheDocument();
    expect(screen.getByText('UNHEALTHY')).toBeInTheDocument();
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('renders dependencies correctly', () => {
    render(<ServiceHealthCard service={mockHealthyService} />);

    expect(screen.getByText('auth')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<ServiceHealthCard service={mockHealthyService} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith('gateway');
  });

  it('displays health check status', () => {
    render(<ServiceHealthCard service={mockHealthyService} />);

    expect(screen.getByText('1/1')).toBeInTheDocument(); // 1 passed / 1 total
  });

  it('applies correct styling based on status', () => {
    const { container, rerender } = render(
      <ServiceHealthCard service={mockHealthyService} />
    );

    expect(container.firstChild).toHaveClass('bg-green-50', 'border-green-200');

    rerender(<ServiceHealthCard service={mockUnhealthyService} />);
    expect(container.firstChild).toHaveClass('bg-red-50', 'border-red-200');
  });

  it('handles keyboard navigation', () => {
    const handleClick = jest.fn();
    render(<ServiceHealthCard service={mockHealthyService} onClick={handleClick} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledWith('gateway');

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });
});
