import { Card } from '@tremor/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Clock } from 'lucide-react';
import { useQueueStats } from '../../../hooks/useQueues';
import { format } from 'date-fns';

interface QueueStatsProps {
  queueName: string;
}

export function QueueStats({ queueName }: QueueStatsProps) {
  const { stats, historicalStats } = useQueueStats(queueName);

  if (!stats) {
    return null;
  }

  const chartData = historicalStats.map((entry) => ({
    time: format(new Date(entry.timestamp), 'HH:mm:ss'),
    messages: entry.messageCount,
    publishRate: entry.publishRate,
    deliveryRate: entry.deliveryRate,
    consumers: entry.consumerCount,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold mt-1">{stats.messageCount}</p>
              <div className="flex gap-2 text-xs text-gray-500 mt-2">
                <span>Ready: {stats.messagesReady || 0}</span>
                <span>Unacked: {stats.messagesUnacknowledged || 0}</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Message Rate</p>
              <p className="text-2xl font-bold mt-1">
                {(stats.publishRate || 0).toFixed(2)}/s
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Delivery: {(stats.deliveryRate || 0).toFixed(2)}/s
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Consumers</p>
              <p className="text-2xl font-bold mt-1">{stats.consumerCount}</p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.consumerCount > 0 ? 'Consuming messages' : 'No active consumers'}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Message Count Chart */}
      {chartData.length > 1 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Message Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Message Count"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="consumers"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Consumers"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Rate Chart */}
      {chartData.length > 1 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Message Rate (msg/sec)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="publishRate"
                stroke="#10b981"
                strokeWidth={2}
                name="Publish Rate"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="deliveryRate"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Delivery Rate"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
