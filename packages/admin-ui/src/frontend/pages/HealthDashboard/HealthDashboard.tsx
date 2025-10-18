import React, { useState } from 'react';
import { useSystemHealthOverview, useAllServicesHealth, useServiceDependencyGraph } from '../../hooks/useHealthData';
import { ServiceHealthCard, DependencyGraph, AlertBadge } from '../../components/health';
import { ServiceStatus, AlertSeverity } from '../../types/health';

export const HealthDashboard: React.FC = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'graph'>('grid');

  const { data: overview, isLoading: overviewLoading } = useSystemHealthOverview();
  const { data: services, isLoading: servicesLoading } = useAllServicesHealth();
  const { data: dependencyGraph } = useServiceDependencyGraph();

  if (overviewLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health dashboard...</p>
        </div>
      </div>
    );
  }

  const getOverallStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return 'text-green-600 bg-green-50';
      case ServiceStatus.DEGRADED:
        return 'text-yellow-600 bg-yellow-50';
      case ServiceStatus.UNHEALTHY:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Health Dashboard</h1>
        <p className="text-gray-600">Real-time monitoring of all microservices</p>
      </div>

      {/* System Overview */}
      {overview && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
            <div
              className={`px-4 py-2 rounded-full font-semibold ${getOverallStatusColor(
                overview.overallStatus
              )}`}
            >
              {overview.overallStatus.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{overview.totalServices}</p>
              <p className="text-sm text-gray-600 mt-1">Total Services</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{overview.healthyServices}</p>
              <p className="text-sm text-gray-600 mt-1">Healthy</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{overview.degradedServices}</p>
              <p className="text-sm text-gray-600 mt-1">Degraded</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{overview.unhealthyServices}</p>
              <p className="text-sm text-gray-600 mt-1">Unhealthy</p>
            </div>
          </div>

          {/* Alerts Summary */}
          {(overview.activeAlerts > 0 || overview.criticalAlerts > 0) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex gap-4">
                <AlertBadge
                  severity={AlertSeverity.WARNING}
                  count={overview.activeAlerts}
                />
                <AlertBadge
                  severity={AlertSeverity.CRITICAL}
                  count={overview.criticalAlerts}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'grid'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Grid View
        </button>
        <button
          onClick={() => setViewMode('graph')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'graph'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Dependency Graph
        </button>
      </div>

      {/* Services Grid View */}
      {viewMode === 'grid' && services && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceHealthCard
              key={service.serviceName}
              service={service}
              onClick={() => setSelectedService(service.serviceName)}
            />
          ))}
        </div>
      )}

      {/* Dependency Graph View */}
      {viewMode === 'graph' && dependencyGraph && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <DependencyGraph
            graph={dependencyGraph}
            onNodeClick={(node) => setSelectedService(node.serviceName)}
          />
        </div>
      )}

      {/* Auto-refresh Indicator */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-600">Live updates</span>
      </div>
    </div>
  );
};
