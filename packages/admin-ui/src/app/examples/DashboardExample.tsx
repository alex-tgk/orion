import React, { useEffect } from 'react';
import {
  useWebSocket,
  useServiceHealth,
  useSystemEvents,
  useMetrics,
  useAlerts,
} from '../hooks';
import { SystemEventType, AlertSeverity } from '../types/websocket-events.types';

/**
 * Example Dashboard Component
 * Demonstrates how to use WebSocket hooks for real-time updates
 */
export function DashboardExample() {
  // Get authentication token (from your auth context/store)
  const token = localStorage.getItem('access_token'); // Or use your auth context

  // Initialize WebSocket connection
  const {
    socket,
    connectionState,
    isAuthenticated,
    error,
    reconnect,
  } = useWebSocket({
    url: process.env.REACT_APP_WS_URL || 'http://localhost:20001',
    namespace: '/admin',
    token: token || undefined,
    autoConnect: true,
    reconnectionAttempts: 5,
    onConnect: () => {
      console.log('Connected to WebSocket');
    },
    onDisconnect: () => {
      console.log('Disconnected from WebSocket');
    },
    onError: (wsError) => {
      console.error('WebSocket error:', wsError);
    },
  });

  // Subscribe to service health updates
  const {
    services,
    getService,
    isLoading: healthLoading,
    refresh: refreshHealth,
  } = useServiceHealth({
    socket,
    autoSubscribe: true, // Auto-subscribe to all services
  });

  // Subscribe to system events with filters
  const {
    events,
    latestEvent,
    isLoading: eventsLoading,
    getEventsByService,
    clearEvents,
  } = useSystemEvents({
    socket,
    autoSubscribe: true,
    maxEvents: 100,
    filters: {
      severities: ['warning', 'error', 'critical'], // Only show important events
    },
  });

  // Subscribe to metrics
  const {
    metrics,
    getMetrics,
    isLoading: metricsLoading,
  } = useMetrics({
    socket,
    autoSubscribe: true,
  });

  // Subscribe to alerts
  const {
    alerts,
    unresolvedAlerts,
    latestAlert,
    isLoading: alertsLoading,
    resolveAlert,
    getAlertsBySeverity,
  } = useAlerts({
    socket,
    autoSubscribe: true,
    filters: {
      resolved: false, // Only show unresolved alerts
    },
  });

  // Show notification when new alert arrives
  useEffect(() => {
    if (latestAlert) {
      // You can integrate with a toast/notification library here
      console.log('New alert:', latestAlert);
    }
  }, [latestAlert]);

  if (!isAuthenticated) {
    return (
      <div className="dashboard">
        <h1>Connecting to real-time updates...</h1>
        <p>Connection State: {connectionState}</p>
        {error && (
          <div className="error">
            <p>Error: {error.message}</p>
            <button onClick={reconnect}>Reconnect</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>ORION Admin Dashboard</h1>

      {/* Service Health Section */}
      <section className="service-health">
        <h2>Service Health</h2>
        {healthLoading ? (
          <p>Loading services...</p>
        ) : (
          <div className="services-grid">
            {Array.from(services.values()).map((service) => (
              <div key={service.serviceName} className={`service-card ${service.status}`}>
                <h3>{service.serviceName}</h3>
                <p>Status: {service.status}</p>
                <p>Port: {service.port}</p>
                <p>Uptime: {Math.floor(service.uptime / 60)} minutes</p>
                {service.responseTime && (
                  <p>Response Time: {service.responseTime}ms</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alerts Section */}
      <section className="alerts">
        <h2>Active Alerts ({unresolvedAlerts.length})</h2>
        <div className="alerts-list">
          {unresolvedAlerts.map((alert) => (
            <div key={alert.id} className={`alert alert-${alert.severity}`}>
              <div className="alert-header">
                <span className="alert-type">{alert.type}</span>
                <span className="alert-service">{alert.serviceName}</span>
              </div>
              <h4>{alert.title}</h4>
              <p>{alert.description}</p>
              <div className="alert-footer">
                <span>{new Date(alert.timestamp).toLocaleString()}</span>
                <button onClick={() => resolveAlert(alert.id)}>
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Events Section */}
      <section className="system-events">
        <h2>Recent Events</h2>
        <button onClick={clearEvents}>Clear Events</button>
        {eventsLoading ? (
          <p>Loading events...</p>
        ) : (
          <div className="events-list">
            {events.slice(0, 20).map((event) => (
              <div key={event.id} className={`event event-${event.severity}`}>
                <span className="event-time">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="event-service">{event.serviceName}</span>
                <span className="event-type">{event.type}</span>
                <span className="event-message">{event.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Metrics Section */}
      <section className="metrics">
        <h2>Service Metrics</h2>
        {metricsLoading ? (
          <p>Loading metrics...</p>
        ) : (
          <div className="metrics-grid">
            {Array.from(metrics.values()).map((serviceMetrics) => (
              <div key={serviceMetrics.serviceName} className="metrics-card">
                <h3>{serviceMetrics.serviceName}</h3>

                {/* You would integrate with a charting library here */}
                <div className="metric">
                  <h4>Requests/sec</h4>
                  <p>
                    {serviceMetrics.metrics.requestsPerSecond.slice(-1)[0]?.value || 0}
                  </p>
                </div>

                <div className="metric">
                  <h4>Error Rate</h4>
                  <p>
                    {(serviceMetrics.metrics.errorRate.slice(-1)[0]?.value || 0).toFixed(2)}%
                  </p>
                </div>

                <div className="metric">
                  <h4>Avg Response Time</h4>
                  <p>
                    {(serviceMetrics.metrics.averageResponseTime.slice(-1)[0]?.value || 0).toFixed(0)}ms
                  </p>
                </div>

                <div className="metric">
                  <h4>Active Connections</h4>
                  <p>
                    {serviceMetrics.metrics.activeConnections.slice(-1)[0]?.value || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Example: Subscribe to specific service health
 */
export function ServiceHealthExample() {
  const token = localStorage.getItem('access_token');

  const { socket, isAuthenticated } = useWebSocket({
    url: 'http://localhost:20001',
    token: token || undefined,
  });

  // Only subscribe to 'auth' service health
  const { getService } = useServiceHealth({
    socket,
    serviceName: 'auth',
    autoSubscribe: true,
  });

  const authService = getService('auth');

  if (!isAuthenticated) {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      <h2>Auth Service Status</h2>
      {authService ? (
        <div>
          <p>Status: {authService.status}</p>
          <p>Port: {authService.port}</p>
          <p>Uptime: {authService.uptime}s</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

/**
 * Example: Subscribe to specific event types
 */
export function SecurityEventsExample() {
  const token = localStorage.getItem('access_token');

  const { socket, isAuthenticated } = useWebSocket({
    url: 'http://localhost:20001',
    token: token || undefined,
  });

  // Only subscribe to authentication-related events
  const { events } = useSystemEvents({
    socket,
    autoSubscribe: true,
    filters: {
      types: [
        SystemEventType.AUTHENTICATION_SUCCESS,
        SystemEventType.AUTHENTICATION_FAILURE,
        SystemEventType.AUTHORIZATION_DENIED,
      ],
      severities: ['warning', 'error', 'critical'],
    },
  });

  if (!isAuthenticated) {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      <h2>Security Events</h2>
      <ul>
        {events.map((event) => (
          <li key={event.id}>
            {new Date(event.timestamp).toLocaleString()} - {event.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
