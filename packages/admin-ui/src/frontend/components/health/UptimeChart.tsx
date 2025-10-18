import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { HealthHistoryDataPoint, ServiceStatus } from '../../types/health';
import { format } from 'date-fns';

interface UptimeChartProps {
  data: HealthHistoryDataPoint[];
  serviceName: string;
  timeRangeHours: number;
  type?: 'line' | 'area';
  className?: string;
}

const statusColors: Record<ServiceStatus, string> = {
  [ServiceStatus.HEALTHY]: '#10B981',
  [ServiceStatus.DEGRADED]: '#F59E0B',
  [ServiceStatus.UNHEALTHY]: '#EF4444',
  [ServiceStatus.UNKNOWN]: '#6B7280',
};

export const UptimeChart: React.FC<UptimeChartProps> = ({
  data,
  serviceName,
  timeRangeHours,
  type = 'area',
  className,
}) => {
  // Transform data for chart
  const chartData = data.map((point) => ({
    timestamp: new Date(point.timestamp).getTime(),
    uptime: point.uptime,
    responseTime: point.responseTime,
    status: point.status,
    formattedTime: format(new Date(point.timestamp), 'HH:mm'),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-xs text-gray-500 mb-2">
            {format(new Date(data.timestamp), 'MMM dd, HH:mm:ss')}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-medium">Uptime: {data.uptime.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs font-medium">Response: {data.responseTime}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColors[data.status] }}
              />
              <span className="text-xs font-medium capitalize">Status: {data.status}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatXAxis = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{serviceName}</h3>
        <p className="text-sm text-gray-500">
          Last {timeRangeHours} hours uptime history
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {type === 'area' ? (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              domain={[95, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area
              type="monotone"
              dataKey="uptime"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.3}
              name="Uptime %"
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              domain={[95, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="uptime"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="Uptime %"
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Average Uptime</p>
          <p className="text-lg font-semibold text-gray-900">
            {(
              chartData.reduce((sum, d) => sum + d.uptime, 0) / chartData.length
            ).toFixed(2)}
            %
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Avg Response Time</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(
              chartData.reduce((sum, d) => sum + d.responseTime, 0) / chartData.length
            )}
            ms
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Incidents</p>
          <p className="text-lg font-semibold text-gray-900">
            {
              chartData.filter(
                (d) =>
                  d.status === ServiceStatus.DEGRADED ||
                  d.status === ServiceStatus.UNHEALTHY
              ).length
            }
          </p>
        </div>
      </div>
    </div>
  );
};
