import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Server,
  Users,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { formatBytes, formatDuration, formatPercentage, getHealthColor } from '@/lib/utils';
import { ServiceHealthCard } from '@/components/cards/ServiceHealthCard';
import { MetricsChart } from '@/components/charts/MetricsChart';
import { EventFeed } from '@/components/feeds/EventFeed';
import { SystemStatsCard } from '@/components/cards/SystemStatsCard';

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  services: Array<{
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    details?: any;
  }>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

interface SystemStats {
  uptime: number;
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  activeUsers: number;
  cpu: number;
  memory: {
    used: number;
    total: number;
  };
}

/**
 * Main Dashboard Page
 *
 * Provides real-time system monitoring and health status overview.
 */
export function Dashboard() {
  const { subscribeToHealth, subscribeToEvents, subscribeToMetrics, isConnected } = useWebSocket();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch initial system status
  const { data: systemStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['system', 'status'],
    queryFn: () => api.get('/api/system/status'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch system stats
  const { data: systemStats } = useQuery({
    queryKey: ['system', 'stats'],
    queryFn: () => api.get('/api/system/stats'),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Subscribe to real-time health updates
  useEffect(() => {
    if (!isConnected) return;

    const handleHealthUpdate = (health: SystemHealth) => {
      setSystemHealth(health);
    };

    const handleEventUpdate = (event: any) => {
      setRecentEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50 events
    };

    subscribeToHealth(['system'], handleHealthUpdate);
    subscribeToEvents(['all'], handleEventUpdate);

    return () => {
      // Cleanup handled by context
    };
  }, [isConnected, subscribeToHealth, subscribeToEvents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchStatus();
    setIsRefreshing(false);
  };

  const overallHealth = systemHealth?.overall || systemStatus?.health?.overall || 'unknown';
  const healthSummary = systemHealth?.summary || systemStatus?.health?.summary || {
    total: 0,
    healthy: 0,
    unhealthy: 0,
    degraded: 0,
  };

  const stats: SystemStats = systemStats || {
    uptime: 0,
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    activeUsers: 0,
    cpu: 0,
    memory: { used: 0, total: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and system health overview
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button onClick={handleRefresh} disabled={isRefreshing} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              System Health
            </span>
            <Badge className={getHealthColor(overallHealth)} variant="outline">
              {overallHealth.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{healthSummary.total}</div>
              <p className="text-xs text-muted-foreground">Total Services</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {healthSummary.healthy}
              </div>
              <p className="text-xs text-muted-foreground">Healthy</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {healthSummary.degraded}
              </div>
              <p className="text-xs text-muted-foreground">Degraded</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {healthSummary.unhealthy}
              </div>
              <p className="text-xs text-muted-foreground">Unhealthy</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SystemStatsCard
          title="Uptime"
          value={formatDuration(stats.uptime)}
          icon={Clock}
          trend={100}
        />
        <SystemStatsCard
          title="Active Users"
          value={stats.activeUsers.toString()}
          icon={Users}
          trend={12.5}
        />
        <SystemStatsCard
          title="Avg Response Time"
          value={`${stats.avgResponseTime}ms`}
          icon={Zap}
          trend={-5.2}
        />
        <SystemStatsCard
          title="Error Rate"
          value={formatPercentage(stats.errorRate)}
          icon={AlertCircle}
          trend={-15.3}
          negative
        />
      </div>

      {/* Service Health Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="mr-2 h-5 w-5" />
            Service Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemHealth?.services.map((service) => (
              <ServiceHealthCard
                key={service.service}
                name={service.service}
                status={service.status}
                responseTime={service.responseTime}
                details={service.details}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics and Events Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricsChart
              title="CPU Usage"
              metric="cpu"
              color="blue"
              format={(value) => `${value}%`}
            />
            <MetricsChart
              title="Memory Usage"
              metric="memory"
              color="green"
              format={(value) => formatBytes(value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <MetricsChart
              title="Request Rate"
              metric="requests"
              color="purple"
              format={(value) => `${value} req/s`}
            />
            <MetricsChart
              title="Response Time"
              metric="responseTime"
              color="orange"
              format={(value) => `${value}ms`}
            />
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                Real-time system events and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventFeed events={recentEvents} maxHeight="400px" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Connections</span>
                    <span className="text-sm font-medium">45 / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Query Time</span>
                    <span className="text-sm font-medium">12ms avg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cache Hit Rate</span>
                    <span className="text-sm font-medium">94.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5" />
                  Server Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>CPU</span>
                      <span>{formatPercentage(stats.cpu / 100)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${stats.cpu}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Memory</span>
                      <span>{formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(stats.memory.used / stats.memory.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}