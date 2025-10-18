/**
 * NX Affected Tool
 *
 * Determines which projects in the Nx workspace are affected by current changes.
 * Useful for optimizing CI/CD pipelines and understanding change impact.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { execSync } from 'child_process';
import type { NxAffectedResult } from './types';

/**
 * Execute nx affected command and parse results
 */
function getNxAffected(base = 'main', head = 'HEAD'): NxAffectedResult {
  try {
    const workspaceRoot = process.env.NX_WORKSPACE_ROOT || process.cwd();

    // Get affected projects
    const affectedOutput = execSync(
      `npx nx show projects --affected --base=${base} --head=${head}`,
      {
        cwd: workspaceRoot,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    const projects = affectedOutput
      .trim()
      .split('\n')
      .filter((line) => line.trim());

    // Get affected tasks (test, build, lint)
    const tasks: string[] = [];
    const taskTypes = ['build', 'test', 'lint'];

    for (const taskType of taskTypes) {
      try {
        const taskOutput = execSync(
          `npx nx show projects --affected --base=${base} --head=${head} --withTarget=${taskType}`,
          {
            cwd: workspaceRoot,
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
          }
        );

        const projectsWithTask = taskOutput
          .trim()
          .split('\n')
          .filter((line) => line.trim());

        tasks.push(
          ...projectsWithTask.map((project) => `${project}:${taskType}`)
        );
      } catch (error) {
        // Task might not be available for any project
      }
    }

    return {
      projects,
      tasks,
      count: projects.length,
      base,
      head,
    };
  } catch (error) {
    throw new Error(
      `Failed to get affected projects: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Register the nx-affected tool with MCP server
 */
export function registerNxAffectedTool(server: McpServer): void {
  server.tool(
    'nx_affected',
    'Get list of Nx projects affected by current changes',
    {
      base: {
        type: 'string',
        description: 'Base branch or commit to compare against (default: "main")',
      },
      head: {
        type: 'string',
        description: 'Head branch or commit to compare (default: "HEAD")',
      },
    },
    async ({ base, head }) => {
      try {
        const result = getNxAffected(
          (base as string) || 'main',
          (head as string) || 'HEAD'
        );

        return {
          ...result,
          message: `Found ${result.count} affected project(s)`,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          projects: [],
          tasks: [],
          count: 0,
        };
      }
    }
  );
}
