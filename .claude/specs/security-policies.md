# Security Policies Specification

## Overview

This specification outlines the comprehensive security policies for the ORION microservices platform, covering RBAC, network policies, security scanning, rate limiting, and security best practices.

## Table of Contents

1. [RBAC Policies](#rbac-policies)
2. [Network Policies](#network-policies)
3. [Security Scanning](#security-scanning)
4. [Rate Limiting & Throttling](#rate-limiting--throttling)
5. [Security Headers](#security-headers)
6. [API Security](#api-security)
7. [Compliance & Auditing](#compliance--auditing)

---

## RBAC Policies

### Overview

Role-Based Access Control (RBAC) implements least-privilege access for all Kubernetes resources.

### Service Accounts

Each microservice has a dedicated service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: auth-service
  namespace: default
automountServiceAccountToken: true
```

**Service Accounts Created:**
- `auth-service`
- `gateway-service`
- `user-service`
- `notification-service`
- `admin-ui-service`
- `orion-service-account` (for Vault access)

### Roles

Each service has a Role with minimal required permissions:

#### Auth Service Permissions

```yaml
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["auth-service-secrets"]
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["auth-service-config"]
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["services", "endpoints"]
    verbs: ["get", "list", "watch"]
```

#### Gateway Service Permissions

```yaml
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["gateway-service-secrets"]
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["services", "endpoints", "pods"]
    verbs: ["get", "list", "watch"]
```

### Pod Security Policies

**Restricted PSP Applied:**

```yaml
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  runAsUser:
    rule: 'MustRunAsNonRoot'
  readOnlyRootFilesystem: false
```

### Security Contexts

**Pod-level:**

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
```

**Container-level:**

```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1000
  capabilities:
    drop:
      - ALL
```

---

## Network Policies

### Default Deny Policy

All traffic is denied by default:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Service-Specific Policies

#### Auth Service

**Allowed Ingress:**
- From: `gateway-service`
- From: Backend services (tier: backend)
- Port: 3001

**Allowed Egress:**
- To: DNS (kube-system)
- To: PostgreSQL (port 5432)
- To: Redis (port 6379)
- To: Vault (port 8200)
- To: HTTPS (port 443)

#### Gateway Service

**Allowed Ingress:**
- From: Ingress controller
- From: Admin UI
- Port: 3000

**Allowed Egress:**
- To: All backend services
- To: Redis (rate limiting)
- To: Vault
- To: HTTPS

#### Database (PostgreSQL)

**Allowed Ingress:**
- From: Backend services only
- Port: 5432

**Allowed Egress:**
- To: DNS
- To: HTTPS (for backups)

### Traffic Flow Diagram

```
Internet
    │
    ▼
Ingress Controller
    │
    ├──► Gateway Service ──┬──► Auth Service ──► PostgreSQL
    │                      │
    │                      ├──► User Service ──► PostgreSQL
    │                      │
    │                      └──► Notification Service ──► Redis/SMTP
    │
    └──► Admin UI ─────────┴──► Backend Services
```

---

## Security Scanning

### CI/CD Pipeline Integration

#### 1. Snyk Vulnerability Scanning

**Configuration:**
```yaml
- name: Run Snyk
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high --all-projects
```

**Scans:**
- Open source dependencies
- Container images
- Infrastructure as Code
- Code quality issues

#### 2. OWASP Dependency Check

**Configuration:**
```yaml
- name: OWASP Dependency Check
  uses: dependency-check/Dependency-Check_Action@main
  with:
    format: 'HTML,JSON,SARIF'
    args: --enableRetired --failOnCVSS 7
```

**Checks:**
- Known vulnerabilities (CVE)
- Outdated dependencies
- License compliance

#### 3. Trivy Container Scanning

**Configuration:**
```yaml
- name: Trivy Scan
  uses: aquasecurity/trivy-action@master
  with:
    severity: 'CRITICAL,HIGH'
    format: 'sarif'
```

**Scans:**
- OS packages
- Application dependencies
- Configuration issues
- Secrets in images

#### 4. CodeQL Analysis

**Configuration:**
```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript, typescript
    queries: security-and-quality
```

**Analyzes:**
- SQL injection
- XSS vulnerabilities
- Authentication issues
- Data flow problems

#### 5. Secret Scanning

**Tools:**
- **TruffleHog**: Historical secret detection
- **GitLeaks**: Real-time secret detection

**Configuration:**
```yaml
- name: TruffleHog
  uses: trufflesecurity/trufflehog@main
  with:
    extra_args: --only-verified
```

### Scanning Schedule

- **On Push**: All scans run on main/develop branches
- **On PR**: All scans run on pull requests
- **Daily**: Scheduled scans at 2 AM UTC
- **On Demand**: Manual workflow dispatch

### Vulnerability Management

**Severity Levels:**

| Severity | Action Required | Timeline |
|----------|----------------|----------|
| Critical | Immediate fix | 24 hours |
| High | Priority fix | 7 days |
| Medium | Planned fix | 30 days |
| Low | Optional fix | 90 days |

---

## Rate Limiting & Throttling

### Implementation

Using `@nestjs/throttler` with Redis storage for distributed rate limiting.

### Configuration

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,  // 1 minute
    limit: 10,   // 10 requests
  },
]);
```

### Custom Rate Limiting

#### Per-Endpoint Configuration

```typescript
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('login')
async login() {}
```

#### Sensitive Endpoints

Stricter limits for authentication endpoints:

```typescript
if (isSensitiveEndpoint(path)) {
  limit = Math.floor(limit / 2);
}
```

**Sensitive Endpoints:**
- `/auth/login` - 5 requests/minute
- `/auth/register` - 3 requests/minute
- `/auth/reset-password` - 2 requests/minute
- `/api/admin/*` - 10 requests/minute

### IP Whitelisting

Health checks and internal services bypass rate limiting:

```typescript
if (request.path === '/health' || isWhitelistedIp(ip)) {
  return true;
}
```

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1635789600
```

---

## Security Headers

### Helmet Configuration

All responses include security headers via Helmet.js:

#### Content Security Policy

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}
```

#### HSTS (HTTP Strict Transport Security)

```javascript
hsts: {
  maxAge: 31536000,        // 1 year
  includeSubDomains: true,
  preload: true,
}
```

#### Additional Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### CORS Configuration

```typescript
cors: {
  origin: ['https://orion.example.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-ID'],
  credentials: true,
  maxAge: 86400,
}
```

---

## API Security

### Authentication

**JWT-based authentication:**

```typescript
@UseGuards(JwtAuthGuard)
@Controller('api')
export class ApiController {}
```

### Authorization

**Role-based access control:**

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Get('users')
async getUsers() {}
```

### API Key Authentication

For service-to-service communication:

```typescript
apiKey: {
  enabled: true,
  header: 'X-API-Key',
  keys: process.env.API_KEYS.split(','),
}
```

### Request Validation

**Class-validator for DTO validation:**

```typescript
class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### Payload Size Limits

```typescript
payloadLimits: {
  json: '100kb',
  urlencoded: '100kb',
  raw: '100kb',
  text: '100kb',
}
```

---

## Compliance & Auditing

### Audit Logging

All security-relevant events are logged:

- Authentication attempts (success/failure)
- Authorization failures
- Secret access
- Configuration changes
- Rate limit violations
- API key usage

### Log Format

```json
{
  "timestamp": "2025-10-18T12:00:00Z",
  "level": "security",
  "event": "authentication.failed",
  "user": "user@example.com",
  "ip": "192.168.1.1",
  "details": {
    "reason": "invalid_credentials",
    "attempts": 3
  }
}
```

### Compliance Standards

#### SOC 2

- ✅ Access controls implemented
- ✅ Audit logging enabled
- ✅ Data encryption in transit and at rest
- ✅ Incident response procedures

#### GDPR

- ✅ Data encryption
- ✅ Access logging
- ✅ Right to deletion
- ✅ Data portability

#### HIPAA

- ✅ Access controls
- ✅ Audit trails
- ✅ Encryption
- ✅ Integrity controls

### Security Monitoring

**Metrics Tracked:**

- Failed authentication attempts
- Rate limit violations
- Unusual access patterns
- Secret rotation status
- Vulnerability scan results

**Alerting Thresholds:**

- 5+ failed logins from same IP: Alert
- 10+ rate limit violations: Alert
- Critical vulnerability detected: Immediate alert
- Secret rotation failure: Alert

---

## Security Checklist

### Deployment Checklist

- [ ] All secrets stored in Vault
- [ ] RBAC policies applied
- [ ] Network policies configured
- [ ] Security scanning enabled in CI/CD
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] HTTPS enforced
- [ ] Audit logging enabled
- [ ] Pod security contexts applied
- [ ] Container images scanned
- [ ] Dependencies up to date
- [ ] Backup procedures tested

### Code Review Checklist

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection protected
- [ ] XSS protection implemented
- [ ] CSRF tokens used
- [ ] Authentication required
- [ ] Authorization checked
- [ ] Error messages sanitized
- [ ] Logging implemented
- [ ] Security headers applied

---

## Incident Response

### Severity Levels

**P0 - Critical:**
- Active security breach
- Data exposure
- Service compromise

**P1 - High:**
- Vulnerability actively exploited
- Authentication bypass
- Privilege escalation

**P2 - Medium:**
- Known vulnerability (CVE)
- Configuration weakness
- Suspicious activity

**P3 - Low:**
- Potential vulnerability
- Best practice violation
- Audit findings

### Response Procedures

1. **Detection**: Automated monitoring and alerts
2. **Containment**: Isolate affected services
3. **Investigation**: Analyze logs and forensics
4. **Remediation**: Apply fixes and patches
5. **Recovery**: Restore normal operations
6. **Post-Mortem**: Document and improve

### Contact Information

- **Security Team**: security@orion.example.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Incident Commander**: incidents@orion.example.com

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
