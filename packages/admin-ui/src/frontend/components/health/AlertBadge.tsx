import React from 'react';
import { AlertSeverity, AlertStatus } from '../../types/health';
import clsx from 'clsx';

interface AlertBadgeProps {
  severity: AlertSeverity;
  status?: AlertStatus;
  count?: number;
  className?: string;
  onClick?: () => void;
}

const severityConfig: Record<AlertSeverity, { bg: string; text: string; icon: string }> = {
  [AlertSeverity.INFO]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: 'ℹ',
  },
  [AlertSeverity.WARNING]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    icon: '⚠',
  },
  [AlertSeverity.ERROR]: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    icon: '⚠',
  },
  [AlertSeverity.CRITICAL]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: '🔴',
  },
};

const statusConfig: Record<AlertStatus, { indicator: string; label: string }> = {
  [AlertStatus.ACTIVE]: {
    indicator: 'animate-pulse',
    label: 'Active',
  },
  [AlertStatus.ACKNOWLEDGED]: {
    indicator: '',
    label: 'Acked',
  },
  [AlertStatus.RESOLVED]: {
    indicator: '',
    label: 'Resolved',
  },
};

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  severity,
  status,
  count,
  className,
  onClick,
}) => {
  const config = severityConfig[severity];
  const statusInfo = status ? statusConfig[status] : null;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
        config.bg,
        config.text,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className={statusInfo?.indicator}>{config.icon}</span>
      <span className="font-semibold capitalize">{severity}</span>
      {count !== undefined && count > 0 && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-white rounded-full text-xs font-bold">
          {count}
        </span>
      )}
      {statusInfo && (
        <span className="text-xs opacity-75">({statusInfo.label})</span>
      )}
    </div>
  );
};
