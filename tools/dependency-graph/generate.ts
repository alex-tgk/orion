#!/usr/bin/env ts-node
/**
 * ORION Dependency Graph Generator
 *
 * This script analyzes the codebase and generates dependency graph data
 * for visualization in the interactive HTML viewer.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface DependencyNode {
  id: string;
  label: string;
  group: string;
  level: number;
  type: 'service' | 'package' | 'shared' | 'infrastructure';
  metadata?: {
    port?: number;
    path?: string;
    version?: string;
  };
}

interface DependencyEdge {
  from: string;
  to: string;
  label?: string;
  type: 'import' | 'dependency' | 'communication' | 'data';
  dashes?: boolean;
}

interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metadata: {
    generatedAt: string;
    totalNodes: number;
    totalEdges: number;
    circularDependencies: number;
  };
}

class DependencyGraphGenerator {
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: DependencyEdge[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
  }

  /**
   * Generate complete dependency graph
   */
  async generate(): Promise<DependencyGraph> {
    console.log('🔍 Analyzing ORION dependency structure...\n');

    // Analyze different types of dependencies
    await this.analyzeServices();
    await this.analyzePackageDependencies();
    await this.analyzeTypescriptImports();
    await this.analyzeInfrastructure();

    // Check for circular dependencies
    const circularCount = await this.checkCircularDependencies();

    const graph: DependencyGraph = {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalNodes: this.nodes.size,
        totalEdges: this.edges.length,
        circularDependencies: circularCount,
      },
    };

    console.log(`\n✅ Analysis complete!`);
    console.log(`   Nodes: ${graph.metadata.totalNodes}`);
    console.log(`   Edges: ${graph.metadata.totalEdges}`);
    console.log(`   Circular Dependencies: ${graph.metadata.circularDependencies}`);

    return graph;
  }

  /**
   * Analyze microservices
   */
  private async analyzeServices(): Promise<void> {
    console.log('📦 Analyzing microservices...');

    const services = [
      { id: 'auth', label: 'Auth Service', port: 20000, level: 1 },
      { id: 'gateway', label: 'Gateway Service', port: 20001, level: 0 },
      { id: 'user', label: 'User Service', port: 20002, level: 1 },
      { id: 'notifications', label: 'Notifications Service', port: 20003, level: 1 },
      { id: 'admin-ui', label: 'Admin UI Service', port: 20004, level: 0 },
      { id: 'mcp-server', label: 'MCP Server', port: 20005, level: 2 },
      { id: 'feature-flags', label: 'Feature Flags Service', port: 20006, level: 1 },
      { id: 'ab-testing', label: 'AB Testing Service', port: 20007, level: 1 },
    ];

    for (const service of services) {
      this.addNode({
        id: service.id,
        label: service.label,
        group: 'service',
        level: service.level,
        type: 'service',
        metadata: {
          port: service.port,
          path: `packages/${service.id}`,
        },
      });
    }

    // Service dependencies
    this.addEdge({ from: 'gateway', to: 'auth', type: 'communication' });
    this.addEdge({ from: 'gateway', to: 'user', type: 'communication' });
    this.addEdge({ from: 'gateway', to: 'notifications', type: 'communication' });
    this.addEdge({ from: 'gateway', to: 'feature-flags', type: 'communication' });
    this.addEdge({ from: 'gateway', to: 'ab-testing', type: 'communication' });
    this.addEdge({ from: 'user', to: 'auth', type: 'communication', label: 'validate' });
    this.addEdge({ from: 'admin-ui', to: 'gateway', type: 'communication' });
    this.addEdge({ from: 'mcp-server', to: 'auth', type: 'communication', dashes: true, label: 'observe' });
    this.addEdge({ from: 'mcp-server', to: 'gateway', type: 'communication', dashes: true, label: 'observe' });
  }

  /**
   * Analyze NPM package dependencies
   */
  private async analyzePackageDependencies(): Promise<void> {
    console.log('📚 Analyzing package dependencies...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Add key runtime dependencies
    const keyDependencies = [
      '@nestjs/core',
      '@nestjs/common',
      '@prisma/client',
      'bull',
      'ioredis',
      'socket.io',
    ];

    for (const dep of keyDependencies) {
      if (packageJson.dependencies[dep]) {
        this.addNode({
          id: dep,
          label: dep,
          group: 'package',
          level: 3,
          type: 'package',
          metadata: {
            version: packageJson.dependencies[dep],
          },
        });
      }
    }
  }

  /**
   * Analyze TypeScript imports using dependency-cruiser
   */
  private async analyzeTypescriptImports(): Promise<void> {
    console.log('🔗 Analyzing TypeScript imports...');

    try {
      const output = execSync(
        'npx depcruise --config .dependency-cruiser.js --output-type json packages',
        {
          cwd: this.projectRoot,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }
      );

      const result = JSON.parse(output);

      // Add shared package
      this.addNode({
        id: 'shared',
        label: '@orion/shared',
        group: 'shared',
        level: 2,
        type: 'shared',
        metadata: {
          path: 'packages/shared',
        },
      });

      // Add edges from services to shared package
      if (result.modules) {
        const servicesUsingShared = new Set<string>();

        for (const module of result.modules) {
          if (module.dependencies) {
            for (const dep of module.dependencies) {
              if (dep.resolved && dep.resolved.includes('packages/shared')) {
                const sourcePackage = this.extractPackageName(module.source);
                if (sourcePackage && sourcePackage !== 'shared') {
                  servicesUsingShared.add(sourcePackage);
                }
              }
            }
          }
        }

        for (const service of servicesUsingShared) {
          this.addEdge({
            from: service,
            to: 'shared',
            type: 'import',
            label: 'import',
          });
        }
      }
    } catch (error) {
      console.warn('   ⚠️  Could not analyze TypeScript imports (depcruise may need to run separately)');
    }
  }

  /**
   * Analyze infrastructure dependencies
   */
  private async analyzeInfrastructure(): Promise<void> {
    console.log('🏗️  Analyzing infrastructure dependencies...');

    // Add infrastructure nodes
    this.addNode({
      id: 'postgresql',
      label: 'PostgreSQL',
      group: 'infrastructure',
      level: 4,
      type: 'infrastructure',
    });

    this.addNode({
      id: 'redis',
      label: 'Redis',
      group: 'infrastructure',
      level: 4,
      type: 'infrastructure',
    });

    // Services using PostgreSQL
    const pgServices = ['auth', 'user', 'notifications', 'feature-flags', 'ab-testing'];
    for (const service of pgServices) {
      this.addEdge({
        from: service,
        to: 'postgresql',
        type: 'data',
        label: 'data',
      });
    }

    // Services using Redis
    const redisServices = ['auth', 'user', 'notifications', 'gateway', 'feature-flags', 'ab-testing'];
    for (const service of redisServices) {
      this.addEdge({
        from: service,
        to: 'redis',
        type: 'data',
        label: 'cache',
      });
    }
  }

  /**
   * Check for circular dependencies
   */
  private async checkCircularDependencies(): Promise<number> {
    console.log('🔄 Checking for circular dependencies...');

    try {
      const output = execSync(
        'npx madge --circular --extensions ts --json packages',
        {
          cwd: this.projectRoot,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        }
      );

      const circular = JSON.parse(output);
      return Array.isArray(circular) ? circular.length : 0;
    } catch (error) {
      console.warn('   ⚠️  Could not check circular dependencies');
      return 0;
    }
  }

  /**
   * Add a node to the graph
   */
  private addNode(node: DependencyNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
  }

  /**
   * Add an edge to the graph
   */
  private addEdge(edge: DependencyEdge): void {
    // Check if edge already exists
    const exists = this.edges.some(
      (e) => e.from === edge.from && e.to === edge.to
    );

    if (!exists) {
      this.edges.push(edge);
    }
  }

  /**
   * Extract package name from file path
   */
  private extractPackageName(filePath: string): string | null {
    const match = filePath.match(/packages\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Save graph to JSON file
   */
  async saveGraph(graph: DependencyGraph, outputPath: string): Promise<void> {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2), 'utf-8');
    console.log(`\n💾 Graph saved to: ${outputPath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const generator = new DependencyGraphGenerator();
  const graph = await generator.generate();

  const outputPath = path.resolve(__dirname, 'dependency-graph.json');
  await generator.saveGraph(graph, outputPath);

  console.log('\n🌐 View the interactive graph:');
  console.log(`   open tools/dependency-graph/index.html\n`);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error generating dependency graph:', error);
    process.exit(1);
  });
}

export { DependencyGraphGenerator, DependencyGraph, DependencyNode, DependencyEdge };
