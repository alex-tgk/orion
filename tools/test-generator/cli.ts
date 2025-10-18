#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { TestGeneratorService } from './generator';
import { TestGenerationConfig } from './types';
import { CoverageAnalyzer } from './analyzers/coverage-analyzer';

const program = new Command();

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const config: TestGenerationConfig = {
  projectRoot: process.cwd(),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  testFramework: 'jest',
  ...baseConfig,
};

program
  .name('test-generator')
  .description('AI-powered test generation for ORION')
  .version('1.0.0');

program
  .command('file <path>')
  .description('Generate tests for a specific file')
  .option('-i, --integration', 'Include integration tests')
  .option('-e, --edge-cases', 'Include comprehensive edge cases')
  .option('--error-scenarios', 'Include extensive error scenarios')
  .option('-f, --fixtures', 'Generate test fixtures')
  .action(async (filePath: string, options) => {
    const generator = new TestGeneratorService(config);

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    try {
      const tests = await generator.generateTestsForFile(absolutePath, {
        includeIntegrationTests: options.integration,
        includeEdgeCases: options.edgeCases,
        includeErrorScenarios: options.errorScenarios,
        generateFixtures: options.fixtures,
      });

      const reports = await generator.validateGeneratedTests(tests);

      if (reports.every((r) => r.compiles && r.passes)) {
        await generator.saveGeneratedTests(tests);
        console.log('✓ Tests generated and validated successfully');
      } else {
        console.error('✗ Generated tests have validation errors');
        reports.forEach((r, i) => {
          if (!r.compiles || !r.passes) {
            console.error(`\nTest ${i + 1}:`);
            r.errors.forEach((e) => console.error(`  - ${e}`));
          }
        });
        process.exit(1);
      }
    } catch (error) {
      console.error('Error generating tests:', error);
      process.exit(1);
    }
  });

program
  .command('service <name>')
  .description('Generate tests for all files in a service')
  .option('-i, --integration', 'Include integration tests')
  .option('-e, --edge-cases', 'Include comprehensive edge cases')
  .option('--error-scenarios', 'Include extensive error scenarios')
  .option('-f, --fixtures', 'Generate test fixtures')
  .action(async (serviceName: string, options) => {
    const generator = new TestGeneratorService(config);

    try {
      await generator.generateTestsForService(serviceName, {
        includeIntegrationTests: options.integration,
        includeEdgeCases: options.edgeCases,
        includeErrorScenarios: options.errorScenarios,
        generateFixtures: options.fixtures,
      });

      console.log(`✓ Tests generated for service: ${serviceName}`);
    } catch (error) {
      console.error('Error generating tests:', error);
      process.exit(1);
    }
  });

program
  .command('missing')
  .description('Generate tests only for files without existing tests')
  .option('-s, --service <name>', 'Limit to specific service')
  .action(async (options) => {
    const generator = new TestGeneratorService(config);

    if (options.service) {
      await generator.generateTestsForService(options.service, {
        includeIntegrationTests: false,
      });
    } else {
      console.error('Please specify a service with --service <name>');
      process.exit(1);
    }
  });

program
  .command('coverage')
  .description('Analyze test coverage and generate tests for low-coverage areas')
  .option('-s, --service <name>', 'Specific service to analyze')
  .option('-t, --threshold <number>', 'Coverage threshold (default: 60)', '60')
  .action(async (options) => {
    const analyzer = new CoverageAnalyzer(config.projectRoot);
    const threshold = parseInt(options.threshold);

    try {
      if (options.service) {
        const report = await analyzer.analyzeServiceCoverage(options.service);

        console.log(`\nCoverage Report for ${options.service}:`);
        console.log(`Overall Coverage: ${report.overallCoverage.toFixed(2)}%\n`);

        if (report.lowCoverageFiles.length > 0) {
          console.log('Low Coverage Files:');
          report.lowCoverageFiles.forEach((file) => {
            console.log(`  ${file.file}:`);
            console.log(`    Lines: ${file.lines.toFixed(1)}%`);
            console.log(`    Functions: ${file.functions.toFixed(1)}%`);
            console.log(`    Branches: ${file.branches.toFixed(1)}%`);
          });

          console.log('\nRecommendations:');
          report.recommendedTests.forEach((rec) => {
            console.log(`  - ${rec}`);
          });

          // Generate tests for low coverage files
          const generator = new TestGeneratorService(config);
          for (const file of report.lowCoverageFiles.slice(0, 5)) {
            if (file.lines < threshold) {
              console.log(`\nGenerating tests for ${file.file}...`);
              try {
                const tests = await generator.generateTestsForFile(file.file);
                await generator.saveGeneratedTests(tests);
              } catch (error) {
                console.error(`Failed to generate tests for ${file.file}:`, error);
              }
            }
          }
        } else {
          console.log('No low coverage files found!');
        }
      } else {
        const reports = await analyzer.analyzeAllCoverage();

        console.log('\nCoverage Summary:');
        reports.forEach((report) => {
          console.log(
            `${report.service}: ${report.overallCoverage.toFixed(2)}%`
          );
        });
      }
    } catch (error) {
      console.error('Error analyzing coverage:', error);
      process.exit(1);
    }
  });

program
  .command('all')
  .description('Generate tests for all services')
  .action(async () => {
    const packagesDir = path.join(config.projectRoot, 'packages');
    const services = fs
      .readdirSync(packagesDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => !name.includes('-e2e'));

    console.log(`Found ${services.length} services`);

    const generator = new TestGeneratorService(config);

    for (const service of services) {
      console.log(`\nGenerating tests for ${service}...`);
      try {
        await generator.generateTestsForService(service, {
          includeIntegrationTests: false,
        });
      } catch (error) {
        console.error(`Error generating tests for ${service}:`, error);
      }
    }

    console.log('\n✓ Test generation complete');
  });

program.parse(process.argv);
