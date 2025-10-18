import { AppError } from '../errors/app-error';
import { ErrorSeverity, ErrorCategory } from '../errors/error-severity.enum';
import { IssueTemplateType } from './github-issue.interface';

/**
 * Service for generating GitHub issue templates from errors
 */
export class IssueTemplateService {
  /**
   * Get template type based on error
   */
  static getTemplateType(error: AppError): IssueTemplateType {
    // Check severity first
    if (error.severity === ErrorSeverity.CRITICAL) {
      return IssueTemplateType.CRITICAL_ERROR;
    }

    // Then check category
    switch (error.category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return IssueTemplateType.AUTHENTICATION;
      case ErrorCategory.DATABASE:
        return IssueTemplateType.DATABASE;
      case ErrorCategory.NETWORK:
        return IssueTemplateType.NETWORK;
      case ErrorCategory.EXTERNAL_SERVICE:
        return IssueTemplateType.EXTERNAL_SERVICE;
      default:
        return error.severity === ErrorSeverity.HIGH
          ? IssueTemplateType.HIGH_SEVERITY
          : IssueTemplateType.MEDIUM_SEVERITY;
    }
  }

  /**
   * Generate issue title
   */
  static generateTitle(error: AppError, occurrenceCount?: number): string {
    const prefix = this.getSeverityPrefix(error.severity);
    const suffix = occurrenceCount && occurrenceCount > 1
      ? ` (${occurrenceCount} occurrences)`
      : '';

    return `${prefix}[${error.category.toUpperCase()}] ${error.message}${suffix}`;
  }

  /**
   * Generate issue body
   */
  static generateBody(
    error: AppError,
    occurrenceCount?: number,
    firstSeen?: Date,
    lastSeen?: Date
  ): string {
    const template = this.getTemplate(error);

    return template
      .replace('{{error_code}}', error.code)
      .replace('{{error_message}}', error.message)
      .replace('{{severity}}', error.severity)
      .replace('{{category}}', error.category)
      .replace('{{service}}', error.context.service)
      .replace('{{status_code}}', error.statusCode.toString())
      .replace('{{correlation_id}}', error.context.correlationId || 'N/A')
      .replace('{{timestamp}}', error.context.timestamp.toISOString())
      .replace('{{occurrence_count}}', occurrenceCount?.toString() || '1')
      .replace('{{first_seen}}', firstSeen?.toISOString() || error.context.timestamp.toISOString())
      .replace('{{last_seen}}', lastSeen?.toISOString() || error.context.timestamp.toISOString())
      .replace('{{user_id}}', error.context.userId || 'N/A')
      .replace('{{path}}', error.context.path || 'N/A')
      .replace('{{method}}', error.context.method || 'N/A')
      .replace('{{metadata}}', JSON.stringify(error.context.metadata, null, 2))
      .replace('{{stack_trace}}', this.formatStackTrace(error.stack || 'N/A'));
  }

