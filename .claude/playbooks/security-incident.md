# Security Incident Playbook

**Version:** 1.0.0
**Last Updated:** 2025-10-18
**Severity:** Always SEV-1

---

## ⚠️ CRITICAL WARNING

Security incidents require immediate action and must follow strict protocols:
1. **DO NOT** discuss publicly or in unsecured channels
2. **DO** preserve all evidence before taking action
3. **DO** follow legal and compliance requirements
4. **DO** notify security team and management immediately

---

## Quick Reference - First 5 Minutes

```bash
# 1. PRESERVE EVIDENCE
docker compose logs > /secure/incident-$(date +%Y%m%d-%H%M%S).log
df -h > /secure/disk-state.txt
docker ps -a > /secure/container-state.txt

# 2. ISOLATE (if confirmed breach)
docker network disconnect orion_default [compromised-service]

# 3. SECURE ACCESS
# Rotate all credentials immediately
# Force logout all users
# Enable emergency maintenance mode

# 4. ASSESS
# Check for unauthorized access
# Check for data exfiltration
# Check for malicious code

# 5. NOTIFY
# Security team via secure channel
# Management
# Legal (if customer data involved)
```

---

## Incident Classification

### Type 1: Unauthorized Access Attempt

**Indicators:**
- Multiple failed login attempts
- Unusual authentication patterns
- Brute force attack detected
- Unauthorized API access attempts

**Severity:** SEV-2 (if blocked), SEV-1 (if successful)

---

### Type 2: Data Breach / Exfiltration

**Indicators:**
- Unusual database queries
- Large data exports
- Unauthorized data access
- Customer data accessed by unauthorized parties

**Severity:** Always SEV-1

---

### Type 3: Code Injection / Malware

**Indicators:**
- Unexpected code execution
- Modified application files
- Suspicious processes
- Malware detected

**Severity:** Always SEV-1

---

### Type 4: Denial of Service (DoS/DDoS)

**Indicators:**
- Unusual traffic spike
- Application unresponsive
- Resource exhaustion
- Coordinated attack pattern

**Severity:** SEV-1 or SEV-2

---

### Type 5: Privilege Escalation

**Indicators:**
- Unauthorized admin access
- Permission bypass
- Role manipulation
- Elevated privileges without authorization

**Severity:** Always SEV-1

---

## Response Procedures

### Phase 1: Detection & Verification (0-15 minutes)

#### Step 1: Confirm Security Incident

```bash
# Check authentication logs
docker compose logs auth --since "1h" | grep -E "(failed|unauthorized|forbidden)"

# Check for SQL injection attempts
docker compose logs gateway --since "1h" | grep -E "(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)"

# Check for unusual API patterns
docker compose logs gateway --since "1h" | grep -E "(429|401|403)" | wc -l

# Check for data access anomalies
docker compose exec postgres psql -U orion -c "
  SELECT
    usename,
    application_name,
    count(*) as query_count,
    max(query_start) as last_query
  FROM pg_stat_activity
  WHERE state = 'active'
  GROUP BY usename, application_name
  ORDER BY query_count DESC;
"

# Check file integrity
docker compose exec [service] find /app -type f -mmin -60 -ls
```

---

#### Step 2: Preserve Evidence

```bash
# Create secure evidence directory
mkdir -p /secure/incident-$(date +%Y%m%d-%H%M%S)
cd /secure/incident-$(date +%Y%m%d-%H%M%S)

# Capture all logs
docker compose logs --no-color > all-services.log

# Capture container state
docker ps -a > container-state.txt
docker stats --no-stream > resource-state.txt

# Capture network state
docker network ls > networks.txt
docker network inspect orion_default > network-details.json

# Capture database state
docker compose exec postgres pg_dumpall -U postgres > database-backup.sql

# Capture authentication logs
docker compose logs auth > auth-logs.txt

# Capture gateway access logs
docker compose logs gateway > gateway-logs.txt

# Create archive
tar -czf evidence-$(date +%Y%m%d-%H%M%S).tar.gz .
```

---

#### Step 3: Initial Assessment

**Assessment Checklist:**
- [ ] When was the incident first detected?
- [ ] What triggered the detection?
- [ ] Which systems are affected?
- [ ] Is the attack ongoing?
- [ ] Has data been accessed/exfiltrated?
- [ ] Are there indicators of persistence (backdoors, etc.)?
- [ ] What is the attack vector?
- [ ] What is the scope of impact?

---

### Phase 2: Containment (15-60 minutes)

