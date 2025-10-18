import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerOptions {
  title: string;
  description: string;
  version?: string;
  tags?: Array<{ name: string; description: string }>;
  servers?: Array<{ url: string; description: string }>;
}

/**
 * Configure Swagger/OpenAPI documentation for a service
 */
export function setupSwagger(
  app: INestApplication,
  serviceName: string,
  options: Partial<SwaggerOptions> = {},
): void {
  const logger = new Logger('SwaggerSetup');

  const port = process.env.PORT || '3000';

  const config = new DocumentBuilder()
    .setTitle(options.title || `ORION ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Service`)
    .setDescription(
      options.description ||
        `REST API for the ORION ${serviceName} microservice. Part of the ORION platform ecosystem.`,
    )
    .setVersion(options.version || '1.0.0')
    .addBearerAuth()
    .addServer(`http://localhost:${port}`, 'Development server')
    .addServer('https://api.orion.com', 'Production server')
    .setContact('ORION Team', 'https://github.com/orion/orion', 'support@orion.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT');

  // Add custom tags if provided
  if (options.tags) {
    options.tags.forEach((tag) => {
      config.addTag(tag.name, tag.description);
    });
  }

  // Add custom servers if provided
  if (options.servers) {
    options.servers.forEach((server) => {
      config.addServer(server.url, server.description);
    });
  }

  const document = SwaggerModule.createDocument(app, config.build());

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: `${serviceName} API Documentation`,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 2.5em; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true,
      deepLinking: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
    },
  });

  logger.log(`📚 Swagger API documentation available at: http://localhost:${port}/api/docs`);
}

/**
 * Get Swagger JSON document URL for a service
 */
export function getSwaggerJsonUrl(port: number): string {
  return `http://localhost:${port}/api/docs-json`;
}

/**
 * Get Swagger YAML document URL for a service
 */
export function getSwaggerYamlUrl(port: number): string {
  return `http://localhost:${port}/api/docs-yaml`;
}
