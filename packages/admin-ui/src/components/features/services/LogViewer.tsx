import { Card, Title, Text, Button, Badge } from '@tremor/react';
import { X, Download, RefreshCw, Terminal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePM2Logs } from '../../../hooks/usePM2';
import type { PM2LogEntry } from '../../../types/services.types';

interface LogViewerProps {
  pm_id: number;
  processName: string;
  onClose: () => void;
}

export function LogViewer({ pm_id, processName, onClose }: LogViewerProps) {
  const { data: logs, isLoading, refetch } = usePM2Logs(pm_id, true);

  const handleDownload = () => {
    if (!logs || logs.length === 0) return;

    const logText = logs
      .map((log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`)
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${processName}-${new Date().toISOString()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-gray-700" />
            <div>
              <Title>Process Logs</Title>
              <Text className="mt-1">
                {processName} (PM2 ID: {pm_id})
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="xs"
              variant="secondary"
              icon={Download}
              onClick={handleDownload}
              disabled={!logs || logs.length === 0}
            >
              Download
            </Button>
            <Button size="xs" variant="secondary" icon={X} onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-4 font-mono text-sm">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading logs...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No logs available</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 items-start ${
                    log.type === 'err' ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  <Badge
                    color={log.type === 'err' ? 'red' : 'gray'}
                    size="xs"
                    className="flex-shrink-0 mt-0.5"
                  >
                    {log.type.toUpperCase()}
                  </Badge>
                  <span className="text-gray-500 flex-shrink-0 text-xs">
                    {formatDistanceToNow(new Date(log.timestamp))} ago
                  </span>
                  <pre className="whitespace-pre-wrap break-all flex-1">{log.message}</pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <Text className="text-xs">
            {logs?.length || 0} log entries • Auto-refreshes every 5s
          </Text>
          <Text className="text-xs text-gray-500">Scroll to view all logs</Text>
        </div>
      </Card>
    </div>
  );
}