#### Step 1: Immediate Isolation

```bash
# Option 1: Disconnect compromised service from network
docker network disconnect orion_default [compromised-service]

# Option 2: Stop compromised service
docker compose stop [compromised-service]

# Option 3: Enable maintenance mode (if attack is external)
# Redirect all traffic to maintenance page
docker compose exec gateway npm run maintenance:enable

# Option 4: Block attacking IP addresses
# Add firewall rules
sudo iptables -A INPUT -s [attacker-ip] -j DROP

# Or use fail2ban
sudo fail2ban-client set [jail-name] banip [ip-address]
```

---

#### Step 2: Rotate All Credentials

```bash
# 1. Database passwords
docker compose exec postgres psql -U postgres -c "
  ALTER USER orion WITH PASSWORD '[new-secure-password]';
"

# Update in all services
docker compose exec auth npm run config:update -- \
  --key=DATABASE_URL \
  --value="postgresql://orion:[new-password]@postgres:5432/orion"

# 2. JWT secrets
docker compose exec auth npm run jwt:rotate-secret

# 3. API keys
docker compose exec gateway npm run api-keys:rotate-all

# 4. Redis password
docker compose exec redis redis-cli CONFIG SET requirepass "[new-password]"

# 5. Restart all services with new credentials
docker compose down
docker compose up -d
```

---

#### Step 3: Force User Logout

```bash
# Invalidate all JWT tokens
docker compose exec auth npm run tokens:invalidate-all

# Clear all sessions
docker compose exec redis redis-cli FLUSHDB

# Update JWT secret (forces re-authentication)
docker compose exec auth npm run jwt:rotate-secret -- --invalidate-existing
```

---

#### Step 4: Block Attack Vectors

**SQL Injection:**
```typescript
// Enable strict validation
@Injectable()
export class SecurityMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Block suspicious patterns
    const suspiciousPatterns = [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
      /(\bUNION\b|\bOR\b 1=1|\bAND\b 1=1)/i,
      /(--|\/\*|\*\/|;)/,
    ];

    const queryString = JSON.stringify(req.query) + JSON.stringify(req.body);

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(queryString)) {
        console.error('SQL Injection attempt blocked:', queryString);
        return res.status(400).json({ error: 'Invalid request' });
      }
    }

    next();
  }
}
```

**XSS Prevention:**
```typescript
// Sanitize all inputs
import { sanitize } from 'class-sanitizer';

@Injectable()
export class XssProtectionMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }
    next();
  }

  private sanitizeObject(obj: any): any {
    // Recursively sanitize all strings
    // Implementation details...
  }
}
```

---

### Phase 3: Investigation (Parallel to Containment)

#### Step 1: Timeline Reconstruction

```bash
# Analyze logs chronologically
docker compose logs --since "24h" --timestamps | sort > timeline.log

# Extract authentication events
cat timeline.log | grep -E "(login|logout|failed|unauthorized)" > auth-timeline.txt

# Extract database events
docker compose logs postgres --since "24h" | grep -E "(query|connection)" > db-timeline.txt

# Extract network events
docker compose logs gateway --since "24h" | grep -E "(request|response)" > network-timeline.txt
```

---

#### Step 2: Identify Attack Vector

**Check for Common Vulnerabilities:**

```bash
# 1. Check for exposed secrets
docker compose exec [service] grep -r "password\|secret\|api_key" /app --exclude-dir=node_modules

# 2. Check for vulnerable dependencies
docker compose exec [service] npm audit --json > npm-audit.json

# 3. Check for open ports
docker compose exec [service] netstat -tuln

# 4. Check for suspicious processes
docker compose exec [service] ps aux

# 5. Check file modifications
docker compose exec [service] find /app -type f -mtime -1 -ls
```

---

#### Step 3: Determine Data Impact

```bash
# Check for data exfiltration
docker compose logs gateway --since "24h" | \
  grep -E "(GET|POST)" | \
  awk '{print $size}' | \
  awk '{s+=$1} END {print s}' # Total data transferred

# Check for unusual database queries
docker compose exec postgres psql -U orion -c "
  SELECT
    query,
    calls,
    total_time,
    rows
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 50;
"

# Check for bulk data access
docker compose exec postgres psql -U orion -c "
  SELECT
    schemaname,
    tablename,
    seq_scan,
    idx_scan,
    n_tup_ins,
    n_tup_upd,
    n_tup_del
  FROM pg_stat_user_tables
  WHERE n_tup_upd > 1000 OR n_tup_del > 1000;
"

# Check for data exports
docker compose logs [service] --since "24h" | grep -i "export\|download\|dump"
```

