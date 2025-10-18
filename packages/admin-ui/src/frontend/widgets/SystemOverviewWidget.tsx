import React, { useState, useEffect } from 'react';
import { WidgetProps, SystemStatus } from '../types';
import { API } from '../services/api';

/**
 * System Overview Widget
 * Displays overall system health, uptime, and service status
 */
export const SystemOverviewWidget: React.FC<WidgetProps> = ({ onRefresh }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await API.getSystemStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load system status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadData();
    onRefresh?.();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'degraded':
      case 'stopped':
        return 'text-yellow-600 bg-yellow-100';
      case 'down':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (loading && !status) {
    return (
      <div className="widget-card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="widget-header">System Overview</h3>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {status && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">System Status</div>
              <div className="text-lg font-semibold mt-1 capitalize">{status.status}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
              {status.status}
            </span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Uptime</div>
            <div className="text-lg font-semibold mt-1">{formatUptime(Date.now() - status.uptime)}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Services</div>
            <div className="space-y-2">
              {status.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{service.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
