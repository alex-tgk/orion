import { useState } from 'react';
import { Card, Title, Text, Badge, Grid } from '@tremor/react';
import { CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { ServiceCard } from './ServiceCard';
import { useServices, useRestartService, useStopService, useStartService } from '../../../hooks/useServices';
import type { Service } from '../../../types/services.types';

interface ServiceGridProps {
  className?: string;
}

export function ServiceGrid({ className }: ServiceGridProps) {
  const { data: services, isLoading, error } = useServices();
  const restartMutation = useRestartService();
  const stopMutation = useStopService();
  const startMutation = useStartService();
  const [actioningServiceId, setActioningServiceId] = useState<string | null>(null);

  const handleRestart = async (serviceId: string) => {
    setActioningServiceId(serviceId);
    try {
      await restartMutation.mutateAsync(serviceId);
    } catch (error) {
      console.error('Failed to restart service:', error);
    } finally {
      setTimeout(() => setActioningServiceId(null), 2000);
    }
  };

  const handleStop = async (serviceId: string) => {
    setActioningServiceId(serviceId);
    try {
      await stopMutation.mutateAsync(serviceId);
    } catch (error) {
      console.error('Failed to stop service:', error);
    } finally {
      setTimeout(() => setActioningServiceId(null), 2000);
    }
  };

  const handleStart = async (serviceId: string) => {
    setActioningServiceId(serviceId);
    try {
      await startMutation.mutateAsync(serviceId);
    } catch (error) {
      console.error('Failed to start service:', error);
    } finally {
      setTimeout(() => setActioningServiceId(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <Title>Failed to load services</Title>
          <Text className="mt-2">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </Text>
        </div>
      </Card>
    );
  }

  if (!services || services.length === 0) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <Title>No services found</Title>
          <Text className="mt-2">There are no services to display</Text>
        </div>
      </Card>
    );
  }

  // Calculate stats
  const stats = {
    total: services.length,
    online: services.filter((s) => s.status === 'online').length,
    degraded: services.filter((s) => s.status === 'degraded').length,
    offline: services.filter((s) => s.status === 'offline').length,
    healthy: services.filter((s) => s.healthStatus === 'healthy').length,
  };

  const healthPercentage = ((stats.healthy / stats.total) * 100).toFixed(0);

  return (
    <div className={className}>
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card decoration="top" decorationColor="green">
          <div className="flex items-center justify-between">
            <div>
              <Text>System Health</Text>
              <Title className="mt-1">
                {stats.healthy}/{stats.total}
              </Title>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <Text className="mt-2 text-xs">{healthPercentage}% healthy</Text>
        </Card>

        <Card decoration="top" decorationColor="blue">
          <div className="flex items-center justify-between">
            <div>
              <Text>Online</Text>
              <Title className="mt-1">{stats.online}</Title>
            </div>
            <Badge color="green" size="lg">
              {stats.online}
            </Badge>
          </div>
          <Text className="mt-2 text-xs">Active services</Text>
        </Card>

        <Card decoration="top" decorationColor="yellow">
          <div className="flex items-center justify-between">
            <div>
              <Text>Degraded</Text>
              <Title className="mt-1">{stats.degraded}</Title>
            </div>
            <Badge color="yellow" size="lg">
              {stats.degraded}
            </Badge>
          </div>
          <Text className="mt-2 text-xs">Need attention</Text>
        </Card>

        <Card decoration="top" decorationColor="red">
          <div className="flex items-center justify-between">
            <div>
              <Text>Offline</Text>
              <Title className="mt-1">{stats.offline}</Title>
            </div>
            <Badge color="red" size="lg">
              {stats.offline}
            </Badge>
          </div>
          <Text className="mt-2 text-xs">Not running</Text>
        </Card>
      </div>

      {/* Services Grid */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-6">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onRestart={handleRestart}
            onStop={handleStop}
            onStart={handleStart}
            isActionLoading={actioningServiceId === service.id}
          />
        ))}
      </Grid>
    </div>
  );
}
