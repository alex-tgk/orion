import { useState } from 'react';
import { Card, Badge } from '@tremor/react';
import { Activity, MessageSquare, BarChart3 } from 'lucide-react';
import { QueueList } from '../components/features/queues/QueueList';
import { MessageInspector } from '../components/features/queues/MessageInspector';
import { QueueStats } from '../components/features/queues/QueueStats';
import { useQueues } from '../hooks/useQueues';

export function Queues() {
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [inspectingQueue, setInspectingQueue] = useState<string | null>(null);
  const { queues, totalMessages, isLoading } = useQueues();

  const handleInspectMessages = (queueName: string) => {
    setInspectingQueue(queueName);
  };

  const handleCloseInspector = () => {
    setInspectingQueue(null);
  };

  const handleSelectQueue = (queueName: string) => {
    if (selectedQueue === queueName) {
      setSelectedQueue(null);
    } else {
      setSelectedQueue(queueName);
    }
  };

  const totalConsumers = queues.reduce((sum, q) => sum + q.stats.consumerCount, 0);
  const avgPublishRate = queues.length > 0
    ? queues.reduce((sum, q) => sum + (q.stats.publishRate || 0), 0) / queues.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">RabbitMQ Queues</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor and manage message queues in real-time
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Queues</p>
              <p className="text-2xl font-bold mt-1">{queues.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold mt-1">{totalMessages.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Consumers</p>
              <p className="text-2xl font-bold mt-1">{totalConsumers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Publish Rate</p>
              <p className="text-2xl font-bold mt-1">{avgPublishRate.toFixed(2)}/s</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Queue List */}
      <Card>
        <QueueList onInspectMessages={handleInspectMessages} />
      </Card>

      {/* Queue Details */}
      {queues.length > 0 && (
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Queue Details</h2>
            <div className="flex flex-wrap gap-2">
              {queues.map((queue) => (
                <button
                  key={queue.name}
                  onClick={() => handleSelectQueue(queue.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedQueue === queue.name
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {queue.name}
                  {queue.stats.messageCount > 0 && (
                    <Badge
                      size="xs"
                      color={selectedQueue === queue.name ? 'white' : 'blue'}
                      className="ml-2"
                    >
                      {queue.stats.messageCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedQueue && <QueueStats queueName={selectedQueue} />}

          {!selectedQueue && (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Select a queue to view detailed statistics</p>
            </div>
          )}
        </Card>
      )}

      {/* Message Inspector Modal */}
      {inspectingQueue && (
        <MessageInspector queueName={inspectingQueue} onClose={handleCloseInspector} />
      )}
    </div>
  );
}
