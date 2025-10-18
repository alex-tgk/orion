import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import * as net from 'net';

export interface ServiceRegistration {
  serviceName: string;
  port: number;
  host: string;
  pid: number;
  startedAt: string;
  healthEndpoint: string;
}

@Injectable()
export class PortRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PortRegistryService.name);
  private redis: Redis | null = null;
  private isRedisAvailable: boolean = false;
  private readonly PORT_RANGE_START = 20000;
  private readonly PORT_RANGE_END = 29999;
  private readonly REGISTRY_KEY = 'orion:service-registry';
  private readonly PORT_LOCK_PREFIX = 'orion:port-lock:';
  private currentServicePort: number | null = null;

  async onModuleInit() {
    await this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redis = new Redis({
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
        password: process.env['REDIS_PASSWORD'],
        db: parseInt(process.env['REDIS_DB'] || '0', 10),
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.redis.on('connect', () => {
        this.isRedisAvailable = true;
        this.logger.log('Port Registry connected to Redis');
      });

      this.redis.on('error', (err) => {
        this.isRedisAvailable = false;
        this.logger.error(`Redis error: ${err.message}`);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize Redis: ${message}`);
    }
  }

  /**
   * Check if a port is actually available on the system
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  /**
   * Allocate a port for a service with conflict detection
   */
  async allocatePort(serviceName: string): Promise<number> {
    // If Redis is not available, fall back to environment variable or range start
    if (!this.redis || !this.isRedisAvailable) {
      const envPort = parseInt(process.env['PORT'] || '0', 10);
      if (envPort > 0 && (await this.isPortAvailable(envPort))) {
        this.logger.warn(
          `Redis unavailable, using PORT env var: ${envPort} for ${serviceName}`,
        );
        return envPort;
      }

      // Find first available port in range
      for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
        if (await this.isPortAvailable(port)) {
          this.logger.warn(
            `Redis unavailable, allocated first available port: ${port} for ${serviceName}`,
          );
          return port;
        }
      }

      throw new Error('No available ports in range');
    }

    // Check if service already has a registered port
    const existingPort = await this.getServicePort(serviceName);
    if (existingPort && (await this.isPortAvailable(existingPort))) {
      this.logger.log(`Reusing existing port ${existingPort} for ${serviceName}`);
      this.currentServicePort = existingPort;
      return existingPort;
    }

    // Allocate new port with distributed lock
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      // Try to acquire lock
      const lockKey = `${this.PORT_LOCK_PREFIX}${port}`;
      const locked = await this.redis.set(lockKey, serviceName, 'EX', 30, 'NX');

      if (locked) {
        // Check if port is actually available
        if (await this.isPortAvailable(port)) {
          this.currentServicePort = port;
          this.logger.log(`Allocated port ${port} for ${serviceName}`);
          return port;
        } else {
          // Port is in use, release lock
          await this.redis.del(lockKey);
        }
      }
    }

    throw new Error(`No available ports in range ${this.PORT_RANGE_START}-${this.PORT_RANGE_END}`);
  }

  /**
   * Register a service in the registry
   */
  async registerService(
    serviceName: string,
    port: number,
    host: string = 'localhost',
  ): Promise<void> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn(`Redis unavailable, cannot register ${serviceName}`);
      return;
    }

    const registration: ServiceRegistration = {
      serviceName,
      port,
      host,
      pid: process.pid,
      startedAt: new Date().toISOString(),
      healthEndpoint: `http://${host}:${port}/api/health`,
    };

    try {
      await this.redis.hset(
        this.REGISTRY_KEY,
        serviceName,
        JSON.stringify(registration),
      );

      // Set TTL to auto-cleanup if service crashes
      await this.redis.expire(this.REGISTRY_KEY, 3600); // 1 hour

      this.logger.log(`Registered ${serviceName} at ${host}:${port}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register service: ${message}`);
    }
  }

  /**
   * Get the port for a specific service
   */
  async getServicePort(serviceName: string): Promise<number | null> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, cannot lookup service port');
      return null;
    }

    try {
      const data = await this.redis.hget(this.REGISTRY_KEY, serviceName);
      if (!data) {
        return null;
      }

      const registration: ServiceRegistration = JSON.parse(data);
      return registration.port;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get service port: ${message}`);
      return null;
    }
  }

  /**
   * Get full service registration info
   */
  async getServiceInfo(
    serviceName: string,
  ): Promise<ServiceRegistration | null> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, cannot lookup service info');
      return null;
    }

    try {
      const data = await this.redis.hget(this.REGISTRY_KEY, serviceName);
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get service info: ${message}`);
      return null;
    }
  }

  /**
   * List all registered services
   */
  async listServices(): Promise<ServiceRegistration[]> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn('Redis unavailable, cannot list services');
      return [];
    }

    try {
      const data = await this.redis.hgetall(this.REGISTRY_KEY);
      return Object.values(data).map((json) => JSON.parse(json));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to list services: ${message}`);
      return [];
    }
  }

  /**
   * Unregister a service from the registry
   */
  async unregisterService(serviceName: string): Promise<void> {
    if (!this.redis || !this.isRedisAvailable) {
      this.logger.warn(`Redis unavailable, cannot unregister ${serviceName}`);
      return;
    }

    try {
      const info = await this.getServiceInfo(serviceName);
      if (info && info.port) {
        // Release port lock
        await this.redis.del(`${this.PORT_LOCK_PREFIX}${info.port}`);
      }

      await this.redis.hdel(this.REGISTRY_KEY, serviceName);
      this.logger.log(`Unregistered ${serviceName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to unregister service: ${message}`);
    }
  }

  /**
   * Heartbeat to keep service registration alive
   */
  async heartbeat(serviceName: string): Promise<void> {
    if (!this.redis || !this.isRedisAvailable) {
      return;
    }

    try {
      const exists = await this.redis.hexists(this.REGISTRY_KEY, serviceName);
      if (exists) {
        await this.redis.expire(this.REGISTRY_KEY, 3600);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Heartbeat failed: ${message}`);
    }
  }

  /**
   * Get the current service's allocated port
   */
  getCurrentPort(): number | null {
    return this.currentServicePort;
  }

  /**
   * Build a service URL from service name
   */
  async getServiceUrl(serviceName: string): Promise<string | null> {
    const info = await this.getServiceInfo(serviceName);
    if (!info) {
      return null;
    }

    return `http://${info.host}:${info.port}`;
  }
}
