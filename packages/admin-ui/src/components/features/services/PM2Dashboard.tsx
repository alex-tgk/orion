import { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  ProgressBar,
} from '@tremor/react';
import { Loader2, XCircle, AlertCircle, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ProcessControls } from './ProcessControls';
import {
  usePM2Processes,
  useRestartPM2,
  useReloadPM2,
  useStopPM2,
  useStartPM2,
} from '../../../hooks/usePM2';
import type { PM2Process } from '../../../types/services.types';

interface PM2DashboardProps {
  className?: string;
  onViewLogs?: (pm_id: number, processName: string) => void;
}

const statusConfig: Record<PM2Process['status'], { color: 'green' | 'red' | 'yellow' | 'blue' | 'gray'; label: string }> = {
  online: { color: 'green', label: 'Online' },
  stopped: { color: 'gray', label: 'Stopped' },
  stopping: { color: 'yellow', label: 'Stopping' },
  'waiting restart': { color: 'yellow', label: 'Restarting' },
  launching: { color: 'blue', label: 'Launching' },
  errored: { color: 'red', label: 'Errored' },
};

export function PM2Dashboard({ className, onViewLogs }: PM2DashboardProps) {
  const { data: processes, isLoading, error } = usePM2Processes();
  const restartMutation = useRestartPM2();
  const reloadMutation = useReloadPM2();
  const stopMutation = useStopPM2();
  const startMutation = useStartPM2();
  const [actioningProcessId, setActioningProcessId] = useState<number | null>(null);

  const handleAction = async (
    action: 'restart' | 'reload' | 'stop' | 'start',
    pm_id: number
  ) => {
    setActioningProcessId(pm_id);
    try {
      switch (action) {
        case 'restart':
          await restartMutation.mutateAsync(pm_id);
          break;
        case 'reload':
          await reloadMutation.mutateAsync(pm_id);
          break;
        case 'stop':
          await stopMutation.mutateAsync(pm_id);
          break;
        case 'start':
          await startMutation.mutateAsync(pm_id);
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} process:`, error);
    } finally {
      setTimeout(() => setActioningProcessId(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading PM2 processes...</p>
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
          <Title>Failed to load PM2 processes</Title>
          <Text className="mt-2">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </Text>
        </div>
      </Card>
    );
  }

  if (!processes || processes.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <Title>No PM2 processes found</Title>
          <Text className="mt-2">There are no PM2 processes running</Text>
        </div>
      </Card>
    );
  }

  // Calculate stats
  const stats = {
    total: processes.length,
    online: processes.filter((p) => p.status === 'online').length,
    stopped: processes.filter((p) => p.status === 'stopped').length,
    errored: processes.filter((p) => p.status === 'errored').length,
    totalRestarts: processes.reduce((sum, p) => sum + p.restart_count, 0),
    avgCpu: (processes.reduce((sum, p) => sum + p.cpu, 0) / processes.length).toFixed(1),
    avgMemory: (processes.reduce((sum, p) => sum + p.memoryMB, 0) / processes.length).toFixed(0),
  };

  return (
    <div className={className}>
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card decoration="top" decorationColor="blue">
          <Text>Total Processes</Text>
          <Title className="mt-1">{stats.total}</Title>
          <Text className="mt-2 text-xs">{stats.online} online</Text>
        </Card>

        <Card decoration="top" decorationColor="green">
          <Text>Online</Text>
          <Title className="mt-1 text-green-600">{stats.online}</Title>
          <Text className="mt-2 text-xs">Active processes</Text>
        </Card>

        <Card decoration="top" decorationColor="yellow">
          <Text>Total Restarts</Text>
          <Title className="mt-1">{stats.totalRestarts}</Title>
          <Text className="mt-2 text-xs">Across all processes</Text>
        </Card>

        <Card decoration="top" decorationColor="purple">
          <Text>Avg Resources</Text>
          <Title className="mt-1 text-sm">
            {stats.avgCpu}% CPU / {stats.avgMemory}MB
          </Title>
          <Text className="mt-2 text-xs">System usage</Text>
        </Card>
      </div>

      {/* Processes Table */}
      <Card>
        <Title className="mb-4">PM2 Processes</Title>
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Mode</TableHeaderCell>
                <TableHeaderCell>PID</TableHeaderCell>
                <TableHeaderCell>Uptime</TableHeaderCell>
                <TableHeaderCell>Restarts</TableHeaderCell>
                <TableHeaderCell>CPU</TableHeaderCell>
                <TableHeaderCell>Memory</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processes.map((process) => {
                const status = statusConfig[process.status];
                const uptime = formatDistanceToNow(Date.now() - process.uptime);
                const cpuColor =
                  process.cpu > 80 ? 'red' : process.cpu > 60 ? 'yellow' : 'blue';
                const memColor =
                  process.memory > 80 ? 'red' : process.memory > 60 ? 'yellow' : 'purple';

                return (
                  <TableRow key={process.pm_id}>
                    <TableCell>
                      <span className="font-mono font-semibold text-gray-900">
                        {process.pm_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{process.name}</p>
                        {process.namespace && (
                          <p className="text-xs text-gray-500">{process.namespace}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge color={status.color} size="sm" icon={Circle}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={process.mode === 'cluster' ? 'blue' : 'gray'}
                        size="xs"
                      >
                        {process.mode}
                        {process.mode === 'cluster' && ` (${process.instances})`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-gray-700">{process.pid}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{uptime}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-semibold ${
                          process.restart_count > 10 ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {process.restart_count}
                      </span>
                      {process.pm2_env?.unstable_restarts > 0 && (
                        <p className="text-xs text-red-600">
                          ({process.pm2_env.unstable_restarts} unstable)
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[80px]">
                        <p className="text-xs font-semibold text-gray-900 mb-1">
                          {process.cpu.toFixed(1)}%
                        </p>
                        <ProgressBar value={process.cpu} color={cpuColor} className="h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[100px]">
                        <p className="text-xs font-semibold text-gray-900 mb-1">
                          {process.memory.toFixed(1)}% ({process.memoryMB}MB)
                        </p>
                        <ProgressBar
                          value={process.memory}
                          color={memColor}
                          className="h-1.5"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProcessControls
                        process={process}
                        onStart={(pm_id) => handleAction('start', pm_id)}
                        onStop={(pm_id) => handleAction('stop', pm_id)}
                        onRestart={(pm_id) => handleAction('restart', pm_id)}
                        onReload={(pm_id) => handleAction('reload', pm_id)}
                        onViewLogs={(pm_id) => onViewLogs?.(pm_id, process.name)}
                        isLoading={actioningProcessId === process.pm_id}
                      />
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