---

### Phase 4: Eradication (1-4 hours)

#### Step 1: Remove Malicious Code/Access

```bash
# 1. Remove backdoor accounts
docker compose exec postgres psql -U orion -c "
  DELETE FROM users WHERE created_at > '2025-10-18' AND role = 'admin';
"

# 2. Remove malicious files
docker compose exec [service] find /app -name "*.suspicious" -delete

# 3. Restore from clean backup (if needed)
docker compose down
docker volume rm orion_postgres_data
docker volume create orion_postgres_data
docker compose up -d postgres
docker compose exec postgres pg_restore -U orion -d orion /backups/clean-backup.dump

# 4. Rebuild containers from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

#### Step 2: Patch Vulnerabilities

```bash
# Update vulnerable dependencies
docker compose exec [service] npm audit fix

# Apply security patches
docker compose exec [service] npm update

# Rebuild with latest security patches
docker compose build --no-cache [service]
docker compose up -d [service]
```

---

#### Step 3: Harden Security

```bash
# 1. Enable security headers
# Add to gateway configuration:
app.use(helmet({
  contentSecurityPolicy: true,
  hsts: { maxAge: 31536000 },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

# 2. Enable request validation
@UsePipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}))

# 3. Add rate limiting
@UseGuards(ThrottlerGuard)

# 4. Enable CORS restrictions
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
});

# 5. Implement CSP
res.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' 'unsafe-inline'"
);
```

---

### Phase 5: Recovery (2-8 hours)

#### Step 1: Verify System Integrity

```bash
# Run security scans
docker compose exec [service] npm audit
docker compose exec [service] npm run test:security

# Verify file integrity
docker compose exec [service] sha256sum /app/dist/main.js

# Check for remaining vulnerabilities
docker scan [image-name]

# Verify no backdoors remain
docker compose exec [service] netstat -tuln
docker compose exec [service] ps aux
```

---

#### Step 2: Gradual Service Restoration

```bash
# 1. Start with non-critical services
docker compose up -d analytics scheduler

# 2. Monitor for 30 minutes
watch -n 30 'docker stats --no-stream'

# 3. Start critical services one by one
docker compose up -d auth
sleep 300 # Monitor
docker compose up -d user
sleep 300 # Monitor
docker compose up -d gateway

# 4. Enable public access gradually
# Update load balancer/DNS
# Start with 10% traffic
# Gradually increase to 100% over 2 hours
```

---

#### Step 3: Monitor for Recurrence

```bash
# Set up enhanced monitoring
# - Failed authentication attempts
# - Unusual API patterns
# - Database anomalies
# - File system changes

