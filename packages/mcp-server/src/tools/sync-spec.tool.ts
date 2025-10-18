/**
 * Sync Spec Tool
 *
 * Synchronizes GitHub Spec Kit specifications with actual implementation.
 * Compares spec definitions with code and reports discrepancies.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'fs';
import * as path from 'path';
import type { SpecSyncResult, ServiceSpec } from './types';

/**
 * Parse spec file
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
      } else if (trimmed.startsWith('**Dependencies:**')) {
        const depsStr = trimmed.replace('**Dependencies:**', '').trim();
        spec.dependencies = depsStr
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d && d !== 'None');
      }
    }

    return spec as ServiceSpec;
  } catch (error) {
    return null;
  }
}

/**
 * Check if service implementation exists
 */
function checkImplementation(
  serviceName: string,
  workspaceRoot: string
): { exists: boolean; files: string[] } {
  const servicePath = path.join(workspaceRoot, `packages/${serviceName}`);
  const files: string[] = [];

  if (!fs.existsSync(servicePath)) {
    return { exists: false, files };
  }

  // Check for expected files
  const expectedFiles = [
    'src/main.ts',
    'src/app/app.module.ts',
    'src/app/app.controller.ts',
    'src/app/app.service.ts',
    'project.json',
    'tsconfig.json',
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(servicePath, file);
    if (fs.existsSync(filePath)) {
      files.push(file);
    }
  }

  return { exists: true, files };
}

/**
 * Check port configuration in implementation
 */
function checkPortConfig(
  serviceName: string,
  expectedPort: number,
  workspaceRoot: string
): { matches: boolean; actualPort?: number } {
  const mainTsPath = path.join(
    workspaceRoot,
    `packages/${serviceName}/src/main.ts`
  );

  if (!fs.existsSync(mainTsPath)) {
    return { matches: false };
  }

  try {
    const content = fs.readFileSync(mainTsPath, 'utf-8');

    // Look for port configuration
    const portMatch = content.match(/port:\s*(\d+)/);
    if (portMatch) {
      const actualPort = parseInt(portMatch[1], 10);
      return {
        matches: actualPort === expectedPort,
        actualPort,
      };
    }

    // Check for environment variable
    if (content.includes('PORT') || content.includes('process.env.PORT')) {
      const envPath = path.join(workspaceRoot, `packages/${serviceName}/.env`);
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const envPortMatch = envContent.match(/PORT=(\d+)/);
        if (envPortMatch) {
          const actualPort = parseInt(envPortMatch[1], 10);
          return {
            matches: actualPort === expectedPort,
            actualPort,
          };
        }
      }
    }

    return { matches: false };
  } catch (error) {
    return { matches: false };
  }
}

/**
 * Sync spec with implementation
 */
function syncSpec(
  spec: ServiceSpec,
  workspaceRoot: string
): SpecSyncResult {
  const result: SpecSyncResult = {
    synced: false,
    service: spec.name,
    changes: {
      added: [],
      modified: [],
      removed: [],
    },
    message: '',
  };

  // Check if implementation exists
  const impl = checkImplementation(spec.name, workspaceRoot);

  if (!impl.exists) {
    result.message = `Implementation for ${spec.name} does not exist. Use generate_service_from_spec to create it.`;
    result.changes.added.push(`packages/${spec.name}`);
    return result;
  }

  // Check port configuration
  if (spec.port) {
    const portCheck = checkPortConfig(spec.name, spec.port, workspaceRoot);

    if (!portCheck.matches) {
      result.changes.modified.push(
        `Port mismatch: spec defines ${spec.port}${portCheck.actualPort ? `, implementation uses ${portCheck.actualPort}` : ''}`
      );
    }
  }

  // Check for missing files
  const expectedFiles = [
    'src/main.ts',
    'src/app/app.module.ts',
    'src/app/app.controller.ts',
    'src/app/app.service.ts',
    'project.json',
    'tsconfig.json',
  ];

  for (const file of expectedFiles) {
    if (!impl.files.includes(file)) {
      result.changes.added.push(file);
    }
  }

  // Determine sync status
  const totalChanges =
    result.changes.added.length +
    result.changes.modified.length +
    result.changes.removed.length;

  result.synced = totalChanges === 0;
  result.message = result.synced
    ? `${spec.name} is in sync with its specification`
    : `${spec.name} has ${totalChanges} discrepancy(ies) with its specification`;

  return result;
}

/**
 * Register the sync-spec tool with MCP server
 */
export function registerSyncSpecTool(server: McpServer): void {
  server.tool(
    'sync_spec',
    'Synchronize GitHub Spec Kit specification with actual implementation',
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
          synced: false,
          service: '',
          changes: { added: [], modified: [], removed: [] },
          message: `Spec file not found: ${specPath}`,
        };
      }

      // Parse spec
      const spec = parseSpecFile(fullPath);

      if (!spec || !spec.name) {
        return {
          synced: false,
          service: '',
          changes: { added: [], modified: [], removed: [] },
          message: 'Failed to parse spec file',
        };
      }

      // Sync spec with implementation
      const result = syncSpec(spec, workspaceRoot);

      return result;
    }
  );
}
