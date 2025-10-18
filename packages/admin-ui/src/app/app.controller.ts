import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  private logs: any[] = [];
  private interactions: any[] = [];

  constructor() {
    // Simulate some initial logs and interactions
    this.generateSimulatedActivity();

    // Generate new activity periodically
    setInterval(() => this.generateRandomLog(), 3000);
    setInterval(() => this.generateRandomInteraction(), 5000);
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'admin-ui',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  root() {
    return {
      service: 'ORION Admin UI',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        services: '/api/services',
        metrics: '/api/metrics',
        logs: '/api/logs',
        interactions: '/api/interactions',
      },
    };
  }

  @Get('services')
  getServices() {
    return {
      services: [
        { name: 'auth', port: 20001, status: 'healthy' },
        { name: 'gateway', port: 20002, status: 'healthy' },
        { name: 'admin-ui', port: 20003, status: 'healthy' },
        { name: 'cache', port: 20004, status: 'healthy' },
        { name: 'orchestrator', port: 20005, status: 'healthy' },
        { name: 'scheduler', port: 20006, status: 'warning' },
        { name: 'notifications', port: 20007, status: 'healthy' },
      ],
    };
  }

  @Get('metrics')
  getMetrics() {
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      requests: Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('logs')
  getLogs() {
    // Return last 50 logs
    return {
      logs: this.logs.slice(-50),
      total: this.logs.length,
    };
  }

  @Get('interactions')
  getInteractions() {
    // Return last 20 interactions
    return {
      interactions: this.interactions.slice(-20),
      total: this.interactions.length,
    };
  }

  private generateSimulatedActivity() {
    const services = ['auth', 'gateway', 'admin-ui', 'cache', 'orchestrator', 'scheduler', 'notifications'];
    const levels = ['info', 'warn', 'error', 'debug'];
    const actions = ['started', 'processing request', 'completed request', 'cache hit', 'cache miss', 'authenticated user', 'scheduled task'];

    // Generate some initial logs
    for (let i = 0; i < 10; i++) {
      this.logs.push({
        timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
        service: services[Math.floor(Math.random() * services.length)],
        level: levels[Math.floor(Math.random() * levels.length)],
        message: actions[Math.floor(Math.random() * actions.length)],
        metadata: {
          duration: Math.floor(Math.random() * 1000) + 'ms',
          requestId: Math.random().toString(36).substring(7),
        },
      });
    }

    // Generate some initial interactions
    for (let i = 0; i < 5; i++) {
      const from = services[Math.floor(Math.random() * services.length)];
      let to = services[Math.floor(Math.random() * services.length)];
      while (to === from) {
        to = services[Math.floor(Math.random() * services.length)];
      }

      this.interactions.push({
        timestamp: new Date(Date.now() - Math.random() * 30000).toISOString(),
        from,
        to,
        type: ['HTTP', 'gRPC', 'WebSocket', 'Event'][Math.floor(Math.random() * 4)],
        method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        status: Math.random() > 0.1 ? 'success' : 'error',
        duration: Math.floor(Math.random() * 200) + 10,
      });
    }
  }

  private generateRandomLog() {
    const services = ['auth', 'gateway', 'admin-ui', 'cache', 'orchestrator', 'scheduler', 'notifications'];
    const levels = ['info', 'warn', 'error', 'debug'];
    const messages = [
      'Request processed successfully',
      'Cache hit for key',
      'User authenticated',
      'Task scheduled',
      'Database connection established',
      'WebSocket connection opened',
      'Rate limit exceeded',
      'Service health check passed',
      'Configuration reloaded',
      'Metrics collected',
    ];

    this.logs.push({
      timestamp: new Date().toISOString(),
      service: services[Math.floor(Math.random() * services.length)],
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      metadata: {
        duration: Math.floor(Math.random() * 1000) + 'ms',
        requestId: Math.random().toString(36).substring(7),
      },
    });

    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  private generateRandomInteraction() {
    const services = ['auth', 'gateway', 'admin-ui', 'cache', 'orchestrator', 'scheduler', 'notifications'];
    const from = services[Math.floor(Math.random() * services.length)];
    let to = services[Math.floor(Math.random() * services.length)];
    while (to === from) {
      to = services[Math.floor(Math.random() * services.length)];
    }

    this.interactions.push({
      timestamp: new Date().toISOString(),
      from,
      to,
      type: ['HTTP', 'gRPC', 'WebSocket', 'Event'][Math.floor(Math.random() * 4)],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PUBLISH', 'SUBSCRIBE'][Math.floor(Math.random() * 6)],
      status: Math.random() > 0.15 ? 'success' : 'error',
      duration: Math.floor(Math.random() * 200) + 10,
      endpoint: ['/api/users', '/api/auth', '/api/data', '/api/config', '/api/health'][Math.floor(Math.random() * 5)],
    });
~
    // Keep only last 50 interactions
    if (this.interactions.length > 50) {
      this.interactions = this.interactions.slice(-50);
    }
  }
}
