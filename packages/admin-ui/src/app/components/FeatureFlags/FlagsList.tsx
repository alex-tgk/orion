import React, { useState, useEffect } from 'react';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

interface Flag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: string;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export const FlagsList: React.FC = () => {
  const { flags, loading, error, toggleFlag, deleteFlag, refreshFlags } = useFeatureFlags();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);

  const filteredFlags = flags.filter((flag: Flag) => {
    const matchesSearch =
      flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEnabled === null || flag.enabled === filterEnabled;
    return matchesSearch && matchesFilter;
  });

  const handleToggle = async (key: string) => {
    if (window.confirm(`Are you sure you want to toggle flag "${key}"?`)) {
      await toggleFlag(key);
    }
  };

  const handleDelete = async (key: string) => {
    if (window.confirm(`Are you sure you want to delete flag "${key}"?`)) {
      await deleteFlag(key);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading feature flags: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
        <button
          onClick={refreshFlags}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search flags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filterEnabled === null ? 'all' : filterEnabled.toString()}
          onChange={(e) =>
            setFilterEnabled(
              e.target.value === 'all' ? null : e.target.value === 'true'
            )
          }
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Flags</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rollout
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFlags.map((flag: Flag) => (
              <tr key={flag.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">
                      {flag.name}
                    </div>
                    <div className="text-sm text-gray-500">{flag.key}</div>
                    {flag.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {flag.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {flag.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      flag.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${flag.rolloutPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">
                      {flag.rolloutPercentage}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => handleToggle(flag.key)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Toggle
                  </button>
                  <button
                    onClick={() => handleDelete(flag.key)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredFlags.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No feature flags found</p>
          </div>
        )}
      </div>
    </div>
  );
};
