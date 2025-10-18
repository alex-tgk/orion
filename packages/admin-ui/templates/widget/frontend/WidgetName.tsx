import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import './WidgetName.css';

// TODO: Define your data types
interface WidgetData {
  // Add your data structure here
  value: any;
  timestamp: Date;
}

interface WidgetNameProps {
  config: {
    refreshInterval: number;
    showDetails?: boolean;
    maxItems?: number;
    // Add your custom configuration properties
  };
  onConfigChange?: (config: any) => void;
  onError?: (error: Error) => void;
  onAction?: (action: string, data: any) => void;
}

/**
 * WIDGET_DESCRIPTION
 * 
 * Features:
 * - Auto-refresh with configurable interval
 * - Error handling and retry logic
 * - Loading states
 * - Optional WebSocket real-time updates
 * - Export functionality
 * - Responsive design
 */
export const WidgetName: React.FC<WidgetNameProps> = ({
  config,
  onConfigChange,
  onError,
  onAction,
}) => {
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // WebSocket state (optional - remove if not needed)
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  /**
   * Fetch data from REST API
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams(
        Object.entries(config)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      );

      const response = await fetch(
        `/api/widgets/__WIDGET_NAME__/data?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // Add authentication headers if needed
            // 'Authorization': `Bearer ${getToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date(result.timestamp));
      } else {
        throw new Error(result.error?.message || 'Failed to fetch data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      console.error('Widget fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [config, onError]);

  /**
   * Initialize WebSocket connection (optional)
   * Remove this section if you don't need real-time updates
   */
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3000';
    const newSocket = io(`${wsUrl}/widgets/__WIDGET_NAME__`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      // Subscribe to updates
      newSocket.emit('subscribe', config);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('data-update', (update: { data: WidgetData }) => {
      setData(update.data);
      setLastUpdate(new Date());
      setLoading(false);
    });

    newSocket.on('error', (err: Error) => {
      console.error('WebSocket error:', err);
      setError(err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe');
      newSocket.close();
    };
  }, []); // Empty deps - only connect once

  /**
   * Auto-refresh via REST API
   */
  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up interval
    const interval = setInterval(fetchData, config.refreshInterval);

    return () => clearInterval(interval);
  }, [fetchData, config.refreshInterval]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Handle export
   */
  const handleExport = useCallback(async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(
        `/api/widgets/__WIDGET_NAME__/export?format=${format}`
      );
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();
      
      // Download file
      const blob = new Blob([result.data], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `widget-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onAction?.('export', { format, success: true });
    } catch (err) {
      console.error('Export error:', err);
      setError('Export failed');
    }
  }, [onAction]);

  /**
   * Memoized processed data
   */
  const processedData = useMemo(() => {
    if (!data) return null;

    // TODO: Process/transform data for display
    // Examples:
    // - Filter based on config.maxItems
    // - Sort data
    // - Calculate aggregates
    // - Format values

    return data;
  }, [data, config]);

  /**
   * Render loading state
   */
  if (loading && !data) {
    return (
      <div className="widget-name-widget">
        <div className="widget-loading">
          <div className="spinner" aria-label="Loading"></div>
          <p>Loading WIDGET_DESCRIPTION...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error && !data) {
    return (
      <div className="widget-name-widget">
        <div className="widget-error">
          <i className="icon-alert-circle" aria-hidden="true"></i>
          <p className="error-message">Error: {error}</p>
          <button 
            onClick={handleRefresh}
            className="btn-retry"
            aria-label="Retry loading data"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render widget content
   */
  return (
    <div className="widget-name-widget">
      {/* Header */}
      <div className="widget-header">
        <h3 className="widget-title">
          <i className="icon-WIDGET_ICON" aria-hidden="true"></i>
          <span>WIDGET_DESCRIPTION</span>
        </h3>
        
        <div className="widget-actions">
          {/* Connection status (if using WebSocket) */}
          <span 
            className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}
            aria-label={connected ? 'Connected' : 'Disconnected'}
          >
            {connected ? '● Live' : '○ Offline'}
          </span>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="btn-icon"
            aria-label="Refresh data"
            title="Refresh"
            disabled={loading}
          >
            <i className={`icon-refresh ${loading ? 'spinning' : ''}`}></i>
          </button>

          {/* Export dropdown */}
          <div className="dropdown">
            <button className="btn-icon" aria-label="Export data">
              <i className="icon-download"></i>
            </button>
            <div className="dropdown-menu">
              <button onClick={() => handleExport('json')}>
                Export JSON
              </button>
              <button onClick={() => handleExport('csv')}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Settings */}
          <button
            className="btn-icon"
            aria-label="Configure widget"
            onClick={() => onAction?.('configure', {})}
          >
            <i className="icon-settings"></i>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="widget-body">
        {processedData ? (
          <>
            {/* TODO: Implement your widget UI here */}
            
            {/* Example: Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Example Metric</div>
                <div className="stat-value">
                  {/* {processedData.someValue} */}
                  123
                </div>
              </div>
              
              {/* Add more stat cards */}
            </div>

            {/* Example: Data Table */}
            {config.showDetails && (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Column 1</th>
                      <th>Column 2</th>
                      <th>Column 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Map over your data */}
                    <tr>
                      <td>Sample</td>
                      <td>Data</td>
                      <td>Here</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Example: Chart Placeholder */}
            {/* <div className="chart-container">
              <canvas ref={chartRef}></canvas>
            </div> */}
          </>
        ) : (
          <div className="widget-empty">
            <i className="icon-inbox"></i>
            <p>No data available</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="widget-footer">
        <small className="last-update">
          Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </small>
        
        {loading && data && (
          <span className="updating-indicator">
            <i className="icon-refresh spinning"></i> Updating...
          </span>
        )}
      </div>
    </div>
  );
};

export default WidgetName;
