# ORION Custom MCP Tools Documentation

This document provides comprehensive documentation for all custom MCP tools developed for the ORION platform.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Tool Reference](#tool-reference)
4. [Usage Examples](#usage-examples)
5. [Development](#development)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The ORION platform provides five custom MCP tools that integrate with Claude Code to enhance development workflows:

1. **validate_spec** - Validate GitHub Spec Kit service specifications
2. **check_service_health** - Health check for ORION microservices
3. **nx_affected** - Determine affected projects in Nx workspace
4. **generate_service_from_spec** - Generate services from specifications
5. **sync_spec** - Synchronize specs with implementations

---

## Installation

### Prerequisites

- Node.js 20+
- pnpm package manager
- Claude Code installed
- ORION project cloned locally

### Build the MCP Server

```bash
# From ORION project root
cd /Users/acarroll/dev/projects/orion

# Build the MCP server
pnpm nx build mcp-server

# Verify the build
ls -la dist/packages/mcp-server/src/mcp-main.js
```

### Configure Claude Code

The MCP server is already configured in `.claude/mcp/config.json`:

```json
{
  "mcpServers": {
    "orion-local": {
      "command": "node",
      "args": ["dist/packages/mcp-server/src/mcp-main.js"],
      "env": {
        "DATABASE_URL": "postgresql://orion:orion_dev@localhost:5432/orion_dev",
        "REDIS_URL": "redis://localhost:6379",
        "NODE_ENV": "development",
        "NX_WORKSPACE_ROOT": "/Users/acarroll/dev/projects/orion"
      }
    }
  }
}
```

### Restart Claude Code

After building the MCP server, restart Claude Code to load the custom tools.

---

## Tool Reference

### 1. validate_spec

Validates a GitHub Spec Kit service specification against ORION requirements.

**Parameters:**
- `specPath` (string): Path to the specification file (relative to project root)

**Returns:**
```typescript
{
  valid: boolean;
  errors: string[];
  warnings: string[];
  spec: ServiceSpec | null;
  filePath: string;
}
```

**Validation Checks:**
- Required fields (name, version, status, owner, dependencies)
- Version format (semver)
- Status value (Draft, In Review, Approved, Implemented, Deprecated)
- Port range (3000-3999)
- Service name format (lowercase with hyphens)
- Port conflicts with existing services

**Example Usage:**
```
Validate the auth service spec at .claude/specs/auth-service.md
```

---

### 2. check_service_health

Performs health checks on ORION microservices and returns detailed status.

**Parameters:**
- `service` (string): Service name or "all" for all services
  - Valid values: `auth-service`, `user-service`, `notification-service`, `admin-ui`, `api-gateway`, `all`

**Returns:**

For single service:
```typescript
{
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime?: number;
  error?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}
```

For all services:
```typescript
{
  summary: {
    totalServices: number;
    healthy: number;
    unhealthy: number;
    avgResponseTime: number;
  };
  services: HealthCheckResult[];
  timestamp: string;
}
```

**Example Usage:**
```
Check health of all ORION services
Check health of auth-service
```

---

### 3. nx_affected

Determines which projects in the Nx workspace are affected by current changes.

**Parameters:**
- `base` (string, optional): Base branch or commit to compare against (default: "main")
- `head` (string, optional): Head branch or commit to compare (default: "HEAD")

**Returns:**
```typescript
{
  projects: string[];
  tasks: string[];
  count: number;
  base?: string;
  head?: string;
  message: string;
  timestamp: string;
}
```

**Example Usage:**
```
Get affected projects for current changes
Get affected projects comparing feature-branch to main
```

---

### 4. generate_service_from_spec

Generates a new NestJS microservice from a GitHub Spec Kit specification.

**Parameters:**
- `specPath` (string): Path to the service specification file

**Returns:**
```typescript
{
  success: boolean;
  serviceName: string;
  generatedFiles: string[];
  errors: string[];
  message: string;
}
```

**Generated Files:**
- `packages/{service-name}/src/main.ts` - Entry point with port configuration
- `packages/{service-name}/src/app/app.module.ts` - Main module
- `packages/{service-name}/src/app/app.controller.ts` - Controller
- `packages/{service-name}/src/app/app.service.ts` - Service
- `packages/{service-name}/project.json` - Nx configuration
- `packages/{service-name}/.env` - Environment variables
- `packages/{service-name}/README.md` - Documentation

**Example Usage:**
```
Generate a new service from .claude/specs/payment-service.md
```

---

### 5. sync_spec

Synchronizes GitHub Spec Kit specifications with actual implementation.

**Parameters:**
- `specPath` (string): Path to the service specification file

**Returns:**
```typescript
{
  synced: boolean;
  service: string;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  message: string;
}
```

**Checks:**
- Implementation exists
- Port configuration matches spec
- All expected files are present
- Dependencies are correct

**Example Usage:**
```
Sync the auth service spec with its implementation
Check if user-service is in sync with its spec
```

---

## Usage Examples

### Example 1: Validate a New Service Spec

```
User: Validate the notification service spec

Claude: I'll validate the notification service specification.

[Uses validate_spec tool with specPath: ".claude/specs/notification-service.md"]

Result:
✓ Specification is valid
- Name: notification-service
- Version: 1.0.0
- Port: 3003
- Status: Draft
- Dependencies: auth-service, user-service

Warnings:
- Status "Draft" - consider moving to "In Review" when ready
```

### Example 2: Check All Service Health

```
User: Check health of all ORION services

Claude: I'll check the health status of all ORION services.

[Uses check_service_health tool with service: "all"]

Result:
Summary:
- Total Services: 5
- Healthy: 4
- Unhealthy: 1
- Average Response Time: 45ms

Services:
✓ api-gateway (healthy, 38ms)
✓ auth-service (healthy, 42ms)
✓ user-service (healthy, 50ms)
✗ notification-service (unhealthy, timeout)
✓ admin-ui (healthy, 48ms)

The notification-service appears to be down. You may need to start it.
```

### Example 3: Check Affected Projects

```
User: What projects are affected by my current changes?

Claude: I'll check which projects are affected by your current changes.

[Uses nx_affected tool with base: "main", head: "HEAD"]

Result:
Found 3 affected project(s):

Projects:
- auth-service
- user-service
- shared

Affected Tasks:
- auth-service:build
- auth-service:test
- auth-service:lint
- user-service:build
- user-service:test
- shared:build

You should run tests for these projects before pushing.
```

### Example 4: Generate New Service

```
User: Generate a new payment service from the spec

Claude: I'll generate the payment service from its specification.

[Uses generate_service_from_spec tool with specPath: ".claude/specs/payment-service.md"]

Result:
✓ Successfully generated payment-service on port 3005

Generated Files:
- packages/payment-service/src/main.ts
- packages/payment-service/src/app/app.module.ts
- packages/payment-service/src/app/app.controller.ts
- packages/payment-service/src/app/app.service.ts
- packages/payment-service/project.json
- packages/payment-service/.env
- packages/payment-service/README.md

Next steps:
1. Review the generated code
2. Add your business logic to app.service.ts
3. Run: pnpm nx serve payment-service
4. Test: curl http://localhost:3005/health
```

### Example 5: Sync Spec with Implementation

```
User: Check if auth-service is in sync with its spec

Claude: I'll check if the auth-service implementation matches its specification.

[Uses sync_spec tool with specPath: ".claude/specs/auth-service.md"]

Result:
⚠ auth-service has 1 discrepancy with its specification

Changes Detected:
- Port mismatch: spec defines 3001, implementation uses 3002

Recommendations:
1. Update .env to use PORT=3001
2. Update main.ts if hardcoded
3. Restart the service
4. Re-run sync check
```

---

## Development

### Adding a New Tool

1. **Create Tool File:**
```typescript
// packages/mcp-server/src/tools/my-tool.tool.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';

export function registerMyTool(server: McpServer): void {
  server.tool(
    'my_tool',
    'Description of what this tool does',
    {
      param1: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    async ({ param1 }) => {
      // Implementation
      return { result: 'success' };
    }
  );
}
```

2. **Export from Index:**
```typescript
// packages/mcp-server/src/tools/index.ts
export { registerMyTool } from './my-tool.tool';
```

3. **Register in Main:**
```typescript
// packages/mcp-server/src/mcp-main.ts
import { registerMyTool } from './tools/index.js';

registerMyTool(server);
```

4. **Add Tests:**
```typescript
// packages/mcp-server/src/tools/__tests__/my-tool.tool.spec.ts
describe('MyTool', () => {
  it('should work correctly', () => {
    // Test implementation
  });
});
```

5. **Rebuild:**
```bash
pnpm nx build mcp-server
```

### Running Tests

```bash
# Run all MCP server tests
pnpm nx test mcp-server

# Run tests in watch mode
pnpm nx test mcp-server --watch

# Run tests with coverage
pnpm nx test mcp-server --coverage
```

---

## Troubleshooting

### Tool Not Found

**Symptom:** Claude Code doesn't recognize the tool

**Solutions:**
1. Verify MCP server is built:
   ```bash
   ls -la dist/packages/mcp-server/src/mcp-main.js
   ```

2. Rebuild if necessary:
   ```bash
   pnpm nx build mcp-server
   ```

3. Restart Claude Code

### Tool Returns Error

**Symptom:** Tool executes but returns an error

**Solutions:**
1. Check tool logs in Claude Code output panel
2. Verify environment variables are set:
   ```bash
   echo $NX_WORKSPACE_ROOT
   echo $DATABASE_URL
   ```

3. Test the tool directly:
   ```bash
   node dist/packages/mcp-server/src/mcp-main.js
   ```

### Workspace Root Issues

**Symptom:** Tool can't find files or projects

**Solution:**
Verify `NX_WORKSPACE_ROOT` is set correctly in `.claude/mcp/config.json`:
```json
{
  "env": {
    "NX_WORKSPACE_ROOT": "/Users/acarroll/dev/projects/orion"
  }
}
```

### Build Failures

**Symptom:** MCP server fails to build

**Solutions:**
1. Check TypeScript errors:
   ```bash
   pnpm nx build mcp-server --verbose
   ```

2. Verify dependencies:
   ```bash
   cd packages/mcp-server
   pnpm install
   ```

3. Clear build cache:
   ```bash
   pnpm nx reset
   pnpm nx build mcp-server
   ```

---

## Best Practices

1. **Always validate specs** before generating services
2. **Check service health** before deploying
3. **Use nx_affected** to optimize CI/CD
4. **Sync specs regularly** to maintain consistency
5. **Write tests** for custom business logic

---

## Support

For issues or questions:

1. Check Claude Code output panel for error messages
2. Review MCP logs for detailed information
3. Consult `.claude/mcp/IMPLEMENTATION_GUIDE.md`
4. Create an issue in the ORION repository

---

**Last Updated:** 2025-10-18
**Version:** 1.0.0
