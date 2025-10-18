import Anthropic from '@anthropic-ai/sdk';
import { TestConfig, FileChange, TestIssue, AnalysisResult } from '../types';
import * as path from 'path';

export class TestAnalyzer {
  private config: TestConfig;
  private anthropic: Anthropic;

  constructor(config: TestConfig, anthropic: Anthropic) {
    this.config = config;
    this.anthropic = anthropic;
  }

  async analyze(files: FileChange[]): Promise<AnalysisResult<TestIssue>> {
    const issues: TestIssue[] = [];

    // Check for missing test files
    issues.push(...this.checkMissingTests(files));

    // Analyze test quality
    const testFiles = files.filter((f) => this.isTestFile(f.filename));
    for (const testFile of testFiles) {
      issues.push(...this.analyzeTestQuality(testFile));
    }

    // AI-powered test analysis
    const aiIssues = await this.aiAnalysis(files);
    issues.push(...aiIssues);

    return {
      category: 'test',
      issues,
      summary: this.generateSummary(issues),
      metrics: this.calculateMetrics(issues, files),
    };
  }

  private checkMissingTests(files: FileChange[]): TestIssue[] {
    const issues: TestIssue[] = [];

    for (const file of files) {
      if (this.shouldHaveTest(file)) {
        const testFile = this.getExpectedTestFile(file.filename);
        const hasTest = files.some((f) => f.filename === testFile);

        if (!hasTest) {
          issues.push({
            type: 'missing-test',
            severity: 'high',
            file: file.filename,
            message: 'Missing test file',
            detail: `Expected test file: ${testFile}`,
            recommendation: 'Create comprehensive unit tests for this file',
            category: 'coverage',
          });
        }
      }
    }

    return issues;
  }

  private analyzeTestQuality(file: FileChange): TestIssue[] {
    const issues: TestIssue[] = [];

    // Check for describe blocks
    if (!file.content.includes('describe(')) {
      issues.push({
        type: 'missing-structure',
        severity: 'medium',
        file: file.filename,
        line: 1,
        message: 'Test file missing describe blocks',
        detail: 'Tests should be organized in describe blocks',
        recommendation: 'Use describe blocks to group related tests',
        category: 'structure',
      });
    }

    // Check for assertions
    const itBlocks = file.content.match(/it\([^)]+\)/g) || [];
    const expectCalls = file.content.match(/expect\(/g) || [];

    if (itBlocks.length > expectCalls.length) {
      issues.push({
        type: 'missing-assertions',
        severity: 'high',
        file: file.filename,
        message: 'Test cases without assertions',
        detail: `Found ${itBlocks.length} tests but only ${expectCalls.length} assertions`,
        recommendation: 'Ensure every test has at least one assertion',
        category: 'quality',
      });
    }

    // Check for beforeEach/afterEach
    if (file.content.includes('new ') && !file.content.includes('beforeEach')) {
      issues.push({
        type: 'missing-setup',
        severity: 'medium',
        file: file.filename,
        message: 'Missing beforeEach setup',
        detail: 'Tests creating instances should use beforeEach for setup',
        recommendation: 'Use beforeEach for test setup to ensure isolation',
        category: 'structure',
      });
    }

    return issues;
  }

  private async aiAnalysis(files: FileChange[]): Promise<TestIssue[]> {
    const issues: TestIssue[] = [];

    // Analyze source files for test coverage
    const sourceFiles = files.filter((f) => !this.isTestFile(f.filename) && this.shouldHaveTest(f));

    for (const sourceFile of sourceFiles) {
      const testFile = files.find((f) => f.filename === this.getExpectedTestFile(sourceFile.filename));

      if (testFile) {
        const prompt = this.buildTestAnalysisPrompt(sourceFile, testFile);

        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
        issues.push(...this.parseAiResponse(responseText));
      }
    }

    return issues;
  }

  private buildTestAnalysisPrompt(sourceFile: FileChange, testFile: FileChange): string {
    return `Analyze test coverage and quality for this code.

Source File: ${sourceFile.filename}
\`\`\`typescript
${sourceFile.content.substring(0, 2000)}
\`\`\`

Test File: ${testFile.filename}
\`\`\`typescript
${testFile.content.substring(0, 2000)}
\`\`\`

Evaluate:
1. Are all public methods tested?
2. Are edge cases covered?
3. Are error scenarios tested?
4. Is test quality sufficient?
5. Are there any missing test scenarios?

Return findings as JSON array:
[
  {
    "type": "issue-type",
    "severity": "high|medium|low",
    "file": "filename",
    "line": number,
    "message": "brief message",
    "detail": "detailed explanation",
    "recommendation": "test improvement suggestion",
    "category": "coverage|quality|structure"
  }
]`;
  }

  private parseAiResponse(response: string): TestIssue[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing AI test response:', error);
      return [];
    }
  }

  private shouldHaveTest(file: FileChange): boolean {
    for (const pattern of this.config.patterns.requiredTests) {
      if (file.filename.match(new RegExp(pattern.filePattern)) && pattern.required) {
        return true;
      }
    }
    return false;
  }

  private getExpectedTestFile(filename: string): string {
    const dir = path.dirname(filename);
    const base = path.basename(filename, path.extname(filename));
    const ext = path.extname(filename);

    return path.join(dir, `${base}.spec${ext}`);
  }

  private isTestFile(filename: string): boolean {
    return this.config.patterns.testFiles.some((pattern) => {
      return filename.match(new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')));
    });
  }

  private generateSummary(issues: TestIssue[]): string {
    const missingTests = issues.filter((i) => i.type === 'missing-test').length;
    const qualityIssues = issues.filter((i) => i.category === 'quality').length;

    return `Found ${issues.length} test issues: ${missingTests} missing tests, ${qualityIssues} quality issues`;
  }

  private calculateMetrics(issues: TestIssue[], files: FileChange[]): Record<string, any> {
    const sourceFiles = files.filter((f) => !this.isTestFile(f.filename) && this.shouldHaveTest(f));
    const testFiles = files.filter((f) => this.isTestFile(f.filename));

    const coverageRatio = sourceFiles.length > 0 ? (testFiles.length / sourceFiles.length) * 100 : 100;

    return {
      totalIssues: issues.length,
      missingTests: issues.filter((i) => i.type === 'missing-test').length,
      qualityIssues: issues.filter((i) => i.category === 'quality').length,
      estimatedCoverage: Math.round(coverageRatio),
      sourceFiles: sourceFiles.length,
      testFiles: testFiles.length,
    };
  }
}
