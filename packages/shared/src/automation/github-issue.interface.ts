/**
 * GitHub Issue Creation Request
 */
export interface GitHubIssueRequest {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
  milestone?: number;
}

/**
 * GitHub Issue Response
 */
export interface GitHubIssueResponse {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

/**
 * Issue Template Type
 */
export enum IssueTemplateType {
  CRITICAL_ERROR = 'critical_error',
  HIGH_SEVERITY = 'high_severity',
  MEDIUM_SEVERITY = 'medium_severity',
  AUTHENTICATION = 'authentication',
  DATABASE = 'database',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
}

/**
 * Error occurrence data for deduplication
 */
export interface ErrorOccurrence {
  signature: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  issueNumber?: number;
  issueUrl?: string;
}
