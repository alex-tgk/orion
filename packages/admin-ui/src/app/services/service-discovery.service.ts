import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PortRegistryService } from '@orion/shared';

export interface ServiceInfo {
  name: string;
  url: string;
  port: number;
  status: 'online' | 'offline' | 'unknown';
  lastCheck?: Date;
  metadata?: Record<string, any>;
}

/**
 * Service Discovery Service
 *
 * Discovers and tracks all ORION microservices using the PortRegistry.
 */
@Injectable()
export class ServiceDiscoveryService {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private services: Map<string, ServiceInfo> = new Map();
  private discoveryInterval: NodeJS.Timer | null = null;

  constructor(
    private readonly portRegistry: PortRegistryService,
    private readonly configService: ConfigService,
  ) {
    this.startDiscovery();
  }

  /**
   * Start automatic service discovery
   */
  private startDiscovery() {
    // Initial discovery
    this.discoverServices();

    // Periodic discovery
    const interval = this.configService.get<number>('adminUi.monitoring.healthCheckInterval', 30000);
    this.discoveryInterval = setInterval(() => {
      this.discoverServices();
    }, interval);
  }

  /**
   * Discover all registered services
   */
  private async discoverServices() {
    try {
      const registeredServices = await this.portRegistry.getAllServices();

      for (const [name, info] of registeredServices) {
        const serviceInfo: ServiceInfo = {
          name,
          url: `http://localhost:${info.port}`,
          port: info.port,
          status: 'unknown',
          lastCheck: new Date(),
          metadata: info.metadata,
        };

        this.services.set(name, serviceInfo);
      }

      this.logger.log(`Discovered ${this.services.size} services`);
    } catch (error) {
      this.logger.error('Service discovery failed', error);
    }
  }

  /**
   * Get all discovered services
   */
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * Get a specific service by name
   */
  getService(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  /**
   * Get services by status
   */
  getServicesByStatus(status: 'online' | 'offline' | 'unknown'): ServiceInfo[] {
    return this.getAllServices().filter(service => service.status === status);
  }

  /**
   * Update service status
   */
  updateServiceStatus(name: string, status: 'online' | 'offline' | 'unknown') {
    const service = this.services.get(name);
    if (service) {
      service.status = status;
      service.lastCheck = new Date();
      this.services.set(name, service);
    }
  }

  /**
   * Register a new service manually
   */
  registerService(serviceInfo: ServiceInfo) {
    this.services.set(serviceInfo.name, serviceInfo);
    this.logger.log(`Manually registered service: ${serviceInfo.name}`);
  }

  /**
   * Unregister a service
   */
  unregisterService(name: string) {
    const deleted = this.services.delete(name);
    if (deleted) {
      this.logger.log(`Unregistered service: ${name}`);
    }
  }

  /**
   * Clean up on module destroy
   */
  onModuleDestroy() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
  }
}