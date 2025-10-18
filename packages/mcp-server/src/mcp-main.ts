#!/usr/bin/env node

/**
 * ORION MCP Server
 *
 * Custom Model Context Protocol server for ORION platform.
 * Provides tools for service validation, health checks, and development workflows.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerValidateSpecTool,
  registerCheckServiceHealthTool,
  registerNxAffectedTool,
  registerGenerateServiceFromSpecTool,
  registerSyncSpecTool,
} from './tools/index.js';

/**
 * Initialize and start the MCP server
 */
async function main() {
  // Create MCP server instance
  const server = new McpServer({
    name: 'orion-local',
    version: '1.0.0',
  });

  // Register all custom tools
  console.error('[ORION MCP] Registering custom tools...');

  try {
    registerValidateSpecTool(server);
    console.error('[ORION MCP] ✓ Registered validate_spec tool');

    registerCheckServiceHealthTool(server);
    console.error('[ORION MCP] ✓ Registered check_service_health tool');

    registerNxAffectedTool(server);
    console.error('[ORION MCP] ✓ Registered nx_affected tool');

    registerGenerateServiceFromSpecTool(server);
    console.error('[ORION MCP] ✓ Registered generate_service_from_spec tool');

    registerSyncSpecTool(server);
    console.error('[ORION MCP] ✓ Registered sync_spec tool');

    console.error('[ORION MCP] All tools registered successfully');
  } catch (error) {
    console.error('[ORION MCP] Error registering tools:', error);
    process.exit(1);
  }

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  console.error('[ORION MCP] Starting server...');

  try {
    await server.connect(transport);
    console.error('[ORION MCP] Server started successfully');
    console.error('[ORION MCP] Workspace root:', process.env.NX_WORKSPACE_ROOT || process.cwd());
  } catch (error) {
    console.error('[ORION MCP] Error starting server:', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[ORION MCP] Shutting down...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('[ORION MCP] Shutting down...');
    await server.close();
    process.exit(0);
  });
}

// Start the server
main().catch((error) => {
  console.error('[ORION MCP] Fatal error:', error);
  process.exit(1);
});
