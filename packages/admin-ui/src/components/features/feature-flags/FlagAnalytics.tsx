import { Card, Badge } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, CheckCircle, XCircle } from 'lucide-react';
import { useFeatureFlagStats } from '../../../hooks/useFeatureFlags';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function FlagAnalytics() {
  const { stats, totalEvaluations, isLoading, error } = useFeatureFlagStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Failed to load analytics</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">No analytics data available</p>
          <p className="text-sm text-gray-500 mt-2">
            Feature flag evaluations will appear here once they are used
          </p>
        </div>
      </div>
    );
  }

  const totalUniqueUsers = stats.reduce((sum, stat) => sum + stat.uniqueUsers, 0);
  const avgEvaluationsPerFlag = totalEvaluations / stats.length;

  // Prepare data for bar chart (top 10 flags by evaluations)
  const barChartData = [...stats]
    .sort((a, b) => b.totalEvaluations - a.totalEvaluations)
    .slice(0, 10)
    .map((stat) => ({
      name: stat.flagKey,
      enabled: stat.enabledEvaluations,
      disabled: stat.disabledEvaluations,
      total: stat.totalEvaluations,
    }));

  // Prepare data for pie chart (enabled vs disabled)
  const totalEnabled = stats.reduce((sum, stat) => sum + stat.enabledEvaluations, 0);
  const totalDisabled = stats.reduce((sum, stat) => sum + stat.disabledEvaluations, 0);
  const pieChartData = [
    { name: 'Enabled', value: totalEnabled },
    { name: 'Disabled', value: totalDisabled },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Evaluations</p>
              <p className="text-2xl font-bold mt-1">{totalEvaluations.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Across all flags</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Users</p>
              <p className="text-2xl font-bold mt-1">{totalUniqueUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Distinct user IDs</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enabled Rate</p>
              <p className="text-2xl font-bold mt-1">
                {totalEvaluations > 0 ? ((totalEnabled / totalEvaluations) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalEnabled.toLocaleString()} evaluations
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Evaluations</p>
              <p className="text-2xl font-bold mt-1">
                {avgEvaluationsPerFlag.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Per feature flag</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Top Flags */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Top Feature Flags by Usage</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                angle={-45}
                textAnchor="end"
                height={80}
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
              <Bar dataKey="enabled" stackId="a" fill="#10b981" name="Enabled" />
              <Bar dataKey="disabled" stackId="a" fill="#ef4444" name="Disabled" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart - Enabled vs Disabled */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Enabled vs Disabled Evaluations</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Detailed Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature Flag
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Evaluations
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disabled
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unique Users
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Evaluated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.map((stat) => (
                <tr key={stat.flagId}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {stat.flagKey}
                    </code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-semibold">
                      {stat.totalEvaluations.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{stat.enabledEvaluations.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>{stat.disabledEvaluations.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge color="purple">{stat.uniqueUsers}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {stat.lastEvaluated
                      ? new Date(stat.lastEvaluated).toLocaleString()
                      : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
