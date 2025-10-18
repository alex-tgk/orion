import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Zap } from 'lucide-react';
import { analyticsApi } from '../services/api';
import { formatCurrency } from '../lib/utils';

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getUsage(),
  });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Cost & Usage Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Cost</span>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(data.totalCost)}</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Savings</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(data.savings.cachingEnabled)}
          </p>
          <p className="text-xs text-gray-500 mt-1">From caching</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Requests</span>
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{data.breakdown.chat.requests}</p>
          <p className="text-xs text-gray-500 mt-1">AI queries</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Cost Breakdown</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Embeddings</span>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(data.breakdown.embeddings.cost)}</p>
              <p className="text-xs text-gray-500">{data.breakdown.embeddings.requests} requests</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Chat (GPT-4)</span>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(data.breakdown.chat.cost)}</p>
              <p className="text-xs text-gray-500">{data.breakdown.chat.requests} requests</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Summaries</span>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(data.breakdown.summaries.cost)}</p>
              <p className="text-xs text-gray-500">{data.breakdown.summaries.requests} requests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Cost Optimization Tips</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Enable caching: Save 70-90% on repeat questions</li>
          <li>• Use GPT-3.5 for simple queries: 90% cost reduction</li>
          <li>• Batch process documents: 30% savings</li>
        </ul>
      </div>
    </div>
  );
}
