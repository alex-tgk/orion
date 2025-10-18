# Error-to-Issue Service Specification

**Version:** 1.0.0
**Status:** Implemented
**Owner:** Automation & Observability Workstream
**Dependencies:** Gateway Service, GitHub API, Bull Queue

---

## Overview

The Error-to-Issue Service is an automated pipeline that captures production errors from microservices and automatically creates GitHub issues for tracking and resolution. This system reduces manual overhead, ensures critical errors are never missed, and provides a structured workflow for error management.

## Architecture

```
┌─────────────────┐
│  Microservice   │
│   (Any Service) │
└────────┬────────┘
         │ Error occurs
         │
         ▼
┌─────────────────┐
│  Error Handler  │
│  (Local Filter) │
└────────┬────────┘
         │ POST /webhooks/errors
         │
         ▼
┌─────────────────────────────────┐
│      API Gateway                │
│   Error Webhook Controller      │
│   - API Key Authentication      │
│   - Rate Limiting               │
│   - Request Validation          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Bull Queue                    │
│   (error-processing)            │
│   - Async Processing            │
│   - Retry Logic                 │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Error-to-Issue Service        │
│   - Error Classification        │
│   - Duplicate Detection         │
│   - Template Generation         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│       GitHub API                │
│   - Issue Creation              │
│   - Issue Updates               │
│   - Comment Addition            │
└─────────────────────────────────┘
```

---

## Components

### 1. Error Classification System

**Location:** `packages/shared/src/errors/`

#### Error Severity Levels

```typescript
enum ErrorSeverity {
  CRITICAL = 'critical',  // Requires immediate attention
  HIGH = 'high',          // Impacts core functionality
  MEDIUM = 'medium',      // Affects user experience
  LOW = 'low',            // Recoverable issues
  INFO = 'info',          // Informational/debugging
}
```

#### Error Categories

```typescript
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  EXTERNAL_SERVICE = 'external_service',
  BUSINESS_LOGIC = 'business_logic',
  RATE_LIMIT = 'rate_limit',
  CONFIGURATION = 'configuration',
  INTERNAL = 'internal',
  UNKNOWN = 'unknown',
}
```

#### AppError Base Class

```typescript
class AppError extends Error {
  statusCode: number;
  severity: ErrorSeverity;
  category: ErrorCategory;
  isOperational: boolean;
  context: ErrorContext;
  signature: string;  // For deduplication
  code: string;       // Unique error code
}
```

**Key Features:**
- Automatic error signature generation for deduplication
- Normalized error messages (removes dynamic values like IDs, timestamps)
- Rich context capture (user, correlation ID, service, path, method)
- Determines if error should trigger GitHub issue creation

#### Error Classifier

Automatically classifies errors based on:
- Error message patterns (regex matching)
- HTTP status codes
- Error types/names

**Classification Rules:**
```typescript
// Database errors
/database.*connection.*failed/i → CRITICAL + DATABASE

// Authentication errors
/unauthorized|authentication.*failed/i → HIGH + AUTHENTICATION

// Network errors
/network.*error|connection.*timeout/i → HIGH + NETWORK

// Validation errors
/validation.*failed|invalid.*input/i → LOW + VALIDATION
```

---

### 2. GitHub Issue Integration

**Location:** `packages/shared/src/automation/`

#### ErrorToIssueService

**Configuration:**
```typescript
interface ErrorToIssueConfig {
  githubToken: string;           // GitHub PAT
  githubRepo: string;            // "owner/repo"
  enabled: boolean;              // Feature flag
  maxIssuesPerHour?: number;     // Rate limit (default: 50)
  deduplicationWindowMs?: number; // Default: 1 hour
  defaultAssignees?: string[];   // Auto-assign users
}
```

**Workflow:**

1. **Error Reception**
   - Receive AppError from webhook service
   - Check if service is enabled
   - Validate error should create issue

2. **Duplicate Detection**
   - Generate error signature (SHA-256 hash)
   - Check if signature exists in memory cache
   - Verify occurrence is within deduplication window
   - If duplicate: update existing issue with comment
   - If new: proceed to issue creation

