import React, { useState, useEffect } from 'react';
import { WidgetProps } from '../types';
import { API } from '../services/api';

interface Service {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
  uptime: number;
  health: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  version?: string;
  url?: string;
}

/**
 * Services Status Widget
 * Displays a list of all microservices with their health status
 */
export const ServicesStatusWidget: React.FC<WidgetProps> = ({ onRefresh }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped' | 'error'>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await API.getServices();
      setServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadData();
    onRefresh?.();
  };

  const getStatusColor = (status: Service['status']) => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'starting':
        return 'text-blue-600 bg-blue-100';
      case 'stopped':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: Service['health']) => {
    switch (health) {
      case 'healthy':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        );
      case 'degraded':
        return (
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
        );
      case 'down':
        return (
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        );
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const filteredServices = services.filter(service => {
    if (filter === 'all') return true;
    return service.status === filter;
  });

  const statusCounts = {
    running: services.filter(s => s.status === 'running').length,
    stopped: services.filter(s => s.status === 'stopped').length,
    error: services.filter(s => s.status === 'error').length,
  };

  if (loading && services.length === 0) {
    return (
      <div className="widget-card">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                <div className="flex-1 h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="widget-header">Services Status</h3>
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

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {[
          { key: 'all' as const, label: 'All', count: services.length },
          { key: 'running' as const, label: 'Running', count: statusCounts.running },
          { key: 'stopped' as const, label: 'Stopped', count: statusCounts.stopped },
          { key: 'error' as const, label: 'Error', count: statusCounts.error },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`
              px-3 py-2 text-sm font-medium transition-colors relative
              ${filter === tab.key
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Services List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredServices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No services found
          </div>
        ) : (
          filteredServices.map(service => (
            <div
              key={service.id}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getHealthIcon(service.health)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {service.name}
                    </span>
                    {service.version && (
                      <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
                        v{service.version}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      Uptime: {formatUptime(service.uptime)}
                    </span>
                    {service.url && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:text-primary-700"
                        >
                          View
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                {service.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {statusCounts.running} of {services.length} services running
        </span>
        <button className="text-primary-600 hover:text-primary-700 font-medium">
          Manage Services →
        </button>
      </div>
    </div>
  );
};
