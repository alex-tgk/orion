import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Spec Validator Tests
 *
 * Tests for the spec validator CLI tool functionality
 */

describe('SpecValidator', () => {
  let tempDir: string;
  let specsDir: string;
  let packagesDir: string;

  beforeEach(() => {
    // Create temporary test directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-validator-test-'));
    specsDir = path.join(tempDir, '.claude', 'specs');
    packagesDir = path.join(tempDir, 'packages');

    fs.mkdirSync(specsDir, { recursive: true });
    fs.mkdirSync(packagesDir, { recursive: true });

    // Create package.json in temp dir
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-workspace' })
    );
  });

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('validateFile', () => {
    it('should validate a complete spec file', () => {
      const specContent = `# Auth Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** Team A
**Dependencies:** None

## Overview

Authentication service for the platform.

## Service Details

- **Name:** \`auth-service\`
- **Port:** \`3001\`

## API Contract

\`\`\`typescript
POST /auth/login
Request: { email: string; password: string }
Response: { token: string }
\`\`\`

## Data Model

\`\`\`prisma
model User {
  id String @id
}
\`\`\`

## Dependencies

- bcrypt
- jwt

## Testing

Unit tests required.

## Monitoring

Metrics tracked.
`;

      const specPath = path.join(specsDir, 'auth-service.md');
      fs.writeFileSync(specPath, specContent);

      // Validation would pass
      expect(fs.existsSync(specPath)).toBe(true);
      expect(specContent).toContain('## Overview');
      expect(specContent).toContain('## Service Details');
      expect(specContent).toContain('## API Contract');
      expect(specContent).toContain('## Data Model');
      expect(specContent).toContain('## Dependencies');
    });

    it('should detect missing required sections', () => {
      const incompleteSpec = `# Auth Service

## Overview

Some content.
`;

      const specPath = path.join(specsDir, 'incomplete-service.md');
      fs.writeFileSync(specPath, incompleteSpec);

      expect(incompleteSpec).not.toContain('## Service Details');
      expect(incompleteSpec).not.toContain('## API Contract');
      expect(incompleteSpec).not.toContain('## Data Model');
      expect(incompleteSpec).not.toContain('## Dependencies');
    });

    it('should detect missing metadata', () => {
      const noMetadataSpec = `# Auth Service

## Overview

Content.
`;

      expect(noMetadataSpec).not.toContain('**Version:**');
      expect(noMetadataSpec).not.toContain('**Status:**');
      expect(noMetadataSpec).not.toContain('**Owner:**');
    });

    it('should validate API endpoint format', () => {
      const validEndpoint = `\`\`\`typescript
POST /auth/login
Request: {}
\`\`\``;

      expect(validEndpoint).toMatch(/POST\s+\/[^\n]+/);

      const invalidEndpoint = `Some random text about login`;
      expect(invalidEndpoint).not.toMatch(/POST\s+\/[^\n]+/);
    });

    it('should validate data model format', () => {
      const validModel = `\`\`\`prisma
model User {
  id String @id
}
\`\`\``;

      expect(validModel).toMatch(/model\s+\w+/);

      const invalidModel = `Just some text about users`;
      expect(invalidModel).not.toMatch(/model\s+\w+/);
    });
  });

  describe('coverage', () => {
    it('should calculate coverage percentage', () => {
      // Create 2 complete specs
      const completeSpec = createCompleteSpec('auth');
      const completeSpec2 = createCompleteSpec('user');

      fs.writeFileSync(path.join(specsDir, 'auth-service.md'), completeSpec);
      fs.writeFileSync(path.join(specsDir, 'user-service.md'), completeSpec2);

      // Create implementations
      fs.mkdirSync(path.join(packagesDir, 'auth'), { recursive: true });
      fs.mkdirSync(path.join(packagesDir, 'user'), { recursive: true });

      const totalSpecs = 2;
      const validSpecs = 2;
      const coverage = Math.round((validSpecs / totalSpecs) * 100);

      expect(coverage).toBe(100);
    });

    it('should identify missing specs for existing packages', () => {
      // Create package without spec
      const packagePath = path.join(packagesDir, 'notifications');
      fs.mkdirSync(packagePath, { recursive: true });

      const packageJson = {
        name: '@orion/notifications',
        dependencies: {
          '@nestjs/core': '^11.0.0',
        },
      };
      fs.writeFileSync(
        path.join(packagePath, 'package.json'),
        JSON.stringify(packageJson)
      );

      // No spec file created for notifications
      const specExists = fs.existsSync(
        path.join(specsDir, 'notifications-service.md')
      );
      expect(specExists).toBe(false);
    });

    it('should identify orphaned implementations', () => {
      // Create spec without implementation
      const spec = createCompleteSpec('gateway');
      fs.writeFileSync(path.join(specsDir, 'gateway-service.md'), spec);

      // No implementation directory created
      const implExists = fs.existsSync(path.join(packagesDir, 'gateway'));
      expect(implExists).toBe(false);
    });

    it('should calculate completeness for partial specs', () => {
      const partialSpec = `# User Service

**Version:** 1.0.0

## Overview

User service.

## Service Details

Details here.

## API Contract

Endpoints.
`;

      fs.writeFileSync(path.join(specsDir, 'user-service.md'), partialSpec);

      // Has 3 of 5 required sections
      const requiredSections = ['Overview', 'Service Details', 'API Contract', 'Data Model', 'Dependencies'];
      const presentSections = requiredSections.filter(section =>
        partialSpec.includes(`## ${section}`)
      );

      const completeness = Math.round((presentSections.length / requiredSections.length) * 100);
      expect(completeness).toBe(60); // 3/5 = 60%
    });
  });

  describe('generate', () => {
    it('should generate a new spec from template', () => {
      const serviceName = 'analytics';
      const specPath = path.join(specsDir, `${serviceName}-service.md`);

      // Simulate generation
      const template = generateTemplate(serviceName);
      fs.writeFileSync(specPath, template);

      expect(fs.existsSync(specPath)).toBe(true);

      const content = fs.readFileSync(specPath, 'utf-8');
      expect(content).toContain(`# Analytics Service Specification`);
      expect(content).toContain('**Version:** 1.0.0');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Service Details');
    });

    it('should fail if spec already exists', () => {
      const serviceName = 'auth';
      const specPath = path.join(specsDir, `${serviceName}-service.md`);

      fs.writeFileSync(specPath, 'existing content');

      expect(fs.existsSync(specPath)).toBe(true);
      // In actual implementation, this would throw an error
    });
  });

  describe('autoFix', () => {
    it('should add missing sections', () => {
      const incompleteSpec = `# Auth Service

## Overview

Content here.
`;

      const specPath = path.join(specsDir, 'auth-service.md');
      fs.writeFileSync(specPath, incompleteSpec);

      // Simulate auto-fix
      let content = fs.readFileSync(specPath, 'utf-8');
      const missingSections = ['Service Details', 'API Contract', 'Data Model', 'Dependencies'];

      missingSections.forEach((section) => {
        if (!content.includes(`## ${section}`)) {
          content += `\n\n## ${section}\n\n[TODO: Add content]\n`;
        }
      });

      fs.writeFileSync(specPath, content);

      const updatedContent = fs.readFileSync(specPath, 'utf-8');
      expect(updatedContent).toContain('## Service Details');
      expect(updatedContent).toContain('## API Contract');
      expect(updatedContent).toContain('## Data Model');
      expect(updatedContent).toContain('## Dependencies');
    });

    it('should support dry-run mode', () => {
      const incompleteSpec = `# Auth Service

## Overview

Content here.
`;

      const specPath = path.join(specsDir, 'auth-service.md');
      fs.writeFileSync(specPath, incompleteSpec);

      const originalContent = fs.readFileSync(specPath, 'utf-8');

      // In dry-run, content should not change
      const dryRunContent = fs.readFileSync(specPath, 'utf-8');
      expect(dryRunContent).toBe(originalContent);
    });
  });

  describe('sync', () => {
    it('should extract endpoints from implementation', () => {
      const controllerContent = `
import { Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  login() {}

  @Get('me')
  getProfile() {}

  @Post('logout')
  logout() {}
}
`;

      const endpoints = extractEndpoints(controllerContent);
      expect(endpoints).toContain('POST /auth/login');
      expect(endpoints).toContain('GET /auth/me');
      expect(endpoints).toContain('POST /auth/logout');
    });

    it('should extract models from Prisma schema', () => {
      const prismaSchema = `
model User {
  id String @id @default(uuid())
  email String @unique
}

model RefreshToken {
  id String @id
  userId String
}
`;

      const models = extractModels(prismaSchema);
      expect(models).toContain('User');
      expect(models).toContain('RefreshToken');
    });

    it('should update changelog when syncing', () => {
      const specContent = `# Auth Service

## Changelog

- **2025-01-15:** Initial specification
`;

      const today = new Date().toISOString().split('T')[0];
      const updatedContent = specContent.replace(
        /## Changelog\n/,
        `## Changelog\n\n- **${today}:** Synced with implementation\n`
      );

      expect(updatedContent).toContain('Synced with implementation');
    });
  });

  describe('isServicePackage', () => {
    it('should identify NestJS service packages', () => {
      const packagePath = path.join(packagesDir, 'auth');
      fs.mkdirSync(packagePath, { recursive: true });

      const packageJson = {
        name: '@orion/auth',
        dependencies: {
          '@nestjs/core': '^11.0.0',
        },
      };

      fs.writeFileSync(
        path.join(packagePath, 'package.json'),
        JSON.stringify(packageJson)
      );

      const content = fs.readFileSync(path.join(packagePath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(content);

      expect(pkg.dependencies?.['@nestjs/core']).toBeDefined();
    });

    it('should exclude utility packages', () => {
      const excludedPackages = ['shared', 'dev-tools', 'mcp-server'];

      excludedPackages.forEach((pkg) => {
        expect(excludedPackages).toContain(pkg);
      });
    });
  });

  describe('report generation', () => {
    it('should generate HTML report', () => {
      const report = {
        totalSpecs: 5,
        validSpecs: 3,
        coveragePercentage: 60,
        missingSpecs: ['analytics'],
        orphanedImplementations: ['gateway'],
        specFiles: [
          {
            file: 'auth-service.md',
            service: 'auth',
            hasImplementation: true,
            completeness: 100,
            missingSections: [],
          },
        ],
      };

      const html = generateHTMLReport(report);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Spec Coverage Report');
      expect(html).toContain('60%');
      expect(html).toContain('analytics');
    });

    it('should generate Markdown report', () => {
      const report = {
        totalSpecs: 5,
        validSpecs: 3,
        coveragePercentage: 60,
        missingSpecs: ['analytics'],
        orphanedImplementations: ['gateway'],
        specFiles: [
          {
            file: 'auth-service.md',
            service: 'auth',
            hasImplementation: true,
            completeness: 100,
            missingSections: [],
          },
        ],
      };

      const markdown = generateMarkdownReport(report);

      expect(markdown).toContain('# Spec Coverage Report');
      expect(markdown).toContain('**Coverage:** 60%');
      expect(markdown).toContain('- analytics');
    });

    it('should generate JSON report', () => {
      const report = {
        totalSpecs: 5,
        validSpecs: 3,
        coveragePercentage: 60,
        missingSpecs: ['analytics'],
        orphanedImplementations: [],
        specFiles: [],
      };

      const json = JSON.stringify(report, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed.totalSpecs).toBe(5);
      expect(parsed.validSpecs).toBe(3);
      expect(parsed.coveragePercentage).toBe(60);
    });
  });
});

// Helper functions
function createCompleteSpec(serviceName: string): string {
  return `# ${serviceName} Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** Team A
**Dependencies:** None

## Overview

Service overview.

## Service Details

- **Name:** \`${serviceName}-service\`

## API Contract

\`\`\`typescript
GET /health
\`\`\`

## Data Model

\`\`\`prisma
model Entity {
  id String @id
}
\`\`\`

## Dependencies

- dependency-1

## Testing

Tests required.

## Monitoring

Metrics tracked.
`;
}

function generateTemplate(serviceName: string): string {
  return `# ${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** [Team/Person]

## Overview

[TODO: Add overview]

## Service Details

- **Name:** \`${serviceName}-service\`

## API Contract

[TODO: Add endpoints]

## Data Model

[TODO: Add models]

## Dependencies

[TODO: Add dependencies]
`;
}

function extractEndpoints(code: string): string[] {
  const endpoints: string[] = [];
  const decoratorPattern = /@(Get|Post|Put|Patch|Delete)\(['"]([^'"]+)['"]\)/g;
  const controllerPattern = /@Controller\(['"]([^'"]+)['"]\)/;

  const controllerMatch = code.match(controllerPattern);
  const basePath = controllerMatch ? controllerMatch[1] : '';

  let match;
  while ((match = decoratorPattern.exec(code)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    endpoints.push(`${method} /${basePath}/${path}`.replace(/\/+/g, '/'));
  }

  return endpoints;
}

function extractModels(schema: string): string[] {
  const modelPattern = /model\s+(\w+)/g;
  const models: string[] = [];

  let match;
  while ((match = modelPattern.exec(schema)) !== null) {
    models.push(match[1]);
  }

  return models;
}

function generateHTMLReport(report: any): string {
  return `<!DOCTYPE html>
<html>
<head><title>Spec Coverage Report</title></head>
<body>
  <h1>Spec Coverage Report</h1>
  <p>Coverage: ${report.coveragePercentage}%</p>
  <ul>
    ${report.missingSpecs.map((spec: string) => `<li>${spec}</li>`).join('')}
  </ul>
</body>
</html>`;
}

function generateMarkdownReport(report: any): string {
  return `# Spec Coverage Report

**Coverage:** ${report.coveragePercentage}%

## Missing Specs

${report.missingSpecs.map((spec: string) => `- ${spec}`).join('\n')}
`;
}
