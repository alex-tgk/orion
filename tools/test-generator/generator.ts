import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  TestGenerationConfig,
  SourceFileAnalysis,
  GeneratedTest,
  TestType,
  TestGenerationOptions,
  TestQualityReport,
} from './types';
import { CodeAnalyzer } from './analyzers/code-analyzer';
import { CoverageAnalyzer } from './analyzers/coverage-analyzer';
import {
  generateControllerTest,
  generateServiceTest,
  generateIntegrationTest,
} from './templates';

const execAsync = promisify(exec);

/**
 * Main test generation service using Claude API
 */
export class TestGeneratorService {
  private anthropic: Anthropic;
  private codeAnalyzer: CodeAnalyzer;
  private coverageAnalyzer: CoverageAnalyzer;
  private config: TestGenerationConfig;

  constructor(config: TestGenerationConfig) {
    this.config = config;

    const apiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.anthropic = new Anthropic({ apiKey });
    this.codeAnalyzer = new CodeAnalyzer(
      path.join(config.projectRoot, 'tsconfig.json')
    );
    this.coverageAnalyzer = new CoverageAnalyzer(config.projectRoot);
  }

  /**
   * Generate tests for a specific file
   */
  async generateTestsForFile(
    filePath: string,
    options: TestGenerationOptions = {}
  ): Promise<GeneratedTest[]> {
    console.log(`Analyzing ${filePath}...`);
    const analysis = await this.codeAnalyzer.analyzeFile(filePath);

    console.log(`Generating tests using Claude API...`);
    const generatedTests: GeneratedTest[] = [];

    // Generate unit tests
    if (!options.includeIntegrationTests || options.includeIntegrationTests === false) {
      const unitTest = await this.generateUnitTest(analysis, options);
      generatedTests.push(unitTest);
    }

    // Generate integration tests if requested
    if (options.includeIntegrationTests) {
      const integrationTest = await this.generateIntegrationTestWithAI(
        analysis,
        options
      );
      generatedTests.push(integrationTest);
    }

    return generatedTests;
  }

  /**
   * Generate unit test using Claude API
   */
  private async generateUnitTest(
    analysis: SourceFileAnalysis,
    options: TestGenerationOptions
  ): Promise<GeneratedTest> {
    // First, generate base template
    let baseTemplate = '';
    if (analysis.fileType === 'controller') {
      baseTemplate = generateControllerTest(analysis);
    } else if (analysis.fileType === 'service') {
      baseTemplate = generateServiceTest(analysis);
    } else {
      baseTemplate = this.generateGenericTemplate(analysis);
    }

    // Enhance with Claude API
    const enhancedContent = await this.enhanceTestWithClaude(
      analysis,
      baseTemplate,
      options
    );

    const testFilePath = analysis.filePath.replace('.ts', '.spec.ts');

    return {
      filePath: testFilePath,
      content: enhancedContent,
      testType: 'unit',
      coverage: {
        expectedLines: 0,
        expectedFunctions: 0,
        expectedBranches: 0,
      },
      scenarios: [],
    };
  }

  /**
   * Enhance test with Claude API for better coverage
   */
  private async enhanceTestWithClaude(
    analysis: SourceFileAnalysis,
    baseTemplate: string,
    options: TestGenerationOptions
  ): Promise<string> {
    const prompt = this.buildEnhancementPrompt(analysis, baseTemplate, options);

    try {
      const message = await this.anthropic.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 8000,
        temperature: this.config.temperature || 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const response = message.content[0];
      if (response.type === 'text') {
        return this.extractCodeFromResponse(response.text);
      }

      return baseTemplate;
    } catch (error) {
      console.error('Error calling Claude API:', error);
      return baseTemplate;
    }
  }

