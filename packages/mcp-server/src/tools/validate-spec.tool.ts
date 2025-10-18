/**
 * Validate Spec Tool
 *
 * Validates GitHub Spec Kit service specifications against ORION requirements.
 * Checks for required fields, format compliance, and integration readiness.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import * as fs from 'fs';
import * as path from 'path';
import type { SpecValidationResult, ServiceSpec } from './types';

const REQUIRED_FIELDS = [
  'name',
  'version',
  'status',
  'owner',
  'dependencies',
];

const OPTIONAL_FIELDS = [
  'port',
  'baseUrl',
  'type',
];

/**
 * Parse markdown spec file and extract metadata
 */
function parseSpecFile(filePath: string): ServiceSpec | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const spec: Partial<ServiceSpec> = {
      dependencies: [],
    };

    // Extract metadata from spec file
    for (const line of lines) {
      const trimmed = line.trim();

      // Parse key-value pairs from markdown
      if (trimmed.startsWith('**Name:**')) {
        spec.name = trimmed.replace('**Name:**', '').trim().replace(/`/g, '');
      } else if (trimmed.startsWith('**Version:**')) {
        spec.version = trimmed.replace('**Version:**', '').trim();
      } else if (trimmed.startsWith('**Status:**')) {
        spec.status = trimmed.replace('**Status:**', '').trim();
      } else if (trimmed.startsWith('**Owner:**')) {
        spec.owner = trimmed.replace('**Owner:**', '').trim();
      } else if (trimmed.startsWith('**Dependencies:**')) {
        const depsStr = trimmed.replace('**Dependencies:**', '').trim();
        spec.dependencies = depsStr
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d && d !== 'None');
      } else if (trimmed.startsWith('**Port:**') || trimmed.startsWith('- **Port:**')) {
        const portStr = trimmed.replace(/\*\*Port:\*\*/g, '').trim().replace(/`/g, '');
        const port = parseInt(portStr, 10);
        if (!isNaN(port)) {
          spec.port = port;
        }
      } else if (trimmed.startsWith('**Base URL:**') || trimmed.startsWith('- **Base URL:**')) {
        spec.baseUrl = trimmed.replace(/\*\*Base URL:\*\*/g, '').trim().replace(/`/g, '');
      } else if (trimmed.startsWith('**Type:**') || trimmed.startsWith('- **Type:**')) {
        spec.type = trimmed.replace(/\*\*Type:\*\*/g, '').trim();
      }
    }

    return spec as ServiceSpec;
  } catch (error) {
    return null;
  }
}

/**
 * Validate a service specification
 */
function validateSpec(spec: ServiceSpec | null, filePath: string): SpecValidationResult {
  const result: SpecValidationResult = {
    valid: false,
    errors: [],
    warnings: [],
    spec,
    filePath,
  };

  if (!spec) {
    result.errors.push('Failed to parse spec file');
    return result;
  }

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!spec[field as keyof ServiceSpec]) {
      result.errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate version format (semver)
  if (spec.version && !/^\d+\.\d+\.\d+/.test(spec.version)) {
    result.warnings.push(`Version "${spec.version}" does not follow semver format`);
  }

  // Validate status
  const validStatuses = ['Draft', 'In Review', 'Approved', 'Implemented', 'Deprecated'];
  if (spec.status && !validStatuses.includes(spec.status)) {
    result.warnings.push(
      `Status "${spec.status}" is not a standard value. Expected: ${validStatuses.join(', ')}`
    );
  }

  // Validate port range
  if (spec.port && (spec.port < 3000 || spec.port > 3999)) {
    result.warnings.push(
      `Port ${spec.port} is outside recommended range (3000-3999) for ORION services`
    );
  }

  // Validate name format
  if (spec.name && !/^[a-z-]+$/.test(spec.name)) {
    result.warnings.push(
      'Service name should be lowercase with hyphens (e.g., "auth-service")'
    );
  }

  // Check for port conflicts
  const PORT_REGISTRY = {
    'auth-service': 3001,
    'user-service': 3002,
    'notification-service': 3003,
    'admin-ui': 3004,
    'api-gateway': 3000,
  };

  if (spec.name && spec.port) {
    const registeredPort = PORT_REGISTRY[spec.name as keyof typeof PORT_REGISTRY];
    if (registeredPort && registeredPort !== spec.port) {
      result.errors.push(
        `Port conflict: ${spec.name} should use port ${registeredPort}, but spec defines ${spec.port}`
      );
    }
  }

  result.valid = result.errors.length === 0;

  return result;
}

/**
 * Register the validate-spec tool with MCP server
 */
export function registerValidateSpecTool(server: McpServer): void {
  server.tool(
    'validate_spec',
    'Validate a GitHub Spec Kit service specification for ORION platform compliance',
    {
      specPath: {
        type: 'string',
        description: 'Path to the service specification file (relative to project root)',
      },
    },
    async ({ specPath }) => {
      const workspaceRoot = process.env.NX_WORKSPACE_ROOT || process.cwd();
      const fullPath = path.isAbsolute(specPath as string)
        ? specPath as string
        : path.join(workspaceRoot, specPath as string);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return {
          valid: false,
          errors: [`Spec file not found: ${specPath}`],
          warnings: [],
          spec: null,
          filePath: fullPath,
        };
      }

      // Parse and validate spec
      const spec = parseSpecFile(fullPath);
      const result = validateSpec(spec, fullPath);

      return result;
    }
  );
}
