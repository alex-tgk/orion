import Anthropic from '@anthropic-ai/sdk';
import { DocumentationConfig, FileChange, DocumentationIssue, AnalysisResult } from '../types';

export class DocumentationAnalyzer {
  private config: DocumentationConfig;
  private anthropic: Anthropic;

  constructor(config: DocumentationConfig, anthropic: Anthropic) {
    this.config = config;
    this.anthropic = anthropic;
  }

  async analyze(files: FileChange[]): Promise<AnalysisResult<DocumentationIssue>> {
    const issues: DocumentationIssue[] = [];

    for (const file of files) {
      if (this.shouldAnalyzeFile(file)) {
        issues.push(...this.checkPublicApiDocs(file));
        issues.push(...this.checkComplexFunctionDocs(file));
      }
    }

    // AI-powered documentation analysis
    const aiIssues = await this.aiAnalysis(files);
    issues.push(...aiIssues);

    return {
      category: 'documentation',
      issues,
      summary: this.generateSummary(issues),
      metrics: this.calculateMetrics(issues, files),
    };
  }

  private checkPublicApiDocs(file: FileChange): DocumentationIssue[] {
    const issues: DocumentationIssue[] = [];

    if (!this.config.checks.publicApi) {
      return issues;
    }

    // Check for exported classes without JSDoc
    const classPattern = /export\s+class\s+(\w+)/g;
    const classMatches = file.content.matchAll(classPattern);

    for (const match of classMatches) {
      const lineNum = this.getLineNumber(file.content, match.index || 0);
      const hasJsDoc = this.hasJsDocAbove(file.content, match.index || 0);

      if (!hasJsDoc) {
        issues.push({
          type: 'missing-class-docs',
          severity: 'medium',
          file: file.filename,
          line: lineNum,
          message: `Exported class '${match[1]}' missing documentation`,
          detail: 'Public classes should have JSDoc comments',
          recommendation: 'Add JSDoc with class description and usage examples',
          category: 'api-documentation',
        });
      }
    }

    // Check for exported functions without JSDoc
    const functionPattern = /export\s+(async\s+)?function\s+(\w+)/g;
    const functionMatches = file.content.matchAll(functionPattern);

    for (const match of functionMatches) {
      const lineNum = this.getLineNumber(file.content, match.index || 0);
      const hasJsDoc = this.hasJsDocAbove(file.content, match.index || 0);

      if (!hasJsDoc) {
        issues.push({
          type: 'missing-function-docs',
          severity: 'medium',
          file: file.filename,
          line: lineNum,
          message: `Exported function '${match[2]}' missing documentation`,
          detail: 'Public functions should have JSDoc comments',
          recommendation: 'Add JSDoc with @param, @returns, and @throws tags',
          category: 'api-documentation',
        });
      }
    }

    return issues;
  }

  private checkComplexFunctionDocs(file: FileChange): DocumentationIssue[] {
    const issues: DocumentationIssue[] = [];

    if (!this.config.checks.complexFunctions) {
      return issues;
    }

    // Find complex functions (simplified check)
    const functionPattern = /(public|private|protected)?\s*(async\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
    const functionMatches = file.content.matchAll(functionPattern);

    for (const match of functionMatches) {
      const functionBody = this.extractFunctionBody(file.content, match.index || 0);
      const complexity = this.estimateComplexity(functionBody);

      if (complexity >= this.config.thresholds.complexityForDocs) {
        const lineNum = this.getLineNumber(file.content, match.index || 0);
        const hasJsDoc = this.hasJsDocAbove(file.content, match.index || 0);

        if (!hasJsDoc) {
          issues.push({
            type: 'complex-function-undocumented',
            severity: 'high',
            file: file.filename,
            line: lineNum,
            message: `Complex function '${match[3]}' missing documentation`,
            detail: `Function has complexity ${complexity}, exceeds threshold ${this.config.thresholds.complexityForDocs}`,
            recommendation: 'Add detailed JSDoc explaining the logic and parameters',
            category: 'code-documentation',
          });
        }
      }
    }

    return issues;
  }

  private async aiAnalysis(files: FileChange[]): Promise<DocumentationIssue[]> {
    const issues: DocumentationIssue[] = [];

    for (const file of files) {
      if (this.shouldAnalyzeFile(file)) {
        const prompt = this.buildDocumentationPrompt(file);

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

  private buildDocumentationPrompt(file: FileChange): string {
    return `Analyze this code for documentation quality. Focus on:
- JSDoc completeness for public APIs
- Parameter descriptions
- Return value documentation
- Exception documentation
- Usage examples
- Complex logic explanations
- Type definitions clarity

File: ${file.filename}
Code:
\`\`\`${this.getFileExtension(file.filename)}
${file.content.substring(0, 3000)}
\`\`\`

Return findings as JSON array:
[
  {
    "type": "issue-type",
    "severity": "high|medium|low",
    "file": "${file.filename}",
    "line": number,
    "message": "brief message",
    "detail": "detailed explanation",
    "recommendation": "documentation improvement",
    "category": "api-documentation|code-documentation|type-documentation"
  }
]`;
  }

  private parseAiResponse(response: string): DocumentationIssue[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing AI documentation response:', error);
      return [];
    }
  }

  private hasJsDocAbove(content: string, index: number): boolean {
    const beforeContent = content.substring(Math.max(0, index - 500), index);
    return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeContent);
  }

  private extractFunctionBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let inFunction = false;
    let result = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        inFunction = true;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inFunction) {
          return result;
        }
      }

      if (inFunction) {
        result += char;
      }
    }

    return result;
  }

  private estimateComplexity(content: string): number {
    const patterns = [/\bif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcase\b/g, /\bcatch\b/g, /\b&&\b/g, /\b\|\|\b/g];

    let complexity = 1;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      complexity += matches ? matches.length : 0;
    }

    return complexity;
  }

  private shouldAnalyzeFile(file: FileChange): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(file.filename) && !file.filename.includes('.spec.');
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop() || '';
    return ext === 'ts' || ext === 'tsx' ? 'typescript' : ext;
  }

  private generateSummary(issues: DocumentationIssue[]): string {
    const apiDocs = issues.filter((i) => i.category === 'api-documentation').length;
    const codeDocs = issues.filter((i) => i.category === 'code-documentation').length;

    return `Found ${issues.length} documentation issues: ${apiDocs} API, ${codeDocs} code`;
  }

  private calculateMetrics(issues: DocumentationIssue[], files: FileChange[]): Record<string, any> {
    const sourceFiles = files.filter((f) => this.shouldAnalyzeFile(f));

    // Calculate documentation coverage (simplified)
    const totalFunctions = sourceFiles.reduce((count, file) => {
      const matches = file.content.match(/function\s+\w+/g) || [];
      return count + matches.length;
    }, 0);

    const documentedFunctions = totalFunctions - issues.filter((i) => i.type.includes('function')).length;

    const coveragePercent = totalFunctions > 0 ? (documentedFunctions / totalFunctions) * 100 : 100;

    return {
      totalIssues: issues.length,
      apiDocIssues: issues.filter((i) => i.category === 'api-documentation').length,
      codeDocIssues: issues.filter((i) => i.category === 'code-documentation').length,
      estimatedCoverage: Math.round(coveragePercent),
      totalFunctions,
      documentedFunctions,
    };
  }
}