  /**
   * Build prompt for Claude to enhance tests
   */
  private buildEnhancementPrompt(
    analysis: SourceFileAnalysis,
    baseTemplate: string,
    options: TestGenerationOptions
  ): string {
    return `You are an expert in writing comprehensive tests for NestJS applications using Jest.

Given the following source code analysis and base test template, generate a complete, production-ready test suite.

SOURCE CODE:
\`\`\`typescript
${analysis.sourceCode}
\`\`\`

BASE TEMPLATE:
\`\`\`typescript
${baseTemplate}
\`\`\`

FILE TYPE: ${analysis.fileType}
CLASS NAME: ${analysis.className || 'N/A'}

REQUIREMENTS:
1. Follow the Arrange-Act-Assert pattern
2. Test all public methods with comprehensive scenarios
3. Include happy path, edge cases, and error scenarios
4. Mock all dependencies properly
5. Include null/undefined checks
6. Test validation logic
7. Test error handling and exceptions
8. Use descriptive test names
9. Add TODO comments where manual intervention is needed
${options.includeEdgeCases ? '10. Include comprehensive edge case testing' : ''}
${options.includeErrorScenarios ? '11. Include extensive error scenario testing' : ''}
${options.generateFixtures ? '12. Generate test fixtures and mock data' : ''}

PATTERN TO FOLLOW:
- Use jest.fn() for mocks
- Use jest.Mocked<T> for typed mocks
- Clear mocks in beforeEach
- Reset mocks in afterEach
- Group related tests in describe blocks
- Keep tests isolated and independent
- Use meaningful variable names
- Add comments explaining complex test logic

OUTPUT:
Return ONLY the complete test file content, with no additional explanation. The code should be ready to save and run.`;
  }

  /**
   * Generate integration test with AI assistance
   */
  private async generateIntegrationTestWithAI(
    analysis: SourceFileAnalysis,
    options: TestGenerationOptions
  ): Promise<GeneratedTest> {
    const baseTemplate = generateIntegrationTest(analysis);
    const enhancedContent = await this.enhanceIntegrationTest(
      analysis,
      baseTemplate,
      options
    );

    const testFilePath = analysis.filePath.replace(
      '.ts',
      '.integration.spec.ts'
    );

    return {
      filePath: testFilePath,
      content: enhancedContent,
      testType: 'integration',
      coverage: {
        expectedLines: 0,
        expectedFunctions: 0,
        expectedBranches: 0,
      },
      scenarios: [],
    };
  }

  /**
   * Enhance integration test with Claude
   */
  private async enhanceIntegrationTest(
    analysis: SourceFileAnalysis,
    baseTemplate: string,
    options: TestGenerationOptions
  ): Promise<string> {
    const prompt = `You are an expert in writing integration tests for NestJS applications.

Generate a comprehensive integration test suite for this ${analysis.fileType}:

SOURCE CODE:
\`\`\`typescript
${analysis.sourceCode}
\`\`\`

BASE TEMPLATE:
\`\`\`typescript
${baseTemplate}
\`\`\`

The integration tests should:
1. Test the full request/response cycle
2. Include database operations
3. Test API endpoints with supertest
4. Test error handling and validation
5. Test concurrent operations
6. Test performance benchmarks
7. Mock external services but use real database connections

Return ONLY the complete integration test file.`;

    try {
      const message = await this.anthropic.messages.create({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 8000,
        temperature: this.config.temperature || 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const response = message.content[0];
      if (response.type === 'text') {
        return this.extractCodeFromResponse(response.text);
      }

      return baseTemplate;
    } catch (error) {
      console.error('Error generating integration test:', error);
      return baseTemplate;
    }
  }

  /**
   * Extract code from Claude's response
   */
  private extractCodeFromResponse(response: string): string {
    // Remove markdown code blocks if present
    const codeBlockRegex = /```(?:typescript|ts)?\n([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // If no code block, return the whole response
    return response.trim();
  }

  /**
   * Generate generic test template for utilities and other files
   */
  private generateGenericTemplate(analysis: SourceFileAnalysis): string {
    const className = analysis.className || 'Function';

    return `import { Test, TestingModule } from '@nestjs/testing';

describe('${className}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      // TODO: Add test
    });
  });

