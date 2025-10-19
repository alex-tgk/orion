import { useState } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Button,
} from '@tremor/react';
import { Eye, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useQueues, usePurgeQueue } from '../../../hooks/useQueues';
import type { Queue } from '../../../types/queue.types';

interface QueueListProps {
  onInspectMessages: (queueName: string) => void;
}

export function QueueList({ onInspectMessages }: QueueListProps) {
  const { queues, isLoading, error, isConnected } = useQueues();
  const { mutate: purgeQueue, isPending: isPurging } = usePurgeQueue();
  const [purgingQueue, setPurgingQueue] = useState<string | null>(null);

  const handlePurge = async (queueName: string) => {
    if (!confirm(`Are you sure you want to purge all messages from "${queueName}"? This action cannot be undone.`)) {
      return;
    }

    setPurgingQueue(queueName);
    purgeQueue(queueName, {
      onSuccess: (data) => {
        alert(`Successfully purged ${data.messagesPurged} messages from ${queueName}`);
        setPurgingQueue(null);
      },
      onError: (error) => {
        alert(`Failed to purge queue: ${error.message}`);
        setPurgingQueue(null);
      },
    });
  };

  const formatRate = (rate?: number) => {
    if (!rate) return '0/s';
    return rate.toFixed(2) + '/s';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load queues</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">No queues found</p>
          <p className="text-sm text-gray-500 mt-2">Create a queue to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Queue Overview</h2>
          {isConnected ? (
            <Badge color="green">Live</Badge>
          ) : (
            <Badge color="gray">Polling</Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {queues.length} queue{queues.length !== 1 ? 's' : ''} total
        </p>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Queue Name</TableHeaderCell>
            <TableHeaderCell>Messages Ready</TableHeaderCell>
            <TableHeaderCell>Unacknowledged</TableHeaderCell>
            <TableHeaderCell>Consumers</TableHeaderCell>
            <TableHeaderCell>Publish Rate</TableHeaderCell>
            <TableHeaderCell>Delivery Rate</TableHeaderCell>
            <TableHeaderCell>State</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {queues.map((queue: Queue) => (
            <TableRow key={queue.name}>
              <TableCell>
                <div>
                  <div className="font-medium">{queue.name}</div>
                  <div className="text-xs text-gray-500">
                    {queue.durable ? 'Durable' : 'Transient'} • {queue.vhost}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-semibold text-blue-600">
                  {queue.stats.messagesReady || 0}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-gray-600">
                  {queue.stats.messagesUnacknowledged || 0}
                </span>
              </TableCell>
              <TableCell>
                <Badge color={queue.stats.consumerCount > 0 ? 'green' : 'gray'}>
                  {queue.stats.consumerCount}
                </Badge>
              </TableCell>
              <TableCell>{formatRate(queue.stats.publishRate)}</TableCell>
              <TableCell>{formatRate(queue.stats.deliveryRate)}</TableCell>
              <TableCell>
                <Badge color={queue.state === 'running' ? 'green' : 'yellow'}>
                  {queue.state || 'running'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => onInspectMessages(queue.name)}
                    disabled={queue.stats.messageCount === 0}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    color="red"
                    onClick={() => handlePurge(queue.name)}
                    disabled={queue.stats.messageCount === 0 || purgingQueue === queue.name}
                  >
                    {purgingQueue === queue.name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
