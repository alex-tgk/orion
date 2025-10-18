import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PortRegistryService } from './port-registry.service';
import { setupSwagger, SwaggerOptions } from './swagger-helper';

// Store heartbeat intervals for cleanup
const heartbeatIntervals = new WeakMap<INestApplication, NodeJS.Timeout>();

export interface BootstrapOptions {
  serviceName: string;
  AppModule: any;
  corsOrigin?: string;
  globalPrefix?: string;
  enableShutdownHooks?: boolean;
  swagger?: Partial<SwaggerOptions> | boolean;
}

/**
 * Bootstrap a NestJS application with automatic port allocation and service registration
 */
export async function bootstrapService(
  options: BootstrapOptions,
): Promise<INestApplication> {
  const {
    serviceName,
    AppModule,
    corsOrigin = process.env['CORS_ORIGIN'] || 'http://localhost:4200',
    globalPrefix = 'api',
    enableShutdownHooks = true,
    swagger = true,
  } = options;

  const logger = new Logger('Bootstrap');

  // Create application
  const app = await NestFactory.create(AppModule);

  // Get port registry service
  const portRegistry = app.get(PortRegistryService);

  // Allocate port
  let port: number;
  try {
    port = await portRegistry.allocatePort(serviceName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to allocate port: ${message}`);
    throw error;
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix(globalPrefix);

  // Setup Swagger documentation
  if (swagger) {
    const swaggerOptions = typeof swagger === 'object' ? swagger : {};
    setupSwagger(app, serviceName, swaggerOptions);
  }

  // Enable graceful shutdown
  if (enableShutdownHooks) {
    app.enableShutdownHooks();

    // Register service and setup cleanup
    await portRegistry.registerService(serviceName, port);

    // Cleanup on shutdown
    const cleanup = async () => {
      logger.log(`Shutting down ${serviceName}...`);
      await portRegistry.unregisterService(serviceName);
      await app.close();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('beforeExit', async () => {
      await portRegistry.unregisterService(serviceName);
    });

    // Start heartbeat
    const heartbeatInterval = setInterval(async () => {
      await portRegistry.heartbeat(serviceName);
    }, 30000); // Every 30 seconds

    // Store heartbeat interval for cleanup
    heartbeatIntervals.set(app, heartbeatInterval);
  }

  // Start listening
  await app.listen(port);

  logger.log(`🚀 ${serviceName} service is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📊 Health check: http://localhost:${port}/${globalPrefix}/health`);
  logger.log(`🔌 Port: ${port} (allocated from range 20000-29999)`);

  return app;
}

/**
 * Stop a service and cleanup resources
 */
export async function shutdownService(app: INestApplication): Promise<void> {
  const logger = new Logger('Shutdown');

  try {
    // Clear heartbeat
    const heartbeatInterval = heartbeatIntervals.get(app);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatIntervals.delete(app);
    }

    // Unregister from registry
    const portRegistry = app.get(PortRegistryService);
    const port = portRegistry.getCurrentPort();
    if (port) {
      const services = await portRegistry.listServices();
      const service = services.find((s) => s.port === port);
      if (service) {
        await portRegistry.unregisterService(service.serviceName);
      }
    }

    await app.close();
    logger.log('Service shut down successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error during shutdown: ${message}`);
    throw error;
  }
}
