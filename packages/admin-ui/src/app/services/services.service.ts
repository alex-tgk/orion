import { Injectable, Logger } from '@nestjs/common';
import { ServiceDto, ServiceStatus, ServiceMetricsDto } from '../dto/service.dto';
import { HealthService } from './health.service';
import { PM2Service } from './pm2.service';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  // Map service names to their PM2 process names
  private readonly serviceToProcessMap: Record<string, string> = {
    auth: 'orion-auth',
    gateway: 'orion-gateway',
    'ai-wrapper': 'orion-ai-wrapper',
    notifications: 'orion-notifications',
    analytics: 'orion-analytics',
    'admin-ui': 'orion-admin-ui',
  };

  constructor(
    private readonly healthService: HealthService,
    private readonly pm2Service: PM2Service,
  ) {}

  async getAllServices(): Promise<ServiceDto[]> {
    const services: ServiceDto[] = [
      {
        id: 'auth',
        name: 'Authentication Service',
        version: '1.0.0',
        port: 3001,
        url: 'http://localhost:3001',
        status: ServiceStatus.UNKNOWN,
      },
      {
        id: 'gateway',
        name: 'API Gateway',
        version: '1.0.0',
        port: 3100,
        url: 'http://localhost:3100',
        status: ServiceStatus.UNKNOWN,
      },
      {
        id: 'ai-wrapper',
        name: 'AI Interface Wrapper',
        version: '1.0.0',
        port: 3200,
        url: 'http://localhost:3200',
        status: ServiceStatus.UNKNOWN,
      },
      {
        id: 'notifications',
        name: 'Notifications Service',
        version: '1.0.0',
        port: 3002,
        url: 'http://localhost:3002',
        status: ServiceStatus.UNKNOWN,
      },
      {
        id: 'analytics',
        name: 'Analytics Service',
        version: '1.0.0',
        port: 3003,
        url: 'http://localhost:3003',
        status: ServiceStatus.UNKNOWN,
      },
      {
        id: 'admin-ui',
        name: 'Admin Dashboard',
        version: '1.0.0',
        port: 3004,
        url: 'http://localhost:3004',
        status: ServiceStatus.ONLINE, // This service
      },
    ];

    // Enrich with health data
    await Promise.all(
      services.map(async (service) => {
        try {
          const health = await this.healthService.checkServiceHealth(service.id);
          service.status = this.mapHealthStatusToServiceStatus(health.status);
          service.health = health;

          // Get PM2 metrics
          const processName = this.serviceToProcessMap[service.id];
          if (processName) {
            const metrics = await this.getServiceMetrics(processName);
            service.metrics = metrics;

            // Get PM2 ID
            const pm2List = await this.pm2Service.listProcesses();
            const process = pm2List.processes.find((p) => p.name === processName);
            if (process) {
              service.pm2Id = process.pm_id;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to get health for ${service.id}: ${error.message}`);
          service.status = ServiceStatus.OFFLINE;
        }
      }),
    );

    return services;
  }

  async getService(id: string): Promise<ServiceDto> {
    const services = await this.getAllServices();
    const service = services.find((s) => s.id === id);

    if (!service) {
      throw new Error(`Service with ID ${id} not found`);
    }

    return service;
  }

  async getServiceMetrics(processName: string): Promise<ServiceMetricsDto | undefined> {
    try {
      const pm2List = await this.pm2Service.listProcesses();
      const process = pm2List.processes.find((p) => p.name === processName);

      if (!process) {
        return undefined;
      }

      return {
        cpu: process.monit.cpu,
        memory: Math.round(process.monit.memory / 1024 / 1024), // Convert to MB
        uptime: Math.round(process.uptime / 1000), // Convert to seconds
      };
    } catch (error) {
      this.logger.error(`Failed to get metrics for ${processName}: ${error.message}`);
      return undefined;
    }
  }

  async restartService(id: string): Promise<{ success: boolean; message: string }> {
    const service = await this.getService(id);

    if (!service.pm2Id) {
      return {
        success: false,
        message: 'Service does not have a PM2 process ID',
      };
    }

    const result = await this.pm2Service.restartProcess(service.pm2Id);
    this.logger.log(`Restart service ${id} (PM2 ID: ${service.pm2Id}): ${result.message}`);

    return result;
  }

  async stopService(id: string): Promise<{ success: boolean; message: string }> {
    const service = await this.getService(id);

    if (!service.pm2Id) {
      return {
        success: false,
        message: 'Service does not have a PM2 process ID',
      };
    }

    const result = await this.pm2Service.stopProcess(service.pm2Id);
    this.logger.log(`Stop service ${id} (PM2 ID: ${service.pm2Id}): ${result.message}`);

    return result;
  }

  async startService(id: string): Promise<{ success: boolean; message: string }> {
    const service = await this.getService(id);

    if (!service.pm2Id) {
      return {
        success: false,
        message: 'Service does not have a PM2 process ID',
      };
    }

    const result = await this.pm2Service.startProcess(service.pm2Id);
    this.logger.log(`Start service ${id} (PM2 ID: ${service.pm2Id}): ${result.message}`);

    return result;
  }

  private mapHealthStatusToServiceStatus(healthStatus: string): ServiceStatus {
    switch (healthStatus) {
      case 'healthy':
        return ServiceStatus.ONLINE;
      case 'degraded':
        return ServiceStatus.DEGRADED;
      case 'unhealthy':
        return ServiceStatus.OFFLINE;
      default:
        return ServiceStatus.UNKNOWN;
    }
  }
}
