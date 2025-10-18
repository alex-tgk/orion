import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'admin-ui',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  getSystemStatus() {
    return {
      status: 'healthy',
      uptime: Date.now() - process.uptime() * 1000,
      services: [
        { name: 'Auth Service', status: 'running' },
        { name: 'API Gateway', status: 'running' },
        { name: 'Orchestrator', status: 'running' },
        { name: 'Analytics', status: 'running' },
        { name: 'Notifications', status: 'running' },
        { name: 'Scheduler', status: 'running' },
        { name: 'Storage', status: 'running' },
        { name: 'Search', status: 'running' },
      ],
    };
  }

  getServices() {
    const now = Date.now();
    return [
      {
        id: 'auth',
        name: 'Auth Service',
        status: 'running',
        uptime: now - 48 * 60 * 60 * 1000,
        health: 'healthy',
        lastCheck: new Date(),
        version: '1.2.0',
        url: '/api/auth/health',
      },
      {
        id: 'gateway',
        name: 'API Gateway',
        status: 'running',
        uptime: now - 72 * 60 * 60 * 1000,
        health: 'healthy',
        lastCheck: new Date(),
        version: '1.0.0',
        url: '/api/gateway/health',
      },
      {
        id: 'orchestrator',
        name: 'Orchestrator',
        status: 'running',
        uptime: now - 36 * 60 * 60 * 1000,
        health: 'healthy',
        lastCheck: new Date(),
        version: '1.1.0',
        url: '/api/orchestrator/health',
      },
      {
        id: 'analytics',
        name: 'Analytics Service',
        status: 'running',
        uptime: now - 24 * 60 * 60 * 1000,
        health: 'healthy',
        lastCheck: new Date(),
        version: '1.0.5',
        url: '/api/analytics/health',
      },
      {
        id: 'notifications',
        name: 'Notifications',
        status: 'running',
        uptime: now - 12 * 60 * 60 * 1000,
        health: 'degraded',
        lastCheck: new Date(),
        version: '0.9.0',
      },
      {
        id: 'scheduler',
        name: 'Scheduler',
        status: 'running',
        uptime: now - 96 * 60 * 60 * 1000,
        health: 'healthy',
        lastCheck: new Date(),
        version: '1.0.2',
      },
      {
        id: 'storage',
        name: 'Storage Service',
        status: 'running',
        uptime: now - 120 * 60 * 60 * 1000,
        health: 'healthy',
        lastCheck: new Date(),
        version: '2.0.0',
      },
      {
        id: 'search',
        name: 'Search Engine',
        status: 'running',
        uptime: now - 6 * 60 * 60 * 1000,
        health: 'healthy',
        lastCheck: new Date(),
        version: '1.5.0',
      },
    ];
  }

  getRecentActivity(limit = 10) {
    const now = Date.now();
    const activities = [
      {
        id: '1',
        timestamp: new Date(now - 5 * 60 * 1000),
        type: 'success',
        message: 'User authentication successful',
        user: 'admin@orion.io',
      },
      {
        id: '2',
        timestamp: new Date(now - 15 * 60 * 1000),
        type: 'info',
        message: 'System backup completed',
      },
      {
        id: '3',
        timestamp: new Date(now - 30 * 60 * 1000),
        type: 'warning',
        message: 'High memory usage detected',
      },
      {
        id: '4',
        timestamp: new Date(now - 45 * 60 * 1000),
        type: 'info',
        message: 'Scheduled task executed',
      },
      {
        id: '5',
        timestamp: new Date(now - 60 * 60 * 1000),
        type: 'success',
        message: 'Database optimization completed',
      },
      {
        id: '6',
        timestamp: new Date(now - 90 * 60 * 1000),
        type: 'error',
        message: 'Failed to connect to external API',
      },
      {
        id: '7',
        timestamp: new Date(now - 120 * 60 * 1000),
        type: 'info',
        message: 'Cache cleared successfully',
      },
    ];

    return activities.slice(0, limit);
  }

  getStats() {
    return {
      totalUsers: 1247,
      activeServices: 8,
      requestsToday: 45623,
      avgResponseTime: 145,
    };
  }
}
