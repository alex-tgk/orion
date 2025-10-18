import React from 'react';
import { ServiceHealth, ServiceStatus } from '../../types/health';
import { AlertBadge } from './AlertBadge';
import clsx from 'clsx';

interface ServiceHealthCardProps {
  service: ServiceHealth;
  onClick?: (serviceName: string) => void;
  className?: string;
}

const statusColors: Record<ServiceStatus, { bg: string; border: string; text: string; dot: string }> = {
  [ServiceStatus.HEALTHY]: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  [ServiceStatus.DEGRADED]: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
  [ServiceStatus.UNHEALTHY]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  [ServiceStatus.UNKNOWN]: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    dot: 'bg-gray-500',
  },
};

export const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({
  service,
  onClick,
  className,
}) => {
  const colors = statusColors[service.status];

  const handleClick = () => {
    if (onClick) {
      onClick(service.serviceName);
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const passedChecks = service.checks.filter(c => c.status === 'pass').length;
  const totalChecks = service.checks.length;

  return (
    <div
      className={clsx(
        'rounded-lg border-2 p-4 transition-all duration-200',
        colors.bg,
        colors.border,
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
        className
      )}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={clsx('w-3 h-3 rounded-full', colors.dot)} />
          <h3 className="text-lg font-semibold text-gray-900">{service.serviceName}</h3>
        </div>
        <div className={clsx('px-2 py-1 rounded text-xs font-medium', colors.text, colors.bg)}>
          {service.status.toUpperCase()}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Uptime</p>
          <p className="text-sm font-semibold text-gray-900">{formatUptime(service.uptime)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Response Time</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatResponseTime(service.responseTime)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Version</p>
          <p className="text-sm font-semibold text-gray-900">{service.version}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Health Checks</p>
          <p className="text-sm font-semibold text-gray-900">
            {passedChecks}/{totalChecks}
          </p>
        </div>
      </div>

      {/* Dependencies */}
      {service.dependencies.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Dependencies</p>
          <div className="flex flex-wrap gap-1">
            {service.dependencies.map((dep) => (
              <span
                key={dep}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {service.error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {service.error}
        </div>
      )}

      {/* Last Check */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Last checked: {new Date(service.lastCheckTimestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};
