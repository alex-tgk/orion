import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Database,
  Cpu,
  HardDrive,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  requestsPerMin: number;
  errorRate: number;
  lastChecked: string;
  version: string;
  instances: number;
  cpu: number;
  memory: number;
}

const mockServices: Service[] = [
  {
    id: 'auth',
    name: 'Auth Service',
    status: 'healthy',
    uptime: 99.98,
    responseTime: 45,
    requestsPerMin: 234,
    errorRate: 0.02,
    lastChecked: new Date().toISOString(),
    version: '2.1.0',
    instances: 3,
    cpu: 23,
    memory: 45,
  },
  {
    id: 'ai-interface',
    name: 'AI Interface',
    status: 'healthy',
    uptime: 99.95,
    responseTime: 890,
    requestsPerMin: 45,
    errorRate: 0.08,
    lastChecked: new Date().toISOString(),
    version: '2.1.0',
    instances: 5,
    cpu: 67,
    memory: 78,
  },
  {
    id: 'vector-db',
    name: 'Vector DB',
    status: 'healthy',
    uptime: 99.99,
    responseTime: 12,
    requestsPerMin: 89,
    errorRate: 0.01,
    lastChecked: new Date().toISOString(),
    version: '1.3.0',
    instances: 2,
    cpu: 34,
    memory: 56,
  },
  {
    id: 'storage',
    name: 'Storage Service',
    status: 'degraded',
    uptime: 98.5,
    responseTime: 234,
    requestsPerMin: 156,
    errorRate: 1.2,
    lastChecked: new Date().toISOString(),
    version: '1.2.1',
    instances: 4,
    cpu: 45,
    memory: 67,
  },
];

function ServiceCard({ service }: { service: Service }) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  };

  const StatusIcon = {
    healthy: CheckCircle,
    degraded: AlertCircle,
    down: XCircle,
  }[service.status];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{service.name}</h3>
            <p className="text-sm text-gray-500">v{service.version}</p>
          </div>
        </div>
        <span className={'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ' + statusColors[service.status]}>
          <StatusIcon className="h-3.5 w-3.5" />
          {service.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Activity className="h-4 w-4" />
            <span>Response Time</span>
          </div>
          <p className="text-2xl font-bold">{service.responseTime}ms</p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Requests/min</span>
          </div>
          <p className="text-2xl font-bold">{service.requestsPerMin}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Uptime</span>
          <span className="font-medium">{service.uptime}%</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Error Rate</span>
          <span className="font-medium">{service.errorRate}%</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Instances</span>
          <span className="font-medium">{service.instances} running</span>
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Cpu className="h-4 w-4" />
            <span>CPU</span>
          </div>
          <span className="font-medium">{service.cpu}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: service.cpu + '%' }} />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <HardDrive className="h-4 w-4" />
            <span>Memory</span>
          </div>
          <span className="font-medium">{service.memory}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-purple-600 h-2 rounded-full" style={{ width: service.memory + '%' }} />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors">
          View Details
        </button>
      </div>
    </div>
  );
}

export function Services() {
  const { data: services = mockServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => mockServices,
  });

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const downCount = services.filter((s) => s.status === 'down').length;

  const avgResponseTime = Math.round(
    services.reduce((sum, s) => sum + s.responseTime, 0) / services.length
  );
  const totalRequests = services.reduce((sum, s) => sum + s.requestsPerMin, 0);
  const avgUptime = (
    services.reduce((sum, s) => sum + s.uptime, 0) / services.length
  ).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Services</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor health and performance of all ORION microservices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">System Health</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{healthyCount}/{services.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {degradedCount > 0 && degradedCount + ' degraded, '}
            {downCount > 0 && downCount + ' down'}
            {degradedCount === 0 && downCount === 0 && 'All systems operational'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Response</span>
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{avgResponseTime}ms</p>
          <p className="text-xs text-gray-500 mt-1">Across all services</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Requests</span>
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{totalRequests}/min</p>
          <p className="text-xs text-gray-500 mt-1">System-wide throughput</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Uptime</span>
            <Database className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{avgUptime}%</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