  /**
   * Get severity prefix for title
   */
  private static getSeverityPrefix(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '🔴 CRITICAL: ';
      case ErrorSeverity.HIGH:
        return '🟠 HIGH: ';
      case ErrorSeverity.MEDIUM:
        return '🟡 MEDIUM: ';
      case ErrorSeverity.LOW:
        return '🔵 LOW: ';
      default:
        return '';
    }
  }

  /**
   * Get template based on error type
   */
  private static getTemplate(error: AppError): string {
    const templateType = this.getTemplateType(error);

    switch (templateType) {
      case IssueTemplateType.CRITICAL_ERROR:
        return this.getCriticalErrorTemplate();
      case IssueTemplateType.AUTHENTICATION:
        return this.getAuthenticationErrorTemplate();
      case IssueTemplateType.DATABASE:
        return this.getDatabaseErrorTemplate();
      case IssueTemplateType.NETWORK:
        return this.getNetworkErrorTemplate();
      case IssueTemplateType.EXTERNAL_SERVICE:
        return this.getExternalServiceErrorTemplate();
      default:
        return this.getDefaultErrorTemplate();
    }
  }

  /**
   * Critical Error Template
   */
  private static getCriticalErrorTemplate(): string {
    return `## 🔴 Critical Error Alert

**This is an automated issue created from a critical production error.**

### Error Details
- **Error Code:** \`{{error_code}}\`
- **Message:** {{error_message}}
- **Severity:** {{severity}}
- **Category:** {{category}}
- **Service:** {{service}}
- **Status Code:** {{status_code}}

### Occurrence Information
- **First Seen:** {{first_seen}}
- **Last Seen:** {{last_seen}}
- **Total Occurrences:** {{occurrence_count}}

### Request Context
- **Correlation ID:** \`{{correlation_id}}\`
- **Timestamp:** {{timestamp}}
- **User ID:** {{user_id}}
- **Path:** \`{{path}}\`
- **Method:** \`{{method}}\`

### Additional Context
\`\`\`json
{{metadata}}
\`\`\`

### Stack Trace
\`\`\`
{{stack_trace}}
\`\`\`

---

## Action Required

⚠️ **This is a critical error that requires immediate attention!**

### Investigation Steps
1. Check service logs for the correlation ID: \`{{correlation_id}}\`
2. Review recent deployments to {{service}}
3. Check infrastructure health (database, Redis, etc.)
4. Verify external service dependencies

### Resolution Checklist
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests added to prevent regression
- [ ] Monitoring/alerting improved
- [ ] Documentation updated

---

*This issue was automatically created by the ORION Error-to-Issue Pipeline.*
`;
  }

  /**
   * Authentication Error Template
   */
  private static getAuthenticationErrorTemplate(): string {
    return `## 🔐 Authentication/Authorization Error

### Error Details
- **Error Code:** \`{{error_code}}\`
- **Message:** {{error_message}}
- **Severity:** {{severity}}
- **Service:** {{service}}
- **Status Code:** {{status_code}}

### Occurrence Information
- **First Seen:** {{first_seen}}
- **Last Seen:** {{last_seen}}
- **Total Occurrences:** {{occurrence_count}}

### Request Context
- **Correlation ID:** \`{{correlation_id}}\`
- **User ID:** {{user_id}}
- **Path:** \`{{path}}\`
- **Method:** \`{{method}}\`

### Stack Trace
\`\`\`
{{stack_trace}}
\`\`\`

---

## Investigation Checklist

- [ ] Verify JWT token validation logic
- [ ] Check auth service health
- [ ] Review recent auth configuration changes
- [ ] Verify Redis cache connectivity
- [ ] Check for token expiration issues

---

*This issue was automatically created by the ORION Error-to-Issue Pipeline.*
`;
  }

  /**
   * Database Error Template
   */
  private static getDatabaseErrorTemplate(): string {
    return `## 💾 Database Error

### Error Details
- **Error Code:** \`{{error_code}}\`
- **Message:** {{error_message}}
- **Severity:** {{severity}}
- **Service:** {{service}}
- **Status Code:** {{status_code}}

### Occurrence Information
- **First Seen:** {{first_seen}}
- **Last Seen:** {{last_seen}}
- **Total Occurrences:** {{occurrence_count}}

### Request Context
- **Correlation ID:** \`{{correlation_id}}\`
- **Timestamp:** {{timestamp}}

### Additional Context
\`\`\`json
{{metadata}}
\`\`\`

### Stack Trace
\`\`\`
{{stack_trace}}
\`\`\`

---

## Investigation Checklist

- [ ] Check database connection pool status
- [ ] Verify database server health
- [ ] Review recent database migrations
- [ ] Check for connection leaks
- [ ] Verify database credentials/permissions
- [ ] Review query performance

---

*This issue was automatically created by the ORION Error-to-Issue Pipeline.*
`;
  }

  /**
   * Network Error Template
   */
  private static getNetworkErrorTemplate(): string {
    return `## 🌐 Network Error

### Error Details
- **Error Code:** \`{{error_code}}\`
- **Message:** {{error_message}}
- **Severity:** {{severity}}
- **Service:** {{service}}
- **Status Code:** {{status_code}}

### Occurrence Information
- **First Seen:** {{first_seen}}
- **Last Seen:** {{last_seen}}
- **Total Occurrences:** {{occurrence_count}}

### Request Context
- **Correlation ID:** \`{{correlation_id}}\`
- **Path:** \`{{path}}\`
- **Method:** \`{{method}}\`

### Stack Trace
\`\`\`
{{stack_trace}}
\`\`\`

---

## Investigation Checklist

- [ ] Check network connectivity between services
- [ ] Verify firewall/security group rules
- [ ] Check DNS resolution
- [ ] Review timeout configurations
- [ ] Verify service discovery/load balancer

---

*This issue was automatically created by the ORION Error-to-Issue Pipeline.*
`;
  }

  /**
   * External Service Error Template
   */
  private static getExternalServiceErrorTemplate(): string {
    return `## 🔌 External Service Error

### Error Details
- **Error Code:** \`{{error_code}}\`
- **Message:** {{error_message}}
- **Severity:** {{severity}}
- **Service:** {{service}}
- **Status Code:** {{status_code}}

### Occurrence Information
- **First Seen:** {{first_seen}}
- **Last Seen:** {{last_seen}}
- **Total Occurrences:** {{occurrence_count}}

### Request Context
- **Correlation ID:** \`{{correlation_id}}\`

### Additional Context
\`\`\`json
{{metadata}}
\`\`\`

### Stack Trace
\`\`\`
{{stack_trace}}
\`\`\`

---

## Investigation Checklist

- [ ] Check external service status page
- [ ] Verify API credentials/tokens
- [ ] Review rate limiting/quota usage
- [ ] Check circuit breaker status
- [ ] Verify retry/fallback logic
- [ ] Review timeout configurations

---

*This issue was automatically created by the ORION Error-to-Issue Pipeline.*
`;
  }

  /**
   * Default Error Template
   */
  private static getDefaultErrorTemplate(): string {
    return `## Error Report

### Error Details
- **Error Code:** \`{{error_code}}\`
- **Message:** {{error_message}}
- **Severity:** {{severity}}
- **Category:** {{category}}
- **Service:** {{service}}
- **Status Code:** {{status_code}}

### Occurrence Information
- **First Seen:** {{first_seen}}
- **Last Seen:** {{last_seen}}
- **Total Occurrences:** {{occurrence_count}}

### Request Context
- **Correlation ID:** \`{{correlation_id}}\`
- **Timestamp:** {{timestamp}}
- **User ID:** {{user_id}}
- **Path:** \`{{path}}\`
- **Method:** \`{{method}}\`

### Additional Context
\`\`\`json
{{metadata}}
\`\`\`

### Stack Trace
\`\`\`
{{stack_trace}}
\`\`\`

---

*This issue was automatically created by the ORION Error-to-Issue Pipeline.*
`;
  }

  /**
   * Format stack trace for better readability
   */
  private static formatStackTrace(stack: string): string {
    return stack
      .split('\n')
      .slice(0, 15) // Limit to 15 lines
      .join('\n');
  }
}
