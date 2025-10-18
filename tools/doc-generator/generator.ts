import Anthropic from '@anthropic-ai/sdk';
import { CodeAnalyzer, AnalysisResult } from './analyzers/code-analyzer';
import { ApiAnalyzer, ApiDocumentation } from './analyzers/api-analyzer';
import { MarkdownFormatter } from './formatters/markdown-formatter';
import { OpenApiFormatter } from './formatters/openapi-formatter';
import * as fs from 'fs';
import * as path from 'path';

export interface DocumentationOptions {
  packagePath: string;
  outputPath?: string;
  formats?: ('markdown' | 'html' | 'json')[];
  includeExamples?: boolean;
  useAI?: boolean;
  aiModel?: string;
}

export interface PackageDocumentation {
  readme: string;
  api: string;
  types: string;
  changelog?: string;
  examples?: string[];
}

export interface DocumentationMetrics {
  coverage: number;
  freshness: number;
  completeness: number;
  elements: {
    total: number;
    documented: number;
    withExamples: number;
  };
}

export class DocumentationGeneratorService {
  private codeAnalyzer: CodeAnalyzer;
  private apiAnalyzer: ApiAnalyzer;
  private markdownFormatter: MarkdownFormatter;
  private openApiFormatter: OpenApiFormatter;
  private anthropic?: Anthropic;
  private config: any;