3. **Rate Limiting**
   - Track issues created per hour
   - Prevent spam and API quota exhaustion
   - Default: 50 issues/hour
   - Resets every hour

4. **Issue Creation**
   - Generate title from error
   - Select appropriate template
   - Generate labels (severity, category, service)
   - Call GitHub API
   - Store issue reference

5. **Duplicate Updates**
   - Add comment to existing issue
   - Include new occurrence details
   - Track total occurrence count

#### Issue Templates

**Template Types:**
- `CRITICAL_ERROR` - For critical severity errors
- `HIGH_SEVERITY` - For high priority issues
- `MEDIUM_SEVERITY` - For medium priority issues
- `AUTHENTICATION` - Auth/authz specific
- `DATABASE` - Database specific
- `NETWORK` - Network specific
- `EXTERNAL_SERVICE` - Third-party integration issues

**Template Structure:**
```markdown
## 🔴 Critical Error Alert

### Error Details
- Error Code: `{{error_code}}`
- Message: {{error_message}}
- Severity: {{severity}}
- Category: {{category}}
- Service: {{service}}

### Occurrence Information
- First Seen: {{first_seen}}
- Last Seen: {{last_seen}}
- Total Occurrences: {{occurrence_count}}

### Request Context
- Correlation ID: `{{correlation_id}}`
- User ID: {{user_id}}
- Path: `{{path}}`
- Method: `{{method}}`

### Stack Trace
[...]

### Action Required
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests added
- [ ] Documentation updated
```

#### Label Strategy

**Severity Labels:**
- CRITICAL → `bug`, `critical`, `priority:P0`
- HIGH → `bug`, `high-priority`, `priority:P1`
- MEDIUM → `bug`, `medium-priority`, `priority:P2`
- LOW → `bug`, `low-priority`, `priority:P3`

**Category Labels:**
- `area:auth`, `area:database`, `area:network`, etc.

**Service Labels:**
- `service:gateway`, `service:auth`, `service:user`, etc.

**Automation Label:**
- `automated-issue` - All automated issues

---

### 3. Webhook Handler

**Location:** `packages/gateway/src/app/webhooks/`

#### Error Webhook Controller

**Endpoint:** `POST /webhooks/errors`

**Authentication:** API Key (X-API-Key header or Bearer token)

**Request Body:**
```typescript
interface ErrorWebhookDto {
  name: string;              // Error name/type
  message: string;           // Error message
  code: string;              // Error code
  statusCode: number;        // HTTP status
  severity?: ErrorSeverity;  // Pre-classified
  category?: ErrorCategory;  // Pre-classified
  service: string;           // Source service
  isOperational?: boolean;
  correlationId?: string;
  userId?: string;
  path?: string;
  method?: string;
  stack?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

**Response:**
```json
{
  "status": "accepted",
  "message": "Error event queued for processing",
  "errorCode": "DB-C-ABC123"
}
```

**Status Codes:**
- `202 Accepted` - Error queued for processing
- `400 Bad Request` - Invalid payload
- `401 Unauthorized` - Missing/invalid API key
- `429 Too Many Requests` - Rate limit exceeded

#### Additional Endpoints

**GET /webhooks/errors/stats**
- Returns processing statistics
- Requires API key

**GET /webhooks/errors/health**
- Health check endpoint
- Public access

#### Error Webhook Service

**Responsibilities:**
1. Convert webhook DTO to AppError
2. Queue error for async processing
3. Trigger ErrorToIssueService
4. Track processing statistics

**Queue Configuration:**
```typescript
{
  name: 'error-processing',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
}
```

---

## Configuration

### Environment Variables

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=organization/repository
ERROR_TO_ISSUE_ENABLED=true
ERROR_TO_ISSUE_MAX_PER_HOUR=50
ERROR_TO_ISSUE_DEDUP_WINDOW_MS=3600000
ERROR_TO_ISSUE_ASSIGNEES=user1,user2

# Webhook Security
WEBHOOK_API_KEY=your-secure-api-key-for-webhooks
```

