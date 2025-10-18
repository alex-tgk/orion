/**
 * Common types for ORION MCP tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';

export type ToolRegistration = (server: McpServer) => void;

export interface ServiceSpec {
  name: string;
  version: string;
  status: string;
  owner: string;
  dependencies: string[];
  port?: number;
  baseUrl?: string;
  type?: string;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime?: number;
  error?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface NxAffectedResult {
  projects: string[];
  tasks: string[];
  count: number;
  base?: string;
  head?: string;
}

export interface SpecValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  spec: ServiceSpec | null;
  filePath: string;
}

export interface ServiceGenerationResult {
  success: boolean;
  serviceName: string;
  generatedFiles: string[];
  errors: string[];
  message: string;
}

export interface SpecSyncResult {
  synced: boolean;
  service: string;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  message: string;
}
