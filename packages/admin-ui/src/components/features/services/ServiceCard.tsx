import { Card, Badge, ProgressBar, Button } from '@tremor/react';
import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  RotateCw,
  Power,
  PlayCircle,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Service } from '../../../types/services.types';
import { AreaChart } from 'recharts';

interface ServiceCardProps {
  service: Service;
  onRestart?: (serviceId: string) => void;
  onStop?: (serviceId: string) => void;
  onStart?: (serviceId: string) => void;
  isActionLoading?: boolean;
}

const statusConfig = {
  online: {
    color: 'green' as const,
    label: 'Online',
    pulse: true,
  },
  offline: {
    color: 'red' as const,
    label: 'Offline',
    pulse: false,
  },
  degraded: {
    color: 'yellow' as const,
    label: 'Degraded',
    pulse: true,
  },
  starting: {
    color: 'blue' as const,
    label: 'Starting',
    pulse: true,
  },
  stopping: {
    color: 'orange' as const,
    label: 'Stopping',
    pulse: true,
  },
};

const healthConfig = {
  healthy: {
    color: 'green' as const,
    label: 'Healthy',
  },
  unhealthy: {
    color: 'red' as const,
    label: 'Unhealthy',
  },
  degraded: {
    color: 'yellow' as const,
    label: 'Degraded',
  },
};

export function ServiceCard({
  service,
  onRestart,
  onStop,
  onStart,
  isActionLoading,
}: ServiceCardProps) {
  const status = statusConfig[service.status];
  const health = healthConfig[service.healthStatus];
  const uptime = service.uptime > 0 ? formatDistanceToNow(Date.now() - service.uptime) : 'N/A';

  const cpuColor = service.cpu > 80 ? 'red' : service.cpu > 60 ? 'yellow' : 'blue';
  const memoryColor = service.memory > 80 ? 'red' : service.memory > 60 ? 'yellow' : 'purple';

  return (
    <Card className="relative overflow-hidden">
      {/* Pulse animation for certain states */}
      {status.pulse && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent animate-pulse opacity-50" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg bg-${status.color}-50`}>
            <Server className={`h-5 w-5 text-${status.color}-600`} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {service.displayName || service.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">v{service.version}</span>
              {service.port && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">:{service.port}</span>
                </>
              )}
              {service.pid && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-500">PID {service.pid}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge color={status.color} size="sm" className="relative">
            {status.pulse && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-75" />
            )}
            {status.label}
          </Badge>
          <Badge color={health.color} size="xs">
            {health.label}
          </Badge>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Response Time */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs text-gray-600 font-medium">Response</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {service.responseTime !== undefined ? `${service.responseTime}ms` : 'N/A'}
          </p>
        </div>

        {/* Uptime */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs text-gray-600 font-medium">Uptime</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{uptime}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
        {service.requestsPerMin !== undefined && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Requests/min</span>
            <span className="font-semibold text-gray-900">{service.requestsPerMin}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Instances</span>
          <span className="font-semibold text-gray-900">{service.instances} running</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Restarts</span>
          <span className="font-semibold text-gray-900">{service.restartCount}</span>
        </div>
        {service.errorRate !== undefined && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Error Rate</span>
            <span
              className={`font-semibold ${
                service.errorRate > 1 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {service.errorRate.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Resource Usage */}
      <div className="space-y-3 mb-4">
        {/* CPU */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">CPU</span>
            </div>
            <span className="text-xs font-semibold text-gray-900">{service.cpu.toFixed(1)}%</span>
          </div>
          <ProgressBar value={service.cpu} color={cpuColor} className="h-2" />
        </div>

        {/* Memory */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Memory</span>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              {service.memory.toFixed(1)}% ({service.memoryMB}MB)
            </span>
          </div>
          <ProgressBar value={service.memory} color={memoryColor} className="h-2" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        {service.status === 'online' || service.status === 'degraded' ? (
          <>
            <Button
              size="xs"
              variant="secondary"
              icon={RotateCw}
              onClick={() => onRestart?.(service.id)}
              disabled={isActionLoading}
              className="flex-1"
            >
              Restart
            </Button>
            <Button
              size="xs"
              variant="secondary"
              icon={Power}
              onClick={() => onStop?.(service.id)}
              disabled={isActionLoading}
              className="flex-1"
            >
              Stop
            </Button>
          </>
        ) : service.status === 'offline' ? (
          <Button
            size="xs"
            variant="primary"
            icon={PlayCircle}
            onClick={() => onStart?.(service.id)}
            disabled={isActionLoading}
            className="flex-1"
          >
            Start
          </Button>
        ) : (
          <Button size="xs" variant="secondary" disabled className="flex-1">
            {service.status === 'starting' ? 'Starting...' : 'Stopping...'}
          </Button>
        )}
      </div>

      {/* Last Checked */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Last checked {formatDistanceToNow(new Date(service.lastChecked))} ago
        </p>
      </div>
    </Card>
  );
}