  constructor(configPath?: string) {
    this.codeAnalyzer = new CodeAnalyzer();
    this.apiAnalyzer = new ApiAnalyzer();
    this.markdownFormatter = new MarkdownFormatter();
    this.openApiFormatter = new OpenApiFormatter();

    // Load configuration
    this.config = this.loadConfig(configPath);

    // Initialize Anthropic client if enabled
    if (this.config.documentation.generation.ai.enabled) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        this.anthropic = new Anthropic({ apiKey });
      }
    }
  }

  /**
   * Generate comprehensive documentation for a package
   */
  public async generatePackageDocumentation(
    options: DocumentationOptions
  ): Promise<PackageDocumentation> {
    console.log(`Generating documentation for ${options.packagePath}...`);

    // Analyze code
    const analysis = this.analyzePackage(options.packagePath);

    // Generate README
    const readme = await this.generateReadme(options.packagePath, analysis);

    // Generate API documentation
    const api = await this.generateApiDocs(options.packagePath, analysis);

    // Generate type documentation
    const types = await this.generateTypeDocs(analysis);

    // Generate examples if requested
    let examples: string[] | undefined;
    if (options.includeExamples) {
      examples = await this.generateExamples(analysis);
    }

    // Generate changelog
    const changelog = await this.generateChangelog(options.packagePath);

    return {
      readme,
      api,
      types,
      changelog,
      examples,
    };
  }

  /**
   * Generate README file for a package
   */
  public async generateReadme(packagePath: string, analysis?: Map<string, AnalysisResult>): Promise<string> {
    if (!analysis) {
      analysis = this.analyzePackage(packagePath);
    }

    const packageJson = this.loadPackageJson(packagePath);
    const sections: string[] = [];

    // Title and description
    sections.push(`# ${packageJson.name}\n`);
    sections.push(`> ${packageJson.description || 'No description provided'}\n`);

    // Badges
    sections.push(this.generateBadges(packageJson));

    // Table of contents
    sections.push('## Table of Contents\n');
    sections.push('- [Installation](#installation)');
    sections.push('- [Usage](#usage)');
    sections.push('- [API](#api)');
    sections.push('- [Configuration](#configuration)');
    sections.push('- [Examples](#examples)');
    sections.push('- [Contributing](#contributing)');
    sections.push('- [License](#license)\n');

    // Installation
    sections.push('## Installation\n');
    sections.push('```bash');
    sections.push('pnpm install');
    sections.push('```\n');

    // Usage section with AI-generated content
    sections.push('## Usage\n');
    const usageContent = await this.generateUsageSection(analysis);
    sections.push(usageContent);

    // API section
    sections.push('## API\n');
    const apiContent = this.generateApiSection(analysis);
    sections.push(apiContent);

    // Configuration
    sections.push('## Configuration\n');
    const configContent = await this.generateConfigSection(packagePath);
    sections.push(configContent);

    // Examples
    sections.push('## Examples\n');
    const examples = await this.generateExamples(analysis);
    sections.push(examples.join('\n\n'));

    // Contributing
    sections.push('## Contributing\n');
    sections.push('Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.\n');

    // License
    sections.push('## License\n');
    sections.push(`This project is licensed under the ${packageJson.license || 'MIT'} License.\n`);

    return sections.join('\n');
  }

  /**
   * Generate API documentation
   */
  public async generateApiDocs(packagePath: string, analysis?: Map<string, AnalysisResult>): Promise<string> {
    if (!analysis) {
      analysis = this.analyzePackage(packagePath);
    }

    // Find controller files
    const controllerFiles = this.findControllerFiles(packagePath);

    if (controllerFiles.length === 0) {
      return '# API Documentation\n\nNo API endpoints found.\n';
    }

    // Generate OpenAPI documentation
    const apiDoc = this.apiAnalyzer.analyzeControllers(controllerFiles);

    // Format as markdown
    return this.openApiFormatter.formatAsMarkdown(apiDoc);
  }

  /**
   * Generate type documentation
   */
  public async generateTypeDocs(analysis: Map<string, AnalysisResult>): Promise<string> {
    const sections: string[] = ['# Type Definitions\n'];

    for (const [file, result] of analysis) {
      const interfaces = result.elements.filter(e => e.type === 'interface');
      const types = result.elements.filter(e => e.type === 'type');
      const enums = result.elements.filter(e => e.type === 'enum');

      if (interfaces.length > 0 || types.length > 0 || enums.length > 0) {
        sections.push(`## ${path.basename(file)}\n`);

        for (const element of [...interfaces, ...types, ...enums]) {
          sections.push(`### ${element.name}\n`);
          if (element.description) {
            sections.push(`${element.description}\n`);
          }
          sections.push('');
        }
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate usage examples using AI
   */
  public async generateExamples(analysis: Map<string, AnalysisResult>): Promise<string[]> {
    const examples: string[] = [];

    // Extract key classes and functions
    const exportedElements = Array.from(analysis.values())
      .flatMap(result => result.elements)
      .filter(e => e.exported);

    for (const element of exportedElements.slice(0, 5)) {
      if (this.anthropic) {
        const example = await this.generateAIExample(element);
        examples.push(example);
      } else {
        examples.push(this.generateBasicExample(element));
      }
    }

    return examples;
  }

  /**
   * Generate changelog from git commits
   */
  public async generateChangelog(packagePath: string): Promise<string> {
    const sections: string[] = ['# Changelog\n'];
    sections.push('All notable changes to this package will be documented in this file.\n');

    // In a real implementation, would parse git log
    // For now, return placeholder
    sections.push('## [Unreleased]\n');
    sections.push('### Added');
    sections.push('- Initial implementation\n');

    return sections.join('\n');
  }

  /**
   * Generate JSDoc comments for code
   */
  public async generateJSDoc(filePath: string): Promise<string> {
    const analysis = this.codeAnalyzer.analyzeFile(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    let updatedContent = content;

    for (const element of analysis.elements) {
      if (element.exported && !element.jsdoc) {
        const jsdoc = await this.generateElementJSDoc(element);
        // In real implementation, would insert JSDoc at correct location
        console.log(`Generated JSDoc for ${element.name}`);
      }
    }

    return updatedContent;
  }

  /**
   * Calculate documentation metrics
   */
  public calculateMetrics(packagePath: string): DocumentationMetrics {
    const analysis = this.analyzePackage(packagePath);

    let total = 0;
    let documented = 0;
    let withExamples = 0;

    for (const result of analysis.values()) {
      for (const element of result.elements) {
        if (element.exported) {
          total++;
          if (element.jsdoc?.description) {
            documented++;
          }
          if (element.jsdoc?.examples && element.jsdoc.examples.length > 0) {
            withExamples++;
          }
        }
      }
    }

    const coverage = total > 0 ? (documented / total) * 100 : 0;
    const completeness = total > 0 ? (withExamples / total) * 100 : 0;

    return {
      coverage,
      freshness: 100, // Would calculate based on last update time
      completeness,
      elements: {
        total,
        documented,
        withExamples,
      },
    };
  }

  /**
   * Validate documentation completeness
   */
  public validateDocumentation(packagePath: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const metrics = this.calculateMetrics(packagePath);
    const errors: string[] = [];
    const warnings: string[] = [];

    const minCoverage = this.config.documentation.quality.coverage.minimum;
    if (metrics.coverage < minCoverage) {
      errors.push(`Documentation coverage ${metrics.coverage.toFixed(1)}% is below minimum ${minCoverage}%`);
    }

    if (metrics.completeness < 50) {
      warnings.push(`Only ${metrics.completeness.toFixed(1)}% of exported elements have examples`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Private helper methods

  private analyzePackage(packagePath: string): Map<string, AnalysisResult> {
    const srcPath = path.join(packagePath, 'src');
    return this.codeAnalyzer.analyzeDirectory(srcPath);
  }

  private loadPackageJson(packagePath: string): any {
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }
    return { name: path.basename(packagePath), version: '1.0.0' };
  }

  private loadConfig(configPath?: string): any {
    const defaultPath = path.join(__dirname, 'config.json');
    const targetPath = configPath || defaultPath;

    if (fs.existsSync(targetPath)) {
      return JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
    }

    return { documentation: { generation: { ai: { enabled: false } } } };
  }

  private generateBadges(packageJson: any): string {
    const badges: string[] = [];

    badges.push(`![Version](https://img.shields.io/badge/version-${packageJson.version}-blue.svg)`);
    badges.push(`![License](https://img.shields.io/badge/license-${packageJson.license || 'MIT'}-green.svg)`);

    return badges.join(' ') + '\n';
  }

  private async generateUsageSection(analysis: Map<string, AnalysisResult>): Promise<string> {
    if (!this.anthropic) {
      return 'See API documentation for usage details.\n';
    }

    const context = this.buildAnalysisContext(analysis);

    const message = await this.anthropic.messages.create({
      model: this.config.documentation.generation.ai.model,
      max_tokens: 1000,
      temperature: this.config.documentation.generation.ai.temperature,
      messages: [{
        role: 'user',
        content: `Generate a concise usage section for a README file based on this code analysis:\n\n${context}\n\nProvide practical examples and explain the main features.`,
      }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : 'See API documentation for usage details.\n';
  }

  private generateApiSection(analysis: Map<string, AnalysisResult>): string {
    const sections: string[] = [];

    for (const [file, result] of analysis) {
      const exported = result.elements.filter(e => e.exported);

      if (exported.length > 0) {
        sections.push(`### ${path.basename(file, '.ts')}\n`);

        for (const element of exported) {
          sections.push(`#### \`${element.name}\`\n`);
          if (element.description) {
            sections.push(`${element.description}\n`);
          }
        }
      }
    }

    return sections.join('\n');
  }

  private async generateConfigSection(packagePath: string): string {
    const configFiles = this.findConfigFiles(packagePath);

    if (configFiles.length === 0) {
      return 'No configuration required.\n';
    }

    return 'See configuration files for available options.\n';
  }

  private async generateAIExample(element: any): Promise<string> {
    if (!this.anthropic) {
      return this.generateBasicExample(element);
    }

    const message = await this.anthropic.messages.create({
      model: this.config.documentation.generation.ai.model,
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Generate a practical code example for this ${element.type}: ${element.name}\n\nMake it concise and show real-world usage.`,
      }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : this.generateBasicExample(element);
  }

  private generateBasicExample(element: any): string {
    return `### ${element.name}\n\n\`\`\`typescript\n// Example usage\n// TODO: Add example\n\`\`\`\n`;
  }

  private async generateElementJSDoc(element: any): Promise<string> {
    if (!this.anthropic) {
      return `/**\n * ${element.name}\n */\n`;
    }

    const message = await this.anthropic.messages.create({
      model: this.config.documentation.generation.ai.model,
      max_tokens: 300,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Generate JSDoc comment for this ${element.type} named ${element.name}. Include description and param/return tags if applicable.`,
      }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : `/**\n * ${element.name}\n */\n`;
  }

  private buildAnalysisContext(analysis: Map<string, AnalysisResult>): string {
    const context: string[] = [];

    for (const [file, result] of analysis) {
      context.push(`File: ${path.basename(file)}`);
      context.push(`Exports: ${result.exports.join(', ')}`);
      context.push(`Classes: ${result.metrics.classes}`);
      context.push(`Functions: ${result.metrics.functions}`);
      context.push('');
    }

    return context.join('\n');
  }

  private findControllerFiles(packagePath: string): string[] {
    const files: string[] = [];
    const srcPath = path.join(packagePath, 'src');

    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.controller.ts')) {
          files.push(fullPath);
        }
      }
    };

    walk(srcPath);
    return files;
  }

  private findConfigFiles(packagePath: string): string[] {
    const configPatterns = ['config.ts', 'configuration.ts', '.env.example'];
    const files: string[] = [];

    for (const pattern of configPatterns) {
      const configPath = path.join(packagePath, 'src', pattern);
      if (fs.existsSync(configPath)) {
        files.push(configPath);
      }
    }

    return files;
  }
}
