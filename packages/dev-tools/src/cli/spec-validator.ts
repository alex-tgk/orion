#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

/**
 * Spec Validator CLI Tool
 *
 * Validates specification documents against GitHub Spec Kit standards,
 * generates coverage reports, and provides auto-fix capabilities.
 */

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

interface ValidationError {
  section: string;
  message: string;
  line?: number;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  section: string;
  message: string;
  line?: number;
}

interface CoverageReport {
  totalSpecs: number;
  validSpecs: number;
  missingSpecs: string[];
  orphanedImplementations: string[];
  coveragePercentage: number;
  specFiles: SpecFileInfo[];
}

interface SpecFileInfo {
  file: string;
  service: string;
  hasImplementation: boolean;
  completeness: number;
  missingSections: string[];
}

interface SpecSection {
  name: string;
  required: boolean;
  pattern: RegExp;
}

// Required sections per GitHub Spec Kit
const REQUIRED_SECTIONS: SpecSection[] = [
  { name: 'Overview', required: true, pattern: /^##\s+Overview/m },
  { name: 'Service Details', required: true, pattern: /^##\s+Service Details/m },
  { name: 'API Contract', required: true, pattern: /^##\s+(API Contract|API Endpoints|Endpoints)/m },
  { name: 'Data Model', required: true, pattern: /^##\s+Data Model/m },
  { name: 'Dependencies', required: true, pattern: /^##\s+Dependencies/m },
  { name: 'Implementation Plan', required: false, pattern: /^##\s+Implementation Plan/m },
  { name: 'Testing', required: false, pattern: /^##\s+Testing/m },
  { name: 'Monitoring', required: false, pattern: /^##\s+Monitoring/m },
];

const API_ENDPOINT_PATTERN = /```typescript\n(GET|POST|PUT|PATCH|DELETE)\s+\/[^\n]+/gm;
const DATA_MODEL_PATTERN = /```(prisma|typescript)\nmodel\s+\w+/gm;

class SpecValidator {
  private workspaceRoot: string;
  private specsDir: string;
  private packagesDir: string;

  constructor() {
    this.workspaceRoot = this.findWorkspaceRoot();
    this.specsDir = path.join(this.workspaceRoot, '.claude', 'specs');
    this.packagesDir = path.join(this.workspaceRoot, 'packages');
  }

  private findWorkspaceRoot(): string {
    let currentDir = process.cwd();
    while (currentDir !== '/') {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    return process.cwd();
  }

  /**
   * Validate a single spec file or all specs
   */
  async validate(filePath?: string): Promise<ValidationResult[]> {
    const files = filePath
      ? [path.resolve(filePath)]
      : await glob(`${this.specsDir}/**/*.md`);

    const results: ValidationResult[] = [];

    for (const file of files) {
      results.push(await this.validateFile(file));
    }

    return results;
  }

  private async validateFile(filePath: string): Promise<ValidationResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check required sections
    for (const section of REQUIRED_SECTIONS) {
      if (!section.pattern.test(content)) {
        if (section.required) {
          errors.push({
            section: section.name,
            message: `Missing required section: ${section.name}`,
            severity: 'error',
          });
        } else {
          warnings.push({
            section: section.name,
            message: `Missing recommended section: ${section.name}`,
          });
        }
      }
    }

    // Validate API endpoints format
    const apiContractMatch = content.match(/^##\s+(API Contract|API Endpoints|Endpoints)/m);
    if (apiContractMatch) {
      const apiSectionStart = apiContractMatch.index || 0;
      const apiSection = content.slice(apiSectionStart);
      const endpointMatches = apiSection.match(API_ENDPOINT_PATTERN);

      if (!endpointMatches || endpointMatches.length === 0) {
        warnings.push({
          section: 'API Contract',
          message: 'No properly formatted API endpoints found',
        });
      }
    }

    // Validate data model
    const dataModelMatch = content.match(/^##\s+Data Model/m);
    if (dataModelMatch) {
      const dataModelStart = dataModelMatch.index || 0;
      const dataModelSection = content.slice(dataModelStart);
      const modelMatches = dataModelSection.match(DATA_MODEL_PATTERN);

      if (!modelMatches || modelMatches.length === 0) {
        warnings.push({
          section: 'Data Model',
          message: 'No properly formatted data models found',
        });
      }
    }

    // Check for metadata
    const hasVersion = /\*\*Version:\*\*/.test(content);
    const hasStatus = /\*\*Status:\*\*/.test(content);
    const hasOwner = /\*\*Owner:\*\*/.test(content);

    if (!hasVersion) {
      warnings.push({
        section: 'Metadata',
        message: 'Missing version information',
      });
    }
    if (!hasStatus) {
      warnings.push({
        section: 'Metadata',
        message: 'Missing status information',
      });
    }
    if (!hasOwner) {
      warnings.push({
        section: 'Metadata',
        message: 'Missing owner information',
      });
    }

    // Check implementation existence
    const serviceName = this.extractServiceName(filePath);
    const hasImplementation = this.checkImplementationExists(serviceName);

    if (!hasImplementation) {
      warnings.push({
        section: 'Implementation',
        message: `No implementation found for service: ${serviceName}`,
      });
    }

    // Calculate score
    const totalChecks = REQUIRED_SECTIONS.length + 3; // sections + metadata
    const passedChecks = totalChecks - errors.length - warnings.length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    return {
      file: path.relative(this.workspaceRoot, filePath),
      valid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  private extractServiceName(filePath: string): string {
    const basename = path.basename(filePath, '.md');
    return basename.replace('-service', '');
  }

  private checkImplementationExists(serviceName: string): boolean {
    const servicePath = path.join(this.packagesDir, serviceName);
    return fs.existsSync(servicePath);
  }

  /**
   * Generate coverage report
   */
  async coverage(): Promise<CoverageReport> {
    const specFiles = await glob(`${this.specsDir}/**/*.md`);
    const packageDirs = fs.readdirSync(this.packagesDir).filter((dir) => {
      const fullPath = path.join(this.packagesDir, dir);
      return fs.statSync(fullPath).isDirectory();
    });

    const specFileInfos: SpecFileInfo[] = [];
    const missingSpecs: string[] = [];
    const orphanedImplementations: string[] = [];

    // Check each spec file
    for (const specFile of specFiles) {
      const serviceName = this.extractServiceName(specFile);
      const hasImplementation = this.checkImplementationExists(serviceName);
      const content = fs.readFileSync(specFile, 'utf-8');

      const missingSections = REQUIRED_SECTIONS.filter(
        (section) => section.required && !section.pattern.test(content)
      ).map((s) => s.name);

      const totalSections = REQUIRED_SECTIONS.filter((s) => s.required).length;
      const completedSections = totalSections - missingSections.length;
      const completeness = Math.round((completedSections / totalSections) * 100);

      specFileInfos.push({
        file: path.relative(this.workspaceRoot, specFile),
        service: serviceName,
        hasImplementation,
        completeness,
        missingSections,
      });
    }

    // Check for packages without specs
    const specServiceNames = specFileInfos.map((info) => info.service);
    for (const packageDir of packageDirs) {
      if (!specServiceNames.includes(packageDir)) {
        const isService = this.isServicePackage(packageDir);
        if (isService) {
          missingSpecs.push(packageDir);
        }
      }
    }

    // Check for specs without implementations
    for (const info of specFileInfos) {
      if (!info.hasImplementation) {
        orphanedImplementations.push(info.service);
      }
    }

    const validSpecs = specFileInfos.filter((info) => info.completeness === 100).length;
    const coveragePercentage = Math.round(
      (validSpecs / (specFiles.length + missingSpecs.length)) * 100
    );

    return {
      totalSpecs: specFiles.length,
      validSpecs,
      missingSpecs,
      orphanedImplementations,
      coveragePercentage,
      specFiles: specFileInfos,
    };
  }

  private isServicePackage(packageName: string): boolean {
    const excludedPackages = ['shared', 'dev-tools', 'mcp-server'];
    if (excludedPackages.includes(packageName)) {
      return false;
    }

    const packageJsonPath = path.join(this.packagesDir, packageName, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.dependencies?.['@nestjs/core'] !== undefined;
  }

  /**
   * Auto-fix spec file by adding missing sections
   */
  async autoFix(filePath: string, options: { dryRun?: boolean } = {}): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    let updatedContent = content;

    const missingSections = REQUIRED_SECTIONS.filter(
      (section) => section.required && !section.pattern.test(content)
    );

    if (missingSections.length === 0) {
      return 'No fixes needed.';
    }

    // Add missing sections
    for (const section of missingSections) {
      const template = this.getSectionTemplate(section.name);
      updatedContent += `\n\n${template}`;
    }

    if (!options.dryRun) {
      fs.writeFileSync(filePath, updatedContent);
      return `Fixed ${missingSections.length} section(s) in ${filePath}`;
    }

    return `Would add ${missingSections.length} section(s): ${missingSections.map((s) => s.name).join(', ')}`;
  }

  private getSectionTemplate(sectionName: string): string {
    const templates: Record<string, string> = {
      Overview: `## Overview

[TODO: Add service overview and purpose]

`,
      'Service Details': `## Service Details

- **Name:** \`[service-name]\`
- **Port:** \`[port]\`
- **Base URL:** \`[base-url]\`
- **Type:** [type]

`,
      'API Contract': `## API Contract

### Endpoints

\`\`\`typescript
GET /endpoint
Request: {}
Response: {}
\`\`\`

`,
      'Data Model': `## Data Model

\`\`\`prisma
model Entity {
  id String @id @default(uuid())
}
\`\`\`

`,
      Dependencies: `## Dependencies

- dependency-1
- dependency-2

`,
    };

    return templates[sectionName] || `## ${sectionName}\n\n[TODO: Add content]\n`;
  }

  /**
   * Generate a new spec file from template
   */
  async generate(serviceName: string): Promise<string> {
    const specPath = path.join(this.specsDir, `${serviceName}-service.md`);

    if (fs.existsSync(specPath)) {
      throw new Error(`Spec file already exists: ${specPath}`);
    }

    const template = this.getSpecTemplate(serviceName);
    fs.writeFileSync(specPath, template);

    return specPath;
  }

  private getSpecTemplate(serviceName: string): string {
    const capitalizedName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);

    return `# ${capitalizedName} Service Specification

**Version:** 1.0.0
**Status:** Draft
**Owner:** [Team/Person]
**Dependencies:** [List dependencies]

---

## Overview

[TODO: Add comprehensive service overview]

## Service Details

- **Name:** \`${serviceName}-service\`
- **Port:** \`[port]\`
- **Base URL:** \`/api/v1/${serviceName}\`
- **Type:** [Stateless/Stateful]

## Architecture

\`\`\`
[TODO: Add architecture diagram]
\`\`\`

## API Contract

### Endpoints

\`\`\`typescript
GET /api/v1/${serviceName}/health
Response: {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
}
\`\`\`

## Data Model

\`\`\`prisma
// TODO: Add data models
\`\`\`

## Dependencies

- [dependency-1]
- [dependency-2]

## Implementation Plan

### Phase 1: Setup (X hours)
1. Generate service with Nx
2. Set up dependencies

### Phase 2: Core Features (X hours)
1. Implement core functionality

## Testing

### Unit Tests
- [test scenario 1]

### Integration Tests
- [test scenario 1]

## Monitoring

### Metrics
- [metric 1]

### Alerts
- [alert 1]

## Performance Targets

- Response Time: < Xms (P95)
- Throughput: X req/sec
- Availability: 99.9%

## Security

[TODO: Add security considerations]

## Deployment

[TODO: Add deployment configuration]

## Changelog

- **${new Date().toISOString().split('T')[0]}:** Initial specification created
`;
  }

  /**
   * Sync spec with implementation
   */
  async sync(serviceName: string): Promise<string> {
    const specPath = path.join(this.specsDir, `${serviceName}-service.md`);
    const servicePath = path.join(this.packagesDir, serviceName);

    if (!fs.existsSync(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }

    if (!fs.existsSync(servicePath)) {
      throw new Error(`Service implementation not found: ${servicePath}`);
    }

    // Extract actual endpoints from implementation
    const endpoints = await this.extractEndpointsFromCode(servicePath);

    // Extract actual models from Prisma schema
    const models = await this.extractModelsFromPrisma(servicePath);

    // Update spec file
    let content = fs.readFileSync(specPath, 'utf-8');

    // Update changelog
    const changelogEntry = `- **${new Date().toISOString().split('T')[0]}:** Synced with implementation`;
    if (!content.includes(changelogEntry)) {
      content = content.replace(
        /## Changelog\n/,
        `## Changelog\n\n${changelogEntry}\n`
      );
    }

    fs.writeFileSync(specPath, content);

    return `Synced spec with implementation: ${endpoints.length} endpoints, ${models.length} models`;
  }

  private async extractEndpointsFromCode(servicePath: string): Promise<string[]> {
    // TODO: Parse TypeScript files to extract actual endpoints
    return [];
  }

  private async extractModelsFromPrisma(servicePath: string): Promise<string[]> {
    const prismaPath = path.join(servicePath, 'prisma', 'schema.prisma');
    if (!fs.existsSync(prismaPath)) {
      return [];
    }

    const content = fs.readFileSync(prismaPath, 'utf-8');
    const modelMatches = content.match(/model\s+(\w+)/g) || [];
    return modelMatches.map((m) => m.replace('model ', ''));
  }
}

// CLI Setup
const program = new Command();
const validator = new SpecValidator();

program
  .name('spec-validator')
  .description('GitHub Spec Kit validator and coverage tool')
  .version('1.0.0');

program
  .command('validate [file]')
  .description('Validate spec file(s)')
  .option('-f, --format <type>', 'Output format (table|json)', 'table')
  .action(async (file, options) => {
    try {
      const results = await validator.validate(file);

      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        console.log(chalk.bold('\nSpec Validation Results\n'));

        for (const result of results) {
          const statusIcon = result.valid ? chalk.green('✓') : chalk.red('✗');
          console.log(`${statusIcon} ${result.file} (Score: ${result.score}%)`);

          if (result.errors.length > 0) {
            console.log(chalk.red('  Errors:'));
            result.errors.forEach((err) => {
              console.log(chalk.red(`    - ${err.section}: ${err.message}`));
            });
          }

          if (result.warnings.length > 0) {
            console.log(chalk.yellow('  Warnings:'));
            result.warnings.forEach((warn) => {
              console.log(chalk.yellow(`    - ${warn.section}: ${warn.message}`));
            });
          }

          console.log();
        }

        const totalValid = results.filter((r) => r.valid).length;
        const avgScore = Math.round(
          results.reduce((sum, r) => sum + r.score, 0) / results.length
        );

        console.log(chalk.bold('Summary:'));
        console.log(`  Valid: ${totalValid}/${results.length}`);
        console.log(`  Average Score: ${avgScore}%`);
      }

      process.exit(results.every((r) => r.valid) ? 0 : 1);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('coverage')
  .description('Generate spec coverage report')
  .option('-f, --format <type>', 'Output format (table|json|html|markdown)', 'table')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      const report = await validator.coverage();

      let output = '';

      if (options.format === 'json') {
        output = JSON.stringify(report, null, 2);
      } else if (options.format === 'html') {
        output = generateHTMLReport(report);
      } else if (options.format === 'markdown') {
        output = generateMarkdownReport(report);
      } else {
        console.log(chalk.bold('\nSpec Coverage Report\n'));
        console.log(`Total Specs: ${report.totalSpecs}`);
        console.log(`Valid Specs: ${report.validSpecs}`);
        console.log(
          `Coverage: ${chalk.bold(report.coveragePercentage + '%')}\n`
        );

        if (report.missingSpecs.length > 0) {
          console.log(chalk.yellow('Missing Specs:'));
          report.missingSpecs.forEach((spec) => {
            console.log(chalk.yellow(`  - ${spec}`));
          });
          console.log();
        }

        if (report.orphanedImplementations.length > 0) {
          console.log(chalk.yellow('Specs Without Implementation:'));
          report.orphanedImplementations.forEach((impl) => {
            console.log(chalk.yellow(`  - ${impl}`));
          });
          console.log();
        }

        console.log(chalk.bold('Spec Files:'));
        report.specFiles.forEach((spec) => {
          const icon = spec.completeness === 100 ? chalk.green('✓') : chalk.yellow('○');
          console.log(
            `${icon} ${spec.service} (${spec.completeness}%)`
          );
          if (spec.missingSections.length > 0) {
            console.log(
              chalk.gray(`    Missing: ${spec.missingSections.join(', ')}`)
            );
          }
        });

        return;
      }

      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(chalk.green(`Report saved to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('generate <service>')
  .description('Generate new spec file from template')
  .action(async (service) => {
    try {
      const specPath = await validator.generate(service);
      console.log(chalk.green(`✓ Created spec: ${specPath}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('sync <service>')
  .description('Sync spec with implementation')
  .action(async (service) => {
    try {
      const result = await validator.sync(service);
      console.log(chalk.green(`✓ ${result}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('fix <file>')
  .description('Auto-fix spec file by adding missing sections')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .action(async (file, options) => {
    try {
      const result = await validator.autoFix(file, options);
      console.log(chalk.green(`✓ ${result}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

function generateHTMLReport(report: CoverageReport): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Spec Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: #0066cc; color: white; padding: 20px; border-radius: 8px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: #f5f5f5; padding: 20px; border-radius: 8px; flex: 1; }
    .stat-value { font-size: 2em; font-weight: bold; color: #0066cc; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #0066cc; color: white; }
    .complete { color: green; }
    .incomplete { color: orange; }
    .missing { color: red; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Spec Coverage Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-label">Total Specs</div>
      <div class="stat-value">${report.totalSpecs}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Valid Specs</div>
      <div class="stat-value">${report.validSpecs}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Coverage</div>
      <div class="stat-value">${report.coveragePercentage}%</div>
    </div>
  </div>

  <h2>Spec Files</h2>
  <table>
    <thead>
      <tr>
        <th>Service</th>
        <th>File</th>
        <th>Completeness</th>
        <th>Implementation</th>
        <th>Missing Sections</th>
      </tr>
    </thead>
    <tbody>
      ${report.specFiles
        .map(
          (spec) => `
        <tr>
          <td>${spec.service}</td>
          <td>${spec.file}</td>
          <td class="${spec.completeness === 100 ? 'complete' : 'incomplete'}">${spec.completeness}%</td>
          <td>${spec.hasImplementation ? '✓' : '✗'}</td>
          <td>${spec.missingSections.join(', ') || 'None'}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  ${
    report.missingSpecs.length > 0
      ? `
  <h2>Missing Specs</h2>
  <ul>
    ${report.missingSpecs.map((spec) => `<li class="missing">${spec}</li>`).join('')}
  </ul>
  `
      : ''
  }

  ${
    report.orphanedImplementations.length > 0
      ? `
  <h2>Specs Without Implementation</h2>
  <ul>
    ${report.orphanedImplementations.map((impl) => `<li class="missing">${impl}</li>`).join('')}
  </ul>
  `
      : ''
  }
</body>
</html>`;
}

function generateMarkdownReport(report: CoverageReport): string {
  return `# Spec Coverage Report

**Generated:** ${new Date().toISOString()}

## Summary

- **Total Specs:** ${report.totalSpecs}
- **Valid Specs:** ${report.validSpecs}
- **Coverage:** ${report.coveragePercentage}%

## Spec Files

| Service | File | Completeness | Implementation | Missing Sections |
|---------|------|--------------|----------------|------------------|
${report.specFiles
  .map(
    (spec) =>
      `| ${spec.service} | ${spec.file} | ${spec.completeness}% | ${spec.hasImplementation ? '✓' : '✗'} | ${spec.missingSections.join(', ') || 'None'} |`
  )
  .join('\n')}

${
  report.missingSpecs.length > 0
    ? `
## Missing Specs

${report.missingSpecs.map((spec) => `- ${spec}`).join('\n')}
`
    : ''
}

${
  report.orphanedImplementations.length > 0
    ? `
## Specs Without Implementation

${report.orphanedImplementations.map((impl) => `- ${impl}`).join('\n')}
`
    : ''
}
`;
}

// Run CLI
program.parse();
