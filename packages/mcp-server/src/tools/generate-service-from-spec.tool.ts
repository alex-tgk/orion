/**
 * Generate Service from Spec Tool
 *
 * Generates a new NestJS microservice from a GitHub Spec Kit specification.
 * Creates the service structure, configuration files, and boilerplate code.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ServiceGenerationResult, ServiceSpec } from './types';

/**
 * Parse spec file to extract service details
 */
function parseSpecFile(filePath: string): ServiceSpec | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const spec: Partial<ServiceSpec> = {
      dependencies: [],
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('**Name:**')) {
        spec.name = trimmed.replace('**Name:**', '').trim().replace(/`/g, '');
      } else if (trimmed.startsWith('**Version:**')) {
        spec.version = trimmed.replace('**Version:**', '').trim();
      } else if (trimmed.startsWith('**Port:**') || trimmed.startsWith('- **Port:**')) {
        const portStr = trimmed.replace(/\*\*Port:\*\*/g, '').trim().replace(/`/g, '');
        const port = parseInt(portStr, 10);
        if (!isNaN(port)) {
          spec.port = port;
        }
      }
    }

    return spec as ServiceSpec;
  } catch (error) {
    return null;
  }
}

/**
 * Generate NestJS service using Nx generator
 */
function generateService(
  serviceName: string,
  port: number,
  workspaceRoot: string
): ServiceGenerationResult {
  const result: ServiceGenerationResult = {
    success: false,
    serviceName,
    generatedFiles: [],
    errors: [],
    message: '',
  };

  try {
    // Generate NestJS application using Nx
    const generateCmd = `npx nx generate @nx/nest:application ${serviceName} --directory=packages/${serviceName} --no-interactive`;

    execSync(generateCmd, {
      cwd: workspaceRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    result.generatedFiles.push(
      `packages/${serviceName}/src/main.ts`,
      `packages/${serviceName}/src/app/app.module.ts`,
      `packages/${serviceName}/src/app/app.controller.ts`,
      `packages/${serviceName}/src/app/app.service.ts`,
      `packages/${serviceName}/project.json`,
      `packages/${serviceName}/tsconfig.json`
    );

    // Update main.ts with proper port configuration
    const mainTsPath = path.join(
      workspaceRoot,
      `packages/${serviceName}/src/main.ts`
    );

    const mainTsContent = `import { bootstrapService } from '@orion/shared';
import { AppModule } from './app/app.module';

async function bootstrap() {
  await bootstrapService({
    serviceName: '${serviceName}',
    AppModule,
    port: ${port},
  });
}

bootstrap();
`;

    fs.writeFileSync(mainTsPath, mainTsContent, 'utf-8');

    // Create .env file
    const envPath = path.join(workspaceRoot, `packages/${serviceName}/.env`);
    const envContent = `PORT=${port}
DATABASE_URL=postgresql://orion:orion_dev@localhost:5432/orion_dev
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://orion:orion_dev@localhost:5672
NODE_ENV=development
`;

    fs.writeFileSync(envPath, envContent, 'utf-8');
    result.generatedFiles.push(`packages/${serviceName}/.env`);

    // Create README
    const readmePath = path.join(
      workspaceRoot,
      `packages/${serviceName}/README.md`
    );
    const readmeContent = `# ${serviceName}

Generated from GitHub Spec Kit specification.

## Port

${port}

## Development

\`\`\`bash
# Start the service
pnpm nx serve ${serviceName}

# Run tests
pnpm nx test ${serviceName}

# Build
pnpm nx build ${serviceName}
\`\`\`

## Health Check

\`\`\`bash
curl http://localhost:${port}/health
\`\`\`
`;

    fs.writeFileSync(readmePath, readmeContent, 'utf-8');
    result.generatedFiles.push(`packages/${serviceName}/README.md`);

    result.success = true;
    result.message = `Successfully generated ${serviceName} on port ${port}`;
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error'
    );
    result.message = `Failed to generate ${serviceName}`;
  }

  return result;
}

/**
 * Register the generate-service-from-spec tool with MCP server
 */
export function registerGenerateServiceFromSpecTool(server: McpServer): void {
  server.tool(
    'generate_service_from_spec',
    'Generate a new NestJS microservice from a GitHub Spec Kit specification',
    {
      specPath: {
        type: 'string',
        description: 'Path to the service specification file',
      },
    },
    async ({ specPath }) => {
      const workspaceRoot = process.env.NX_WORKSPACE_ROOT || process.cwd();
      const fullPath = path.isAbsolute(specPath as string)
        ? (specPath as string)
        : path.join(workspaceRoot, specPath as string);

      // Check if spec file exists
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          serviceName: '',
          generatedFiles: [],
          errors: [`Spec file not found: ${specPath}`],
          message: 'Spec file not found',
        };
      }

      // Parse spec
      const spec = parseSpecFile(fullPath);

      if (!spec || !spec.name || !spec.port) {
        return {
          success: false,
          serviceName: '',
          generatedFiles: [],
          errors: ['Invalid spec: missing name or port'],
          message: 'Failed to parse spec file',
        };
      }

      // Check if service already exists
      const servicePath = path.join(workspaceRoot, `packages/${spec.name}`);
      if (fs.existsSync(servicePath)) {
        return {
          success: false,
          serviceName: spec.name,
          generatedFiles: [],
          errors: [`Service ${spec.name} already exists`],
          message: 'Service already exists',
        };
      }

      // Generate service
      const result = generateService(spec.name, spec.port, workspaceRoot);

      return result;
    }
  );
}
