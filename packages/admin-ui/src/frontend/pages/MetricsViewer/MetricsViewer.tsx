import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MetricChart, MetricSeries } from '../../components/metrics';

const API_BASE = '/api/metrics';

const PRE_CONFIGURED_QUERIES = [
  { name: 'HTTP Request Rate', query: 'rate(http_requests_total[5m])', unit: 'req/s' },
  { name: 'Error Rate', query: 'rate(http_requests_total{status=~"5.."}[5m])', unit: 'req/s' },
  { name: 'Response Time P95', query: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))', unit: 's' },
  { name: 'CPU Usage', query: 'rate(process_cpu_seconds_total[5m]) * 100', unit: '%' },
  { name: 'Memory Usage', query: 'process_resident_memory_bytes / 1024 / 1024', unit: 'MB' },
];

export const MetricsViewer: React.FC = () => {
  const [selectedQueries, setSelectedQueries] = useState<string[]>([PRE_CONFIGURED_QUERIES[0].name]);
  const [customQuery, setCustomQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');

  const executeQuery = async (promql: string) => {
    const { data } = await axios.get(`${API_BASE}/query`, {
      params: { promql },
    });
    return data;
  };

  const renderQueryChart = (queryName: string) => {
    const queryConfig = PRE_CONFIGURED_QUERIES.find(q => q.name === queryName);
    if (!queryConfig) return null;

    const { data, isLoading } = useQuery({
      queryKey: ['metrics', 'query', queryConfig.query, timeRange],
      queryFn: () => executeQuery(queryConfig.query),
      refetchInterval: 30000,
    });

    if (isLoading) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      );
    }

    if (!data || data.status !== 'success') return null;

    const series: MetricSeries[] = data.data.result.map((result: any, index: number) => ({
      name: result.metric.service || `Series ${index + 1}`,
      data: result.values?.map(([timestamp, value]: [number, string]) => ({
        timestamp: timestamp * 1000,
        value: parseFloat(value),
      })) || [],
    }));

    return (
      <div key={queryName} className="bg-white rounded-lg shadow-md p-6">
        <MetricChart
          title={queryConfig.name}
          series={series}
          type="line"
          unit={queryConfig.unit}
          height={300}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Metrics Viewer</h1>
        <p className="text-gray-600">Real-time Prometheus metrics visualization</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
          </div>

          {/* Metric Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pre-configured Metrics
            </label>
            <div className="flex flex-wrap gap-2">
              {PRE_CONFIGURED_QUERIES.map((query) => (
                <button
                  key={query.name}
                  onClick={() => {
                    setSelectedQueries(prev =>
                      prev.includes(query.name)
                        ? prev.filter(q => q !== query.name)
                        : [...prev, query.name]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedQueries.includes(query.name)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {query.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Query */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom PromQL Query
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="e.g., rate(http_requests_total[5m])"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => {
                if (customQuery && !selectedQueries.includes(customQuery)) {
                  setSelectedQueries(prev => [...prev, customQuery]);
                }
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Execute
            </button>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedQueries.map(renderQueryChart)}
      </div>

      {/* Empty State */}
      {selectedQueries.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Metrics Selected</h3>
          <p className="text-gray-600">
            Select a pre-configured metric or enter a custom PromQL query to get started
          </p>
        </div>
      )}
    </div>
  );
};