### GitHub Token Permissions

Required scopes:
- `repo` - Full repository access
- `write:discussion` - Create/update issues

**Setup:**
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic)
3. Select required scopes
4. Copy token to `GITHUB_TOKEN` environment variable

---

## Usage Examples

### 1. Service Integration

```typescript
import { AppError, ErrorSeverity, ErrorCategory } from '@orion/shared/errors';
import axios from 'axios';

// In your error handler
try {
  // Your code
} catch (error) {
  const appError = new AppError(
    error.message,
    500,
    ErrorSeverity.HIGH,
    ErrorCategory.DATABASE,
    {
      service: 'user-service',
      correlationId: req.correlationId,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    }
  );

  // Report to webhook
  await axios.post('http://gateway:3000/webhooks/errors', appError.toJSON(), {
    headers: {
      'X-API-Key': process.env.WEBHOOK_API_KEY,
    },
  });

  // Continue with normal error handling
  throw appError;
}
```

### 2. Auto-Classification

```typescript
import { ErrorClassifier } from '@orion/shared/errors';

try {
  await database.connect();
} catch (error) {
  // Automatically classify unknown errors
  const appError = ErrorClassifier.classify(error, {
    service: 'user-service',
    correlationId: req.correlationId,
  });

  // Report to webhook
  await reportError(appError);
}
```

### 3. Custom Error Types

```typescript
import {
  DatabaseError,
  AuthenticationError,
  ValidationError
} from '@orion/shared/errors';

// Database error
throw new DatabaseError('Connection pool exhausted', {
  service: 'user-service',
  metadata: { poolSize: 10, activeConnections: 10 },
});

// Authentication error
throw new AuthenticationError('Invalid JWT token', {
  service: 'auth-service',
  userId: 'user-123',
});

// Validation error
throw new ValidationError('Invalid email format', {
  service: 'user-service',
}, {
  email: ['Must be a valid email address'],
});
```

---

## Monitoring & Metrics

### Key Metrics

1. **Webhook Metrics**
   - Total errors received
   - Errors processed
   - Processing failures
   - Queue depth

2. **Issue Creation Metrics**
   - Issues created per hour
   - Duplicate detections
   - Rate limit hits
   - GitHub API errors

3. **Error Distribution**
   - By severity
   - By category
   - By service
   - By time of day

### Statistics Endpoint

```bash
GET /webhooks/errors/stats
```

**Response:**
```json
{
  "webhook": {
    "processedCount": 150,
    "failedCount": 3
  },
  "issueService": {
    "enabled": true,
    "issuesCreatedThisHour": 12,
    "maxIssuesPerHour": 50,
    "lastResetTime": "2025-01-18T14:00:00Z",
    "trackedErrorSignatures": 45,
    "rateLimited": false
  }
}
```

---

## Testing

### Unit Tests

**Error Classification:**
```bash
# Test error classifier
npm test -- error-classifier.spec.ts

# Test AppError
npm test -- app-error.spec.ts
```

**Issue Service:**
```bash
npm test -- error-to-issue.service.spec.ts
```

**Webhook Controller:**
```bash
npm test -- error-webhook.controller.spec.ts
npm test -- error-webhook.service.spec.ts
```

### Integration Tests

```typescript
describe('Error-to-Issue Integration', () => {
  it('should create GitHub issue for critical error', async () => {
    // 1. Send error to webhook
    const response = await request(app)
      .post('/webhooks/errors')
      .set('X-API-Key', apiKey)
      .send(criticalErrorDto);

    expect(response.status).toBe(202);

    // 2. Wait for processing
    await waitFor(() => queueEmpty());

    // 3. Verify GitHub issue created
    const issues = await github.issues.listForRepo({
      owner: 'test-org',
      repo: 'test-repo',
      state: 'open',
    });

    expect(issues.data).toContainEqual(
      expect.objectContaining({
        title: expect.stringContaining('CRITICAL'),
      })
    );
  });
});
```

---

## Security Considerations

### 1. API Key Management

- Store API keys in environment variables
- Rotate keys regularly
- Use different keys per environment
- Never commit keys to version control