# Example monitoring script
while true; do
  # Check for suspicious activity
  FAILED_AUTH=$(docker compose logs auth --since "5m" | grep -c "failed")
  if [ $FAILED_AUTH -gt 10 ]; then
    echo "ALERT: High failed auth attempts: $FAILED_AUTH"
    # Send alert
  fi

  # Check for unusual data access
  LARGE_QUERIES=$(docker compose exec postgres psql -U orion -t -c "
    SELECT count(*) FROM pg_stat_activity
    WHERE state = 'active' AND query_start < now() - interval '1 minute';
  ")
  if [ $LARGE_QUERIES -gt 5 ]; then
    echo "ALERT: Long-running queries: $LARGE_QUERIES"
    # Send alert
  fi

  sleep 300 # Check every 5 minutes
done
```

---

### Phase 6: Post-Incident (24-72 hours)

#### Detailed Investigation Report

```markdown
# Security Incident Report

**Date:** 2025-10-18
**Severity:** SEV-1
**Incident ID:** SEC-2025-001

## Executive Summary
[Brief description of what happened]

## Timeline
- **2025-10-18 14:30 UTC** - Initial detection
- **2025-10-18 14:35 UTC** - Incident confirmed
- **2025-10-18 14:40 UTC** - Containment initiated
- **2025-10-18 15:15 UTC** - Attack stopped
- **2025-10-18 17:00 UTC** - Services restored
- **2025-10-18 18:00 UTC** - Monitoring confirmed stable

## Attack Details
- **Attack Type:** [SQL Injection / XSS / Unauthorized Access / etc.]
- **Attack Vector:** [How the attacker gained access]
- **Vulnerability Exploited:** [Specific weakness]
- **Attacker Information:** [IP addresses, user agents, etc.]

## Impact Assessment
- **Systems Affected:** [List of services/systems]
- **Data Accessed:** [What data was viewed/modified/stolen]
- **User Impact:** [Number of users affected]
- **Business Impact:** [Revenue, reputation, etc.]
- **Regulatory Impact:** [GDPR, HIPAA, etc. considerations]

## Root Cause
[Detailed analysis of how the incident occurred]

## Response Actions
1. [Action taken]
2. [Action taken]

## Evidence Collected
- Log files: /secure/incident-20251018/
- Database dumps: /secure/incident-20251018/
- Network captures: /secure/incident-20251018/

## Remediation
### Immediate Fixes
- [Fix 1]
- [Fix 2]

### Long-term Improvements
- [Improvement 1]
- [Improvement 2]

## Notification Requirements
- [X] Security team notified
- [X] Management notified
- [ ] Customers notified (if data breach)
- [ ] Regulators notified (if required)
- [ ] Law enforcement notified (if criminal)

## Lessons Learned
### What Went Well
- [Thing 1]

### What Went Poorly
- [Thing 1]

### Action Items
| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| [Action] | [Name] | P0 | [Date] | Open |
```

---

## Legal & Compliance

### Data Breach Notification Requirements

**GDPR (EU):**
- Notify supervisory authority within 72 hours
- Notify affected individuals without undue delay
- Document the breach

**CCPA (California):**
- Notify Attorney General if >500 California residents affected
- Notify affected individuals

**HIPAA (Healthcare):**
- Notify HHS within 60 days
- Notify affected individuals within 60 days
- Notify media if >500 individuals in a state affected

---

### Evidence Preservation

```bash
# Legal hold on all evidence
# DO NOT delete or modify:
# - Log files
# - Database backups
# - Network captures
# - System snapshots
# - Email communications

# Create forensic copies
dd if=/dev/sda of=/mnt/evidence/disk.img bs=4M
md5sum /mnt/evidence/disk.img > /mnt/evidence/disk.img.md5
```

---

## Prevention Checklist

Post-incident security hardening:

- [ ] Update all dependencies to latest secure versions
- [ ] Implement Web Application Firewall (WAF)
- [ ] Enable intrusion detection system (IDS)
- [ ] Implement security information and event management (SIEM)
- [ ] Conduct security code review
- [ ] Perform penetration testing
- [ ] Implement multi-factor authentication (MFA)
- [ ] Enable anomaly detection
- [ ] Implement data loss prevention (DLP)
- [ ] Conduct security awareness training
- [ ] Review and update security policies
- [ ] Implement zero-trust architecture
- [ ] Enable audit logging on all systems
- [ ] Implement secrets management (HashiCorp Vault, etc.)
- [ ] Regular security audits and assessments

---

## Communication Templates

### Internal Alert (Secure Channel)

```
SECURITY INCIDENT - CONFIDENTIAL
Severity: SEV-1
Status: [INVESTIGATING / CONTAINED / RESOLVED]

Brief Description:
[1-2 sentences about the incident]

Impact:
- [Systems affected]
- [Data at risk]

Actions Taken:
- [Action 1]
- [Action 2]

Required Actions:
- All team members: [Action]
- Security team: [Action]

Next Update: [Time]

DO NOT discuss this incident in public channels or with unauthorized personnel.
```

---

### Customer Notification (If Required)

```
Subject: Important Security Notice

Dear [Customer],

We are writing to inform you of a security incident that may have affected your data.

What Happened:
[Brief, non-technical description]

What Information Was Involved:
[Specific data types]

What We're Doing:
[Actions taken to secure systems]

What You Should Do:
- Change your password immediately
- Enable two-factor authentication
- Monitor your account for suspicious activity
- [Other specific actions]

Support:
If you have questions, please contact [support@example.com]

We sincerely apologize for this incident and the inconvenience it may have caused.

Sincerely,
[Company Name]
```

---

## Contacts

**Security Team:**
- Security Lead: [Contact info]
- On-call Security: [Contact info]

**Management:**
- CTO: [Contact info]
- CEO: [Contact info]

**External:**
- Legal Counsel: [Contact info]
- PR Team: [Contact info]
- Incident Response Firm: [Contact info]
- Law Enforcement: [Local FBI office]

---

## Related Resources

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Controls](https://www.cisecurity.org/controls)

---

**Last Updated:** 2025-10-18
**Owner:** Security Team
**Classification:** CONFIDENTIAL
