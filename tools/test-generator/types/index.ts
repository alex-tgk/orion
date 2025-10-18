/**
 * Type definitions for the AI test generator
 */

export interface TestGenerationConfig {
  projectRoot: string;
  anthropicApiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  testFramework: 'jest' | 'vitest';
  patterns: {
    controller: string[];
    service: string[];
    resolver: string[];
    repository: string[];
    utility: string[];
    dto: string[];
  };
}

export interface SourceFileAnalysis {
  filePath: string;
  sourceCode: string;
  fileType: FileType;
  className?: string;
  functions: FunctionInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  decorators: DecoratorInfo[];
  coverage?: CoverageInfo;
  dependencies: string[];
}

export type FileType =
  | 'controller'
  | 'service'
  | 'resolver'
  | 'repository'
  | 'utility'
  | 'dto'
  | 'middleware'
  | 'guard'
  | 'interceptor'
  | 'pipe'
  | 'filter';

export interface FunctionInfo {
  name: string;
  isAsync: boolean;
  parameters: ParameterInfo[];
  returnType?: string;
  decorators: string[];
  isPublic: boolean;
  lineNumber: number;
  complexity?: number;
}

export interface ParameterInfo {
  name: string;
  type?: string;
  isOptional: boolean;
  defaultValue?: string;
  decorators: string[];
}

export interface ImportInfo {
  source: string;
  imports: string[];
  isTypeOnly: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'class' | 'function' | 'const' | 'interface' | 'type';
  isDefault: boolean;
}

export interface DecoratorInfo {
  name: string;
  arguments: string[];
  target: 'class' | 'method' | 'parameter' | 'property';
}

export interface CoverageInfo {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  uncoveredLines: number[];
}

export interface TestGenerationRequest {
  sourceFile: SourceFileAnalysis;
  testType: TestType;
  options?: TestGenerationOptions;
}

export type TestType = 'unit' | 'integration' | 'e2e' | 'all';

export interface TestGenerationOptions {
  includeEdgeCases?: boolean;
  includeErrorScenarios?: boolean;
  includeIntegrationTests?: boolean;
  mockStrategy?: 'full' | 'partial' | 'minimal';
  coverageTarget?: number;
  followProjectPatterns?: boolean;
  generateFixtures?: boolean;
}

export interface GeneratedTest {
  filePath: string;
  content: string;
  testType: TestType;
  coverage: {
    expectedLines: number;
    expectedFunctions: number;
    expectedBranches: number;
  };
  scenarios: TestScenario[];
}

export interface TestScenario {
  name: string;
  type: 'happy-path' | 'edge-case' | 'error' | 'integration';
  description: string;
  code: string;
}

export interface TestQualityReport {
  compiles: boolean;
  passes: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  coverageImprovement: number;
}

export interface CoverageReport {
  service: string;
  overallCoverage: number;
  fileCoverage: FileCoverage[];
  lowCoverageFiles: FileCoverage[];
  recommendedTests: string[];
}

export interface FileCoverage {
  file: string;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  uncoveredLines: number[];
}