### 2. GitHub Token Security

- Use least privilege principle
- Limit token to specific repository
- Rotate tokens quarterly
- Monitor token usage in GitHub audit log

### 3. Rate Limiting

- Webhook endpoint rate limiting (Gateway level)
- Issue creation rate limiting (Service level)
- Prevent abuse and quota exhaustion

### 4. Data Sanitization

- Remove sensitive data from error messages
- Sanitize stack traces (remove env vars)
- Redact user information if needed
- Don't expose internal paths in public issues

---

## Operational Runbook

### Issue Creation Failures

**Symptoms:**
- Errors logged but no GitHub issues created
- Statistics show high failure count

**Investigation:**
1. Check GitHub token validity
2. Verify GitHub API rate limits
3. Review error logs for API errors
4. Check network connectivity to GitHub

**Resolution:**
1. Rotate GitHub token if expired
2. Wait for rate limit reset
3. Investigate and fix API errors
4. Check firewall/proxy settings

### Rate Limit Exceeded

**Symptoms:**
- `rateLimited: true` in statistics
- Issues not being created despite errors

**Investigation:**
1. Check current issues per hour
2. Review error distribution by service
3. Identify error spike source

**Resolution:**
1. Investigate error spike root cause
2. Fix underlying issue causing errors
3. Temporarily increase rate limit if needed
4. Implement better error filtering at service level

### Duplicate Detection Issues

**Symptoms:**
- Multiple issues for same error
- Duplicate issues not being detected

**Investigation:**
1. Check error signature generation
2. Verify deduplication window setting
3. Review error occurrence cache

**Resolution:**
1. Verify error classification is consistent
2. Adjust deduplication window if needed
3. Clear error occurrence cache if corrupted

---

## Future Enhancements

### Phase 2 Features

1. **Advanced Deduplication**
   - Persistent storage (Redis) for error occurrences
   - Cross-instance deduplication
   - Configurable similarity thresholds

2. **Intelligent Routing**
   - Auto-assign based on error category
   - Integration with PagerDuty/Slack
   - Escalation for unresolved critical errors

3. **Analytics Dashboard**
   - Error trends over time
   - Service health based on error rates
   - Top errors by occurrence

4. **Enhanced Templates**
   - Dynamic template selection
   - Custom templates per service
   - Template versioning

5. **Issue Lifecycle Management**
   - Auto-close issues when error stops
   - Link related errors
   - Update priority based on frequency

---

## API Reference

### POST /webhooks/errors

Report error from service for potential issue creation.

**Headers:**
```
X-API-Key: your-webhook-api-key
Content-Type: application/json
```

**Request:**
```json
{
  "name": "DatabaseError",
  "message": "Connection pool exhausted",
  "code": "DB-C-ABC123",
  "statusCode": 503,
  "severity": "critical",
  "category": "database",
  "service": "user-service",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-18T14:30:00Z",
  "metadata": {
    "poolSize": 10,
    "activeConnections": 10
  }
}
```

**Response:** `202 Accepted`
```json
{
  "status": "accepted",
  "message": "Error event queued for processing",
  "errorCode": "DB-C-ABC123"
}
```

### GET /webhooks/errors/stats

Get error webhook statistics.

**Headers:**
```
X-API-Key: your-webhook-api-key
```

**Response:** `200 OK`
```json
{
  "webhook": {
    "processedCount": 150,
    "failedCount": 3
  },
  "issueService": {
    "enabled": true,
    "issuesCreatedThisHour": 12,
    "maxIssuesPerHour": 50,
    "trackedErrorSignatures": 45,
    "rateLimited": false
  }
}
```

### GET /webhooks/errors/health

Health check for error webhook endpoint.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-01-18T14:30:00Z",
  "service": "error-webhook"
}
```

---

## Changelog

- **2025-01-18:** Initial implementation
  - Error classification system
  - GitHub issue integration
  - Webhook handler
  - Comprehensive test suite

---

## References

- [GitHub Issues API Documentation](https://docs.github.com/en/rest/issues/issues)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
