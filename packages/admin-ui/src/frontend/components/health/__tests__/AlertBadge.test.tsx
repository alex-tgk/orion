import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AlertBadge } from '../AlertBadge';
import { AlertSeverity, AlertStatus } from '../../../types/health';

describe('AlertBadge', () => {
  it('renders alert severity correctly', () => {
    render(<AlertBadge severity={AlertSeverity.CRITICAL} />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders alert count when provided', () => {
    render(<AlertBadge severity={AlertSeverity.WARNING} count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders alert status when provided', () => {
    render(
      <AlertBadge severity={AlertSeverity.ERROR} status={AlertStatus.ACKNOWLEDGED} />
    );
    expect(screen.getByText('(Acked)')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<AlertBadge severity={AlertSeverity.INFO} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('applies correct colors for different severities', () => {
    const { container, rerender } = render(
      <AlertBadge severity={AlertSeverity.INFO} />
    );

    expect(container.firstChild).toHaveClass('bg-blue-100', 'text-blue-700');

    rerender(<AlertBadge severity={AlertSeverity.CRITICAL} />);
    expect(container.firstChild).toHaveClass('bg-red-100', 'text-red-700');
  });

  it('shows pulse animation for active status', () => {
    const { container } = render(
      <AlertBadge severity={AlertSeverity.ERROR} status={AlertStatus.ACTIVE} />
    );

    const pulseElement = container.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });
});
