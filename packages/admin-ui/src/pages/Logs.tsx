import { useState, useMemo, useCallback } from 'react';
import { Button, Card } from '@tremor/react';
import { Download, AlertCircle } from 'lucide-react';
import { subHours, subDays } from 'date-fns';
import { LogFilters } from '../components/features/logs/LogFilters';
import { LogViewer } from '../components/features/logs/LogViewer';
import { useLogs, useLogStream, useExportLogs } from '../hooks/useLogs';
import type { LogFiltersState, LogEntry, LogQueryParams, TimeRange } from '../types/logs';

/**
 * Calculate start and end times based on time range selection
 */
function calculateTimeRange(timeRange: TimeRange, customStartTime?: string, customEndTime?: string) {
  const now = new Date();

  if (timeRange === 'custom' && customStartTime && customEndTime) {
    return { startTime: customStartTime, endTime: customEndTime };
  }

  let startTime: Date;

  switch (timeRange) {
    case '1h':
      startTime = subHours(now, 1);
      break;
    case '24h':
      startTime = subHours(now, 24);
      break;
    case '7d':
      startTime = subDays(now, 7);
      break;
    default:
      startTime = subHours(now, 1);
  }

  return {
    startTime: startTime.toISOString(),
    endTime: now.toISOString(),
  };
}

export function Logs() {
  const [filters, setFilters] = useState<LogFiltersState>({
    services: [],
    levels: [],
    timeRange: '1h',
    searchQuery: '',
  });

  const [streamEnabled, setStreamEnabled] = useState(true);

  // Calculate query parameters based on filters
  const queryParams = useMemo<LogQueryParams>(() => {
    const { startTime, endTime } = calculateTimeRange(
      filters.timeRange,
      filters.customStartTime,
      filters.customEndTime
    );

    return {
      service: filters.services.length === 1 ? filters.services[0] : undefined,
      level: filters.levels.length === 1 ? filters.levels[0] : undefined,
      startTime,
      endTime,
      search: filters.searchQuery || undefined,
      limit: 1000,
      offset: 0,
    };
  }, [filters]);

  // Fetch logs with TanStack Query
  const { data: logsData, isLoading, error, refetch } = useLogs(queryParams);

  // Real-time log streaming
  const {
    logs: streamedLogs,
    isConnected: isStreamConnected,
    error: streamError,
    reconnect: reconnectStream,
    clearLogs: clearStreamedLogs,
  } = useLogStream(streamEnabled);

  // Export logs
  const { exportLogs, isExporting } = useExportLogs();

  // Combine fetched logs and streamed logs
  const allLogs = useMemo<LogEntry[]>(() => {
    const fetchedLogs = logsData?.logs || [];
    const combined = [...streamedLogs, ...fetchedLogs];

    // Remove duplicates based on ID
    const uniqueLogsMap = new Map<string, LogEntry>();
    combined.forEach((log) => {
      if (!uniqueLogsMap.has(log.id)) {
        uniqueLogsMap.set(log.id, log);
      }
    });

    // Convert back to array and sort by timestamp (newest first)
    const uniqueLogs = Array.from(uniqueLogsMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply client-side filtering for multi-service and multi-level filters
    let filtered = uniqueLogs;

    if (filters.services.length > 1) {
      filtered = filtered.filter((log) => filters.services.includes(log.service));
    }

    if (filters.levels.length > 1) {
      filtered = filtered.filter((log) => filters.levels.includes(log.level));
    }

    return filtered;
  }, [logsData?.logs, streamedLogs, filters.services, filters.levels]);

  const handleToggleStream = useCallback(() => {
    setStreamEnabled((prev) => !prev);
  }, []);

  const handleClearLogs = useCallback(() => {
    clearStreamedLogs();
    refetch();
  }, [clearStreamedLogs, refetch]);

  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      const { startTime, endTime } = calculateTimeRange(
        filters.timeRange,
        filters.customStartTime,
        filters.customEndTime
      );

      try {
        await exportLogs({
          format,
          service: filters.services.length === 1 ? filters.services[0] : undefined,
          level: filters.levels.length === 1 ? filters.levels[0] : undefined,
          startTime,
          endTime,
        });
      } catch (error) {
        console.error('Export failed:', error);
      }
    },
    [exportLogs, filters]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Logs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time log streaming and analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() => handleExport('json')}
            loading={isExporting}
            disabled={isLoading || allLogs.length === 0}
          >
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() => handleExport('csv')}
            loading={isExporting}
            disabled={isLoading || allLogs.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Error alerts */}
      {(error || streamError) && (
        <Card className="border-l-4 border-red-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Error loading logs
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error ? (error as Error).message : streamError?.message}
              </p>
              {streamError && (
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={reconnectStream}
                  className="mt-2"
                >
                  Reconnect stream
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Connection status */}
      {streamEnabled && !isStreamConnected && !streamError && (
        <Card className="border-l-4 border-yellow-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-900">
                Connecting to log stream...
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Attempting to establish real-time connection
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <LogFilters filters={filters} onFiltersChange={setFilters} />

      {/* Log Viewer */}
      <LogViewer
        logs={allLogs}
        isLoading={isLoading}
        isStreaming={streamEnabled && isStreamConnected}
        searchQuery={filters.searchQuery}
        onToggleStream={handleToggleStream}
        onClearLogs={handleClearLogs}
      />

      {/* Stats footer */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {logsData?.total?.toLocaleString() || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Displayed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {allLogs.length.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Stream Status</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {streamEnabled ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-gray-400">Paused</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Time Range</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {filters.timeRange === '1h' && '1 hour'}
              {filters.timeRange === '24h' && '24 hours'}
              {filters.timeRange === '7d' && '7 days'}
              {filters.timeRange === 'custom' && 'Custom'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
