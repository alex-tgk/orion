import {
  Card,
  Title,
  Text,
  Badge,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  ProgressBar,
} from '@tremor/react';
import {
  Activity,
  Database,
  Zap,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSystemHealth } from '../../../hooks/useHealth';
import type { HealthStatus as HealthStatusType } from '../../../types/services.types';

interface HealthStatusProps {
  className?: string;
}

const healthConfig: Record<
  HealthStatusType,
  { color: 'green' | 'yellow' | 'red'; icon: typeof CheckCircle2 }
> = {
  healthy: { color: 'green', icon: CheckCircle2 },
  degraded: { color: 'yellow', icon: AlertTriangle },
  unhealthy: { color: 'red', icon: XCircle },
};

const checkStatusConfig = {
  pass: { color: 'green' as const, icon: CheckCircle2 },
  warn: { color: 'yellow' as const, icon: AlertTriangle },
  fail: { color: 'red' as const, icon: XCircle },
};

const infraStatusConfig = {
  connected: { color: 'green' as const, label: 'Connected' },
  disconnected: { color: 'red' as const, label: 'Disconnected' },
  degraded: { color: 'yellow' as const, label: 'Degraded' },
};

export function HealthStatus({ className }: HealthStatusProps) {
  const { data: health, isLoading, error } = useSystemHealth();

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading health status...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <Title>Failed to load health status</Title>
          <Text className="mt-2">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </Text>
        </div>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  const overallHealth = healthConfig[health.status];
  const OverallIcon = overallHealth.icon;

  const serviceEntries = Object.entries(health.services || {});
  const healthyServices = serviceEntries.filter(([_, s]) => s.status === 'healthy').length;
  const healthPercentage = serviceEntries.length > 0
    ? ((healthyServices / serviceEntries.length) * 100).toFixed(0)
    : '0';

  return (
    <div className={className}>
      {/* Overall Status */}
      <Card className="mb-6" decoration="top" decorationColor={overallHealth.color}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <OverallIcon className={`h-8 w-8 text-${overallHealth.color}-600`} />
              <div>
                <Title>System Health</Title>
                <Text className="mt-1">
                  Last checked {formatDistanceToNow(new Date(health.timestamp))} ago
                </Text>
              </div>
            </div>
          </div>
          <Badge color={overallHealth.color} size="xl" className="text-lg px-4 py-2">
            {health.status.toUpperCase()}
          </Badge>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <Text>Service Health</Text>
            <Text className="font-semibold">
              {healthyServices}/{serviceEntries.length} healthy
            </Text>
          </div>
          <ProgressBar value={Number(healthPercentage)} color="green" className="h-3" />
        </div>
      </Card>

      {/* Infrastructure Status */}
      <Card className="mb-6">
        <Title className="mb-4">Infrastructure</Title>
        <Grid numItems={1} numItemsSm={3} className="gap-4">
          {/* Database */}
          <Card decoration="left" decorationColor={infraStatusConfig[health.infrastructure.database.status].color}>
            <div className="flex items-center gap-3 mb-3">
              <Database className="h-6 w-6 text-gray-700" />
              <div>
                <Text>Database</Text>
                <Badge
                  color={infraStatusConfig[health.infrastructure.database.status].color}
                  size="xs"
                  className="mt-1"
                >
                  {infraStatusConfig[health.infrastructure.database.status].label}
                </Badge>
              </div>
            </div>
            {health.infrastructure.database.responseTime !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold">{health.infrastructure.database.responseTime}ms</span>
                </div>
                {health.infrastructure.database.connections !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Connections</span>
                    <span className="font-semibold">{health.infrastructure.database.connections}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Redis */}
          <Card decoration="left" decorationColor={infraStatusConfig[health.infrastructure.redis.status].color}>
            <div className="flex items-center gap-3 mb-3">
              <Zap className="h-6 w-6 text-gray-700" />
              <div>
                <Text>Redis</Text>
                <Badge
                  color={infraStatusConfig[health.infrastructure.redis.status].color}
                  size="xs"
                  className="mt-1"
                >
                  {infraStatusConfig[health.infrastructure.redis.status].label}
                </Badge>
              </div>
            </div>
            {health.infrastructure.redis.responseTime !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold">{health.infrastructure.redis.responseTime}ms</span>
                </div>
                {health.infrastructure.redis.memory !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Memory</span>
                    <span className="font-semibold">{health.infrastructure.redis.memory}MB</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* RabbitMQ */}
          <Card decoration="left" decorationColor={infraStatusConfig[health.infrastructure.rabbitmq.status].color}>
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="h-6 w-6 text-gray-700" />
              <div>
                <Text>RabbitMQ</Text>
                <Badge
                  color={infraStatusConfig[health.infrastructure.rabbitmq.status].color}
                  size="xs"
                  className="mt-1"
                >
                  {infraStatusConfig[health.infrastructure.rabbitmq.status].label}
                </Badge>
              </div>
            </div>
            {health.infrastructure.rabbitmq.responseTime !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold">{health.infrastructure.rabbitmq.responseTime}ms</span>
                </div>
                {health.infrastructure.rabbitmq.queues !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Queues</span>
                    <span className="font-semibold">{health.infrastructure.rabbitmq.queues}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Grid>
      </Card>

      {/* Service Health Checks */}
      <Card>
        <Title className="mb-4">Service Health Checks</Title>
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Service</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Response Time</TableHeaderCell>
                <TableHeaderCell>Checks</TableHeaderCell>
                <TableHeaderCell>Dependencies</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {serviceEntries.map(([serviceName, check]) => {
                const serviceHealth = healthConfig[check.status];
                const ServiceIcon = serviceHealth.icon;
                const passedChecks = check.checks.filter((c) => c.status === 'pass').length;
                const totalChecks = check.checks.length;

                return (
                  <TableRow key={serviceName}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{serviceName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color={serviceHealth.color} size="sm" icon={ServiceIcon}>
                        {check.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-mono">{check.responseTime}ms</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Text className="text-xs">
                          {passedChecks}/{totalChecks} passed
                        </Text>
                        <div className="flex flex-wrap gap-1">
                          {check.checks.map((c, idx) => {
                            const checkConfig = checkStatusConfig[c.status];
                            const CheckIcon = checkConfig.icon;
                            return (
                              <Badge
                                key={idx}
                                color={checkConfig.color}
                                size="xs"
                                icon={CheckIcon}
                                tooltip={c.message}
                              >
                                {c.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {check.dependencies && check.dependencies.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {check.dependencies.map((dep, idx) => (
                            <Badge
                              key={idx}
                              color={infraStatusConfig[dep.status].color}
                              size="xs"
                              tooltip={`${dep.responseTime}ms - ${dep.message || ''}`}
                            >
                              {dep.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Text className="text-xs text-gray-400">None</Text>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
