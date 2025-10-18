#!/usr/bin/env node

import { DocumentationGeneratorService } from './generator';
import * as path from 'path';
import * as fs from 'fs';

interface CliOptions {
  command: 'generate' | 'validate' | 'metrics';
  package?: string;
  output?: string;
  format?: string;
  type?: 'all' | 'readme' | 'api' | 'types' | 'jsdoc';
  fix?: boolean;
}

class DocumentationCli {
  private generator: DocumentationGeneratorService;

  constructor() {
    this.generator = new DocumentationGeneratorService();
  }

  async run(options: CliOptions): Promise<void> {
    switch (options.command) {
      case 'generate':
        await this.generate(options);
        break;

      case 'validate':
        await this.validate(options);
        break;

      case 'metrics':
        await this.showMetrics(options);
        break;

      default:
        this.showHelp();
    }
  }

  private async generate(options: CliOptions): Promise<void> {
    console.log('📝 Generating documentation...\n');

    const packages = this.getPackages(options.package);

    for (const pkg of packages) {
      console.log(`Processing ${pkg}...`);

      try {
        const packagePath = path.join(process.cwd(), 'packages', pkg);

        if (!fs.existsSync(packagePath)) {
          console.error(`Package not found: ${pkg}`);
          continue;
        }

        const docs = await this.generator.generatePackageDocumentation({
          packagePath,
          outputPath: options.output,
          includeExamples: true,
          useAI: true,
        });

        // Write documentation files
        await this.writeDocumentation(packagePath, docs, options.type || 'all');

        console.log(`✓ Documentation generated for ${pkg}\n`);
      } catch (error) {
        console.error(`✗ Error generating docs for ${pkg}:`, error);
      }
    }

    console.log('✓ Documentation generation complete!');
  }

  private async validate(options: CliOptions): Promise<void> {
    console.log('🔍 Validating documentation...\n');

    const packages = this.getPackages(options.package);
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const pkg of packages) {
      const packagePath = path.join(process.cwd(), 'packages', pkg);

      if (!fs.existsSync(packagePath)) {
        continue;
      }

      console.log(`Validating ${pkg}...`);

      const result = this.generator.validateDocumentation(packagePath);

      if (result.errors.length > 0) {
        console.log('\n  Errors:');
        result.errors.forEach(error => console.log(`    ✗ ${error}`));
        totalErrors += result.errors.length;
      }

      if (result.warnings.length > 0) {
        console.log('\n  Warnings:');
        result.warnings.forEach(warning => console.log(`    ⚠ ${warning}`));
        totalWarnings += result.warnings.length;
      }

      if (result.valid) {
        console.log('  ✓ Documentation is valid\n');
      } else {
        console.log('');
      }
    }

    console.log(`\nValidation complete:`);
    console.log(`  Errors: ${totalErrors}`);
    console.log(`  Warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
      process.exit(1);
    }
  }

  private async showMetrics(options: CliOptions): Promise<void> {
    console.log('📊 Documentation Metrics\n');

    const packages = this.getPackages(options.package);

    for (const pkg of packages) {
      const packagePath = path.join(process.cwd(), 'packages', pkg);

      if (!fs.existsSync(packagePath)) {
        continue;
      }

      console.log(`\n${pkg}:`);

      const metrics = this.generator.calculateMetrics(packagePath);

      console.log(`  Coverage:     ${metrics.coverage.toFixed(1)}%`);
      console.log(`  Freshness:    ${metrics.freshness.toFixed(1)}%`);
      console.log(`  Completeness: ${metrics.completeness.toFixed(1)}%`);
      console.log(`  Total Elements:     ${metrics.elements.total}`);
      console.log(`  Documented:         ${metrics.elements.documented}`);
      console.log(`  With Examples:      ${metrics.elements.withExamples}`);

      // Visual bar
      const coverageBar = this.createBar(metrics.coverage);
      console.log(`  ${coverageBar}`);
    }

    console.log('');
  }

  private async writeDocumentation(
    packagePath: string,
    docs: any,
    type: string
  ): Promise<void> {
    if (type === 'all' || type === 'readme') {
      const readmePath = path.join(packagePath, 'README.md');
      fs.writeFileSync(readmePath, docs.readme, 'utf-8');
      console.log(`  ✓ README.md`);
    }

    if (type === 'all' || type === 'api') {
      const apiPath = path.join(packagePath, 'API.md');
      fs.writeFileSync(apiPath, docs.api, 'utf-8');
      console.log(`  ✓ API.md`);
    }

    if (type === 'all' || type === 'types') {
      const typesPath = path.join(packagePath, 'TYPES.md');
      fs.writeFileSync(typesPath, docs.types, 'utf-8');
      console.log(`  ✓ TYPES.md`);
    }

    if (docs.changelog && (type === 'all' || type === 'changelog')) {
      const changelogPath = path.join(packagePath, 'CHANGELOG.md');
      fs.writeFileSync(changelogPath, docs.changelog, 'utf-8');
      console.log(`  ✓ CHANGELOG.md`);
    }
  }

  private getPackages(packageFilter?: string): string[] {
    const packagesDir = path.join(process.cwd(), 'packages');

    if (!fs.existsSync(packagesDir)) {
      console.error('Packages directory not found');
      process.exit(1);
    }

    let packages = fs.readdirSync(packagesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    if (packageFilter) {
      packages = packages.filter(pkg => pkg === packageFilter);
    }

    return packages;
  }

  private createBar(percentage: number, width: number = 40): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    let color = '';
    if (percentage >= 80) color = '\x1b[32m'; // Green
    else if (percentage >= 60) color = '\x1b[33m'; // Yellow
    else color = '\x1b[31m'; // Red

    return `${color}${bar}\x1b[0m ${percentage.toFixed(1)}%`;
  }

  private showHelp(): void {
    console.log(`
Documentation Generator CLI

Usage:
  pnpm generate:docs [options]

Commands:
  generate    Generate documentation
  validate    Validate documentation completeness
  metrics     Show documentation metrics

Options:
  --package <name>     Generate docs for specific package
  --output <path>      Output directory
  --type <type>        Documentation type (all|readme|api|types|jsdoc)
  --fix                Automatically fix validation issues

Examples:
  # Generate all documentation
  pnpm generate:docs

  # Generate README for specific package
  pnpm generate:docs --package auth --type readme

  # Validate documentation
  pnpm docs:validate

  # Show metrics
  pnpm docs:validate --command metrics
    `);
  }
}

// Parse command line arguments
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  const options: CliOptions = {
    command: 'generate',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--command':
        options.command = args[++i] as any;
        break;
      case '--package':
        options.package = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--type':
        options.type = args[++i] as any;
        break;
      case '--format':
        options.format = args[++i];
        break;
      case '--fix':
        options.fix = true;
        break;
      case '--help':
      case '-h':
        new DocumentationCli().showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const cli = new DocumentationCli();

  cli.run(options).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { DocumentationCli, CliOptions };
