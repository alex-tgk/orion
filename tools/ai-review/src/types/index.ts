export interface ReviewConfig {
  review: {
    enabled: boolean;
    model: string;
    maxTokens: number;
    temperature: number;
    autoFix: {
      enabled: boolean;
      confidence: number;
      categories: string[];
    };
    learning: {
      enabled: boolean;
      feedbackThreshold: number;
      storageType: string;
      storagePath: string;
    };
  };
  analyzers: {
    security: SecurityConfig;
    performance: PerformanceConfig;
    quality: QualityConfig;
    test: TestConfig;
    documentation: DocumentationConfig;
  };
  reporting: ReportingConfig;
  github: GitHubConfig;
  metrics: MetricsConfig;
  exclusions: ExclusionsConfig;
}

export interface SecurityConfig {
  enabled: boolean;
  severity: Record<string, string[]>;
  thresholds: Record<string, number>;
  patterns: {
    secrets: {
      enabled: boolean;
      patterns: string[];
    };
    sqlInjection: {
      enabled: boolean;
      patterns: string[];
    };
    xss: {
      enabled: boolean;
      patterns: string[];
    };
  };
}

export interface PerformanceConfig {
  enabled: boolean;
  checks: Record<string, boolean>;
  thresholds: Record<string, number>;
  patterns: {
    nPlusOne?: {
      enabled: boolean;
      description: string;
    };
    synchronousBlocking: {
      enabled: boolean;
      patterns: string[];
    };
  };
}

export interface QualityConfig {
  enabled: boolean;
  checks: Record<string, boolean>;
  thresholds: Record<string, number>;
  patterns: {
    codeSmells: Array<{
      name: string;
      pattern: string;
      severity: string;
    }>;
    bestPractices: any[];
  };
}

export interface TestConfig {
  enabled: boolean;
  checks: Record<string, boolean>;
  thresholds: Record<string, number>;
  patterns: {
    testFiles: string[];
    requiredTests: Array<{
      filePattern: string;
      testPattern: string;
      required: boolean;
    }>;
  };
}

export interface DocumentationConfig {
  enabled: boolean;
  checks: Record<string, boolean>;
  requirements: Record<string, boolean>;
  thresholds: Record<string, number>;
  patterns: {
    jsdoc: {
      required: boolean;
      tags: string[];
    };
    readme: {
      sections: string[];
    };
  };
}

export interface ReportingConfig {
  formats: string[];
  includeFixSuggestions: boolean;
  includeExamples: boolean;
  includeMetrics: boolean;
  groupBy: string;
  sortBy: string;
  verbosity: string;
}

export interface GitHubConfig {
  postComments: boolean;
  postSummary: boolean;
  createReviewRequests: boolean;
  addLabels: boolean;
  labels: Record<string, string>;
  commentStyle: string;
  batchComments: boolean;
  maxCommentsPerFile: number;
}

export interface MetricsConfig {
  enabled: boolean;
  track: string[];
  storage: string;
  aggregation: string;
}

export interface ExclusionsConfig {
  files: string[];
  patterns: string[];
}

export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  content: string;
  sha: string;
}

export interface BaseIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  file: string;
  line?: number;
  message: string;
  detail: string;
  recommendation: string;
}

export interface SecurityIssue extends BaseIssue {
  cwe?: string;
}

export interface PerformanceIssue extends BaseIssue {
  impact: string;
}

export interface QualityIssue extends BaseIssue {
  category: string;
}

export interface TestIssue extends BaseIssue {
  category: string;
}

export interface DocumentationIssue extends BaseIssue {
  category: string;
}

export type Issue = SecurityIssue | PerformanceIssue | QualityIssue | TestIssue | DocumentationIssue;

export interface AnalysisResult<T extends BaseIssue> {
  category: string;
  issues: T[];
  summary: string;
  metrics: Record<string, any>;
}

export interface ReviewResult {
  summary: string;
  recommendation: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  issues: Array<Issue & { autoFixable?: boolean; autoFix?: string; category: string; title?: string; suggestion?: string }>;
  positives: string[];
  metrics: Record<string, any>;
  timestamp: string;
  prNumber: number;
  analyzers: {
    security: AnalysisResult<SecurityIssue>;
    performance: AnalysisResult<PerformanceIssue>;
    quality: AnalysisResult<QualityIssue>;
    test: AnalysisResult<TestIssue>;
    documentation: AnalysisResult<DocumentationIssue>;
  };
}
