import { useState } from 'react';
import { Button } from '@tremor/react';
import {
  PlayCircle,
  Power,
  RotateCw,
  RefreshCw,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { PM2Process } from '../../../types/services.types';

interface ProcessControlsProps {
  process: PM2Process;
  onStart?: (pm_id: number) => void;
  onStop?: (pm_id: number) => void;
  onRestart?: (pm_id: number) => void;
  onReload?: (pm_id: number) => void;
  onViewLogs?: (pm_id: number) => void;
  isLoading?: boolean;
}

export function ProcessControls({
  process,
  onStart,
  onStop,
  onRestart,
  onReload,
  onViewLogs,
  isLoading,
}: ProcessControlsProps) {
  const [showConfirm, setShowConfirm] = useState<
    'start' | 'stop' | 'restart' | 'reload' | null
  >(null);

  const handleAction = (action: 'start' | 'stop' | 'restart' | 'reload') => {
    const handlers = {
      start: onStart,
      stop: onStop,
      restart: onRestart,
      reload: onReload,
    };

    const handler = handlers[action];
    if (handler) {
      handler(process.pm_id);
    }
    setShowConfirm(null);
  };

  const isOnline = process.status === 'online';
  const isStopped = process.status === 'stopped';
  const isClusterMode = process.mode === 'cluster';

  return (
    <div className="flex items-center gap-2">
      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Confirm Action</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to {showConfirm}{' '}
                  <span className="font-semibold">{process.name}</span>?
                </p>
                {showConfirm === 'stop' && (
                  <p className="text-xs text-red-600 mt-2">
                    This will stop the process and may cause service interruption.
                  </p>
                )}
                {showConfirm === 'reload' && (
                  <p className="text-xs text-blue-600 mt-2">
                    Zero-downtime reload (cluster mode only). New instances will start before
                    old ones stop.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowConfirm(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleAction(showConfirm)}
                disabled={isLoading}
                color={showConfirm === 'stop' ? 'red' : 'blue'}
              >
                {isLoading ? 'Processing...' : `Yes, ${showConfirm}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isOnline ? (
        <>
          <Button
            size="xs"
            variant="secondary"
            icon={RotateCw}
            onClick={() => setShowConfirm('restart')}
            disabled={isLoading}
            tooltip="Restart process"
          >
            Restart
          </Button>
          {isClusterMode && (
            <Button
              size="xs"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => setShowConfirm('reload')}
              disabled={isLoading}
              tooltip="Zero-downtime reload (cluster mode)"
            >
              Reload
            </Button>
          )}
          <Button
            size="xs"
            variant="secondary"
            icon={Power}
            onClick={() => setShowConfirm('stop')}
            disabled={isLoading}
            color="red"
            tooltip="Stop process"
          >
            Stop
          </Button>
        </>
      ) : isStopped ? (
        <Button
          size="xs"
          variant="primary"
          icon={PlayCircle}
          onClick={() => setShowConfirm('start')}
          disabled={isLoading}
          tooltip="Start process"
        >
          Start
        </Button>
      ) : (
        <Button size="xs" variant="secondary" disabled>
          {process.status}...
        </Button>
      )}

      {/* View Logs */}
      <Button
        size="xs"
        variant="secondary"
        icon={FileText}
        onClick={() => onViewLogs?.(process.pm_id)}
        disabled={isLoading}
        tooltip="View logs"
      >
        Logs
      </Button>
    </div>
  );
}