  // TODO: Add comprehensive test cases
});
`;
  }

  /**
   * Validate and quality check generated tests
   */
  async validateGeneratedTests(
    generatedTests: GeneratedTest[]
  ): Promise<TestQualityReport[]> {
    const reports: TestQualityReport[] = [];

    for (const test of generatedTests) {
      console.log(`Validating ${test.filePath}...`);

      // Write test to temporary location
      const tempFile = test.filePath + '.tmp';
      await fs.writeFile(tempFile, test.content, 'utf-8');

      const report: TestQualityReport = {
        compiles: false,
        passes: false,
        errors: [],
        warnings: [],
        suggestions: [],
        coverageImprovement: 0,
      };

      try {
        // Check if it compiles
        await execAsync(`npx tsc --noEmit ${tempFile}`, {
          cwd: this.config.projectRoot,
        });
        report.compiles = true;
      } catch (error: any) {
        report.compiles = false;
        report.errors.push(`Compilation error: ${error.message}`);
      }

      // Try to run the test
      if (report.compiles) {
        try {
          await execAsync(`npx jest ${tempFile} --passWithNoTests`, {
            cwd: this.config.projectRoot,
          });
          report.passes = true;
        } catch (error: any) {
          report.passes = false;
          report.errors.push(`Test execution error: ${error.message}`);
        }
      }

      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});

      reports.push(report);
    }

    return reports;
  }

  /**
   * Save generated tests to disk
   */
  async saveGeneratedTests(generatedTests: GeneratedTest[]): Promise<void> {
    for (const test of generatedTests) {
      console.log(`Saving ${test.filePath}...`);

      // Check if test file already exists
      const exists = await fs
        .access(test.filePath)
        .then(() => true)
        .catch(() => false);

      if (exists) {
        console.log(`Warning: ${test.filePath} already exists. Backing up...`);
        await fs.copyFile(test.filePath, test.filePath + '.backup');
      }

      await fs.writeFile(test.filePath, test.content, 'utf-8');
      console.log(`Saved ${test.filePath}`);
    }
  }

  /**
   * Generate tests for all files in a service
   */
  async generateTestsForService(
    serviceName: string,
    options: TestGenerationOptions = {}
  ): Promise<void> {
    const serviceDir = path.join(
      this.config.projectRoot,
      'packages',
      serviceName
    );

    console.log(`Generating tests for service: ${serviceName}`);

    // Find all TypeScript files without tests
    const files = await this.findFilesNeedingTests(serviceDir);

    console.log(`Found ${files.length} files needing tests`);

    for (const file of files) {
      try {
        const tests = await this.generateTestsForFile(file, options);
        const reports = await this.validateGeneratedTests(tests);

        // Only save if tests are valid
        const allValid = reports.every((r) => r.compiles && r.passes);
        if (allValid) {
          await this.saveGeneratedTests(tests);
        } else {
          console.error(`Generated tests for ${file} have issues:`);
          reports.forEach((r) => {
            r.errors.forEach((e) => console.error(`  - ${e}`));
          });
        }
      } catch (error) {
        console.error(`Error generating tests for ${file}:`, error);
      }
    }
  }

  /**
   * Find files that need tests
   */
  private async findFilesNeedingTests(dir: string): Promise<string[]> {
    const files: string[] = [];

    const findFiles = async (currentDir: string): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', 'coverage'].includes(entry.name)) {
            await findFiles(fullPath);
          }
        } else if (
          entry.name.endsWith('.ts') &&
          !entry.name.includes('.spec.') &&
          !entry.name.includes('.test.') &&
          !entry.name.endsWith('.d.ts') &&
          entry.name !== 'main.ts'
        ) {
          const testFile = fullPath.replace('.ts', '.spec.ts');
          const exists = await fs
            .access(testFile)
            .then(() => true)
            .catch(() => false);

          if (!exists) {
            files.push(fullPath);
          }
        }
      }
    };

    await findFiles(dir);
    return files;
  }
}
