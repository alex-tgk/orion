import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import './SystemHealthWidget.css';

interface HealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  timestamp: Date;
}

interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

interface SystemHealthWidgetProps {
  config: {
    refreshInterval: number;
    cpuThreshold: number;
    memoryThreshold: number;
    diskThreshold: number;
    showAlerts: boolean;
  };
  onConfigChange?: (config: any) => void;
  onError?: (error: Error) => void;
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  config,
  onConfigChange,
  onError,
}) => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3000/widgets/system-health', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
      // Subscribe to health updates
      newSocket.emit('subscribe');
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('health-update', (data: { metrics: HealthMetrics }) => {
      setMetrics(data.metrics);
      setLoading(false);
    });

    newSocket.on('health-alert', (data: { alert: Alert }) => {
      setAlerts((prev) => {
        // Add new alert, remove old ones of same type
        const filtered = prev.filter((a) => a.type !== data.alert.type);
        return [...filtered, data.alert];
      });
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server');
      onError?.(err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe');
      newSocket.close();
    };
  }, []);

  // Fetch initial data via REST API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch('/api/widgets/system-health/data');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setMetrics(data.current);
        setAlerts(data.alerts || []);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        onError?.(err);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get status color based on threshold
  const getStatusColor = (value: number, threshold: number): string => {
    if (value >= threshold + 10) return 'critical';
    if (value >= threshold) return 'warning';
    return 'normal';
  };

  // Render loading state
  if (loading && !metrics) {
    return (
      <div className="system-health-widget">
        <div className="widget-loading">
          <div className="spinner"></div>
          <p>Loading system health...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !metrics) {
    return (
      <div className="system-health-widget">
        <div className="widget-error">
          <i className="icon-alert-circle"></i>
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-health-widget">
      {/* Header */}
      <div className="widget-header">
        <h3>
          <i className="icon-heartbeat"></i>
          System Health
        </h3>
        <div className="widget-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="widget-body">
        {metrics && (
          <>
            {/* CPU */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">CPU Usage</span>
                <span className={`metric-value ${getStatusColor(metrics.cpu, config.cpuThreshold)}`}>
                  {metrics.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="metric-bar">
                <div
                  className={`metric-bar-fill ${getStatusColor(metrics.cpu, config.cpuThreshold)}`}
                  style={{ width: `${Math.min(100, metrics.cpu)}%` }}
                ></div>
              </div>
            </div>

            {/* Memory */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Memory Usage</span>
                <span className={`metric-value ${getStatusColor(metrics.memory, config.memoryThreshold)}`}>
                  {metrics.memory.toFixed(1)}%
                </span>
              </div>
              <div className="metric-bar">
                <div
                  className={`metric-bar-fill ${getStatusColor(metrics.memory, config.memoryThreshold)}`}
                  style={{ width: `${Math.min(100, metrics.memory)}%` }}
                ></div>
              </div>
            </div>

            {/* Disk */}
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Disk Usage</span>
                <span className={`metric-value ${getStatusColor(metrics.disk, config.diskThreshold)}`}>
                  {metrics.disk.toFixed(1)}%
                </span>
              </div>
              <div className="metric-bar">
                <div
                  className={`metric-bar-fill ${getStatusColor(metrics.disk, config.diskThreshold)}`}
                  style={{ width: `${Math.min(100, metrics.disk)}%` }}
                ></div>
              </div>
            </div>

            {/* Uptime */}
            <div className="metric-info">
              <i className="icon-clock"></i>
              <span>Uptime: {formatUptime(metrics.uptime)}</span>
            </div>
          </>
        )}

        {/* Alerts */}
        {config.showAlerts && alerts.length > 0 && (
          <div className="alerts-section">
            <h4>Active Alerts</h4>
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert alert-${alert.severity}`}>
                <i className="icon-alert-triangle"></i>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="widget-footer">
        <small>
          Last update: {metrics ? new Date(metrics.timestamp).toLocaleTimeString() : 'N/A'}
        </small>
      </div>
    </div>
  );
};

export default SystemHealthWidget;
