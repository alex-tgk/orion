import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

export type ChartType = 'line' | 'area' | 'bar' | 'stacked';

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  label?: string;
  [key: string]: any;
}

export interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
  color?: string;
  unit?: string;
}

export interface ThresholdLine {
  value: number;
  label: string;
  color: string;
}

interface MetricChartProps {
  title: string;
  series: MetricSeries[];
  type?: ChartType;
  thresholds?: ThresholdLine[];
  height?: number;
  showLegend?: boolean;
  unit?: string;
  className?: string;
}

const defaultColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
];

export const MetricChart: React.FC<MetricChartProps> = ({
  title,
  series,
  type = 'line',
  thresholds = [],
  height = 300,
  showLegend = true,
  unit,
  className,
}) => {
  // Merge all series data points by timestamp
  const mergedData = React.useMemo(() => {
    const timestampMap = new Map<number, any>();

    series.forEach((s, seriesIndex) => {
      s.data.forEach((point) => {
        if (!timestampMap.has(point.timestamp)) {
          timestampMap.set(point.timestamp, { timestamp: point.timestamp });
        }
        const entry = timestampMap.get(point.timestamp)!;
        entry[s.name] = point.value;
        // Store other properties with series prefix
        Object.keys(point).forEach((key) => {
          if (key !== 'timestamp' && key !== 'value') {
            entry[`${s.name}_${key}`] = point[key];
          }
        });
      });
    });

    return Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [series]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-xs text-gray-500 mb-2">
            {format(new Date(label), 'MMM dd, HH:mm:ss')}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs font-medium">
                  {entry.name}: {entry.value.toFixed(2)}
                  {unit || entry.unit || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const formatXAxis = (timestamp: number) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatYAxis = (value: number) => {
    if (unit) return `${value}${unit}`;
    return value.toString();
  };

  const renderChart = () => {
    const commonProps = {
      data: mergedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const chartElements = series.map((s, index) => {
      const color = s.color || defaultColors[index % defaultColors.length];

      switch (type) {
        case 'area':
          return (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={2}
              name={s.name}
            />
          );
        case 'bar':
          return (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={color}
              name={s.name}
            />
          );
        case 'stacked':
          return (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stackId="1"
              stroke={color}
              fill={color}
              fillOpacity={0.6}
              strokeWidth={2}
              name={s.name}
            />
          );
        default: // line
          return (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={s.name}
            />
          );
      }
    });

    const thresholdElements = thresholds.map((threshold) => (
      <ReferenceLine
        key={threshold.label}
        y={threshold.value}
        stroke={threshold.color}
        strokeDasharray="3 3"
        label={{
          value: threshold.label,
          fill: threshold.color,
          fontSize: 12,
          position: 'right',
        }}
      />
    ));

    const ChartComponent =
      type === 'bar'
        ? BarChart
        : type === 'stacked' || type === 'area'
        ? AreaChart
        : LineChart;

    return (
      <ChartComponent {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatXAxis}
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          tickFormatter={formatYAxis}
          stroke="#9CA3AF"
          style={{ fontSize: '12px' }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        {chartElements}
        {thresholdElements}
      </ChartComponent>
    );
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
