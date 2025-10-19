import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Service {
  name: string;
  pid: number;
  status: 'online' | 'stopping' | 'stopped' | 'launching' | 'errored';
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}

function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3300');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to Service Manager');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from Service Manager');
    });

    newSocket.on('services-update', (data: Service[]) => {
      setServices(data);
    });

    // Initial fetch
    fetch('http://localhost:3300/api/services')
      .then(res => res.json())
      .then(data => setServices(data.services))
      .catch(err => console.error('Failed to fetch services:', err));

    return () => {
      newSocket.close();
    };
  }, []);

  const handleServiceAction = async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const response = await fetch(`http://localhost:3300/api/services/${serviceName}/${action}`, {
        method: 'POST',
      });
      const result = await response.json();
      console.log(result.message);
    } catch (error) {
      console.error(`Failed to ${action} service:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'stopping':
      case 'launching':
        return 'bg-yellow-100 text-yellow-800';
      case 'stopped':
        return 'bg-gray-100 text-gray-800';
      case 'errored':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ORION Service Manager</h1>
              <p className="mt-1 text-sm text-gray-500">Powered by PM2</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Services</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{services.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Online</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {services.filter(s => s.status === 'online').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Stopped</div>
            <div className="mt-2 text-3xl font-bold text-gray-600">
              {services.filter(s => s.status === 'stopped').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Errored</div>
            <div className="mt-2 text-3xl font-bold text-red-600">
              {services.filter(s => s.status === 'errored').length}
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CPU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restarts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.pid || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.cpu ? `${service.cpu.toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.memory ? formatBytes(service.memory) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.uptime ? formatUptime(service.uptime) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.restarts || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {service.status === 'stopped' ? (
                        <button
                          onClick={() => handleServiceAction(service.name, 'start')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Start
                        </button>
                      ) : (
                        <button
                          onClick={() => handleServiceAction(service.name, 'stop')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Stop
                        </button>
                      )}
                      <button
                        onClick={() => handleServiceAction(service.name, 'restart')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Restart
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {services.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No services found. Make sure PM2 is running.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
