import { useState, useEffect } from 'react';
import { TabGroup, TabList, Tab, TabPanels, TabPanel, Title, Text } from '@tremor/react';
import { Server, Layers, Activity, Settings } from 'lucide-react';
import { ServiceGrid } from '../components/features/services/ServiceGrid';
import { PM2Dashboard } from '../components/features/services/PM2Dashboard';
import { HealthStatus } from '../components/features/services/HealthStatus';
import { LogViewer } from '../components/features/services/LogViewer';
import { websocketService } from '../services/websocket.service';

const tabs = [
  { name: 'Services', icon: Server, value: 'services' },
  { name: 'PM2 Processes', icon: Layers, value: 'pm2' },
  { name: 'Health Checks', icon: Activity, value: 'health' },
];

export function Services() {
  const [activeTab, setActiveTab] = useState(0);
  const [logViewerState, setLogViewerState] = useState<{
    pm_id: number;
    processName: string;
  } | null>(null);

  // Connect to WebSocket on mount
  useEffect(() => {
    const socket = websocketService.connect();

    socket.on('connect', () => {
      console.log('[Services] WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('[Services] WebSocket disconnected');
    });

    return () => {
      // Don't disconnect here, as other components might be using it
      // The service manages its own lifecycle
    };
  }, []);

  const handleViewLogs = (pm_id: number, processName: string) => {
    setLogViewerState({ pm_id, processName });
  };

  const handleCloseLogs = () => {
    setLogViewerState(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Title className="text-3xl font-bold text-gray-900">Service Monitoring</Title>
          <Text className="mt-2 text-gray-600">
            Monitor health, performance, and manage all ORION microservices and PM2 processes
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <Text className="text-xs font-medium text-green-700">Live Updates Active</Text>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabGroup index={activeTab} onIndexChange={setActiveTab}>
        <TabList className="border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tab
                key={tab.value}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </Tab>
            );
          })}
        </TabList>

        <TabPanels>
          {/* Services Tab */}
          <TabPanel>
            <div className="mt-6">
              <ServiceGrid />
            </div>
          </TabPanel>

          {/* PM2 Processes Tab */}
          <TabPanel>
            <div className="mt-6">
              <PM2Dashboard onViewLogs={handleViewLogs} />
            </div>
          </TabPanel>

          {/* Health Checks Tab */}
          <TabPanel>
            <div className="mt-6">
              <HealthStatus />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {/* Log Viewer Modal */}
      {logViewerState && (
        <LogViewer
          pm_id={logViewerState.pm_id}
          processName={logViewerState.processName}
          onClose={handleCloseLogs}
        />
      )}
    </div>
  );
}
