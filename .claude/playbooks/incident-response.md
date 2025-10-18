# Incident Response Playbook

**Version:** 1.0.0
**Last Updated:** 2025-10-18
**Owner:** Platform Team

---

## Table of Contents

- [Overview](#overview)
- [Incident Severity Levels](#incident-severity-levels)
- [General Response Process](#general-response-process)
- [Communication Protocols](#communication-protocols)
- [Runbook Index](#runbook-index)
- [Post-Incident Process](#post-incident-process)

---

## Overview

This playbook provides a systematic approach to handling incidents in the ORION platform. It defines severity levels, response procedures, communication protocols, and links to specific runbooks for common incident scenarios.

### Key Principles

1. **Safety First**: Always prioritize system stability and data integrity
2. **Communicate Early**: Alert stakeholders immediately when incidents are detected
3. **Document Everything**: Record all actions, decisions, and observations
4. **Learn and Improve**: Conduct blameless post-mortems for all critical incidents

---

## Incident Severity Levels

### SEV-1 (Critical)
**Response Time:** Immediate
**Escalation:** Page on-call team + Management

**Criteria:**
- Complete platform outage
- Data loss or corruption
- Security breach
- Critical services down (Auth, Gateway)
- Multiple services affected

**Examples:**
- Database server down
- Authentication service unavailable
- Security vulnerability being actively exploited
- Data breach detected

---

### SEV-2 (High)
**Response Time:** < 15 minutes
**Escalation:** On-call team

**Criteria:**
- Single critical service degraded
- Significant performance degradation
- Elevated error rates (>5%)
- Features unavailable but platform functional

**Examples:**
- Single microservice down with fallback available
- High latency on critical endpoints (>2s)
- Queue backlog growing rapidly
- Cache service unavailable

---

### SEV-3 (Medium)
**Response Time:** < 1 hour
**Escalation:** Standard support channels

**Criteria:**
- Non-critical service degradation
- Moderate performance issues
- Intermittent errors
- Single feature unavailable

**Examples:**
- Notification delays
- Search service slow
- Analytics data delayed
- Non-critical API endpoints failing

---

### SEV-4 (Low)
**Response Time:** Next business day
**Escalation:** Standard ticket queue

**Criteria:**
- Minor bugs
- Cosmetic issues
- Documentation errors
- Non-impacting performance anomalies

**Examples:**
- UI visual glitch
- Typo in error message
- Minor logging issues
- Development environment problems

---

## General Response Process

### 1. Detection and Alert (0-5 minutes)

```bash
# Automated monitoring alerts via:
- Prometheus/Grafana alerts
- Application error tracking (Sentry)
- Health check failures
- User reports
```

**Actions:**
1. Acknowledge the alert
2. Verify the issue is real (not false positive)
3. Determine severity level
4. Create incident ticket
5. Start incident timer

---

### 2. Initial Assessment (5-15 minutes)

**Checklist:**
- [ ] What service(s) are affected?
- [ ] When did the issue start?
- [ ] What percentage of users are impacted?
- [ ] Is data at risk?
- [ ] Are there any recent deployments?
- [ ] What's the business impact?

**Commands:**
```bash
# Check service health
npm run health

# Check recent deployments
git log --since="2 hours ago" --oneline

# Check system metrics
npm run metrics

# Check error logs
docker compose logs -f --tail=100 [service-name]

# Check running services
docker compose ps
```

---

### 3. Containment (15-30 minutes)

**Priority Actions:**
- [ ] Stop the bleeding (prevent further damage)
- [ ] Enable degraded mode if available
- [ ] Route traffic away from affected services
- [ ] Scale up healthy instances
- [ ] Enable circuit breakers

**Commands:**
```bash
# Scale service replicas
docker compose up -d --scale [service-name]=5

# Restart failing service
docker compose restart [service-name]

# View resource usage
docker stats

# Check database connections
# (Service-specific commands in runbooks)
```

---

### 4. Investigation (Parallel to Containment)

**Data Collection:**
```bash
# Collect logs
docker compose logs [service-name] > /tmp/incident-logs-$(date +%Y%m%d-%H%M%S).log

# Check database status
# (See database-issues.md playbook)

# Check Redis status
docker compose exec redis redis-cli INFO

# Check message queue
docker compose exec rabbitmq rabbitmqctl list_queues

# Network diagnostics
docker compose exec [service] ping [other-service]
```

**Analysis:**
- Review error patterns
- Check resource utilization (CPU, Memory, Disk)
- Examine recent code changes
- Review configuration changes
- Check dependency health

---

### 5. Resolution

**Resolution Paths:**

#### Quick Fix (If Available)
```bash
# Rollback recent deployment
git revert [commit-hash]
npm run build
docker compose up -d --build [service-name]

# Apply hotfix
git checkout -b hotfix/incident-$(date +%Y%m%d)
# Make changes
git commit -m "hotfix: resolve incident"
npm run build
docker compose up -d --build
```

#### Temporary Workaround
- Enable feature flags to disable broken features
- Route around broken service
- Use cached/stale data
- Increase timeouts temporarily

#### Full Resolution
- Deploy fix
- Run verification tests
- Monitor for regression
- Gradually roll out fix

---

### 6. Verification (Post-Resolution)

**Verification Checklist:**
- [ ] All health checks green
- [ ] Error rates back to baseline
- [ ] Latency metrics normal
- [ ] No data corruption detected
- [ ] Users can access affected features
- [ ] Monitoring shows stable state for 15+ minutes

**Commands:**
```bash
# Run health checks
npm run health

# Check metrics
npm run metrics

# Run smoke tests
npm run test:e2e -- --grep "critical"

# Monitor logs for errors
docker compose logs -f --tail=50 | grep -i error
```

---

### 7. Communication Updates

**Status Update Template:**

```
INCIDENT UPDATE #[N] - [YYYY-MM-DD HH:MM UTC]
Severity: [SEV-X]
Status: [INVESTIGATING | IDENTIFIED | MONITORING | RESOLVED]

Current Situation:
- [Brief description of current state]

Impact:
- [Services affected]
- [User impact]

Actions Taken:
- [List of actions completed]

Next Steps:
- [Planned actions]

ETA for Resolution: [Time estimate or "Under investigation"]
Next Update: [Time for next update]
```

---

## Communication Protocols

### Internal Communication

**Slack Channels:**
- `#incidents` - All incident updates
- `#incidents-critical` - SEV-1/SEV-2 only
- `#engineering` - General engineering notifications

**Update Frequency:**
- SEV-1: Every 15 minutes
- SEV-2: Every 30 minutes
- SEV-3: Every 2 hours
- SEV-4: As needed

---

### External Communication (If applicable)

**Status Page Updates:**
- SEV-1: Immediate update, every 15 min
- SEV-2: Update within 30 min, every hour
- SEV-3: Update within 2 hours
- SEV-4: No external communication unless customer-facing

**Customer Communication:**
- Use pre-approved templates
- Focus on impact, not technical details
- Provide clear ETAs or "investigating"
- Offer workarounds when available

---

## Runbook Index

Detailed runbooks for specific incident types:

1. [Service Down Playbook](./service-down.md) - When a microservice is unavailable
2. [Database Issues Playbook](./database-issues.md) - Database performance or connectivity problems
3. [High Load Playbook](./high-load.md) - Traffic spikes and performance degradation
4. [Security Incident Playbook](./security-incident.md) - Security breaches and vulnerabilities

---

## Post-Incident Process

### Immediate Actions (Within 24 hours)

1. **Mark incident as resolved** in tracking system
2. **Send final status update** to all stakeholders
3. **Schedule post-mortem meeting** (within 3 business days)
4. **Collect all incident data**:
   - Logs
   - Metrics/graphs
   - Timeline of events
   - Actions taken

---

### Post-Mortem (Blameless)

**Attendees:**
- Incident commander
- Engineers involved in response
- Service owners
- Product/project managers (for SEV-1/SEV-2)

**Agenda:**
1. **Timeline Review** (20 min)
   - What happened and when
   - What was the impact

2. **Root Cause Analysis** (30 min)
   - Why did it happen
   - Contributing factors
   - Why wasn't it caught earlier

3. **Action Items** (30 min)
   - Immediate fixes
   - Preventive measures
   - Monitoring improvements
   - Documentation updates
   - Process improvements

**Post-Mortem Template:**
```markdown
# Post-Mortem: [Incident Title]

**Date:** [Date]
**Severity:** SEV-X
**Duration:** [X hours Y minutes]
**Responders:** [Names]

## Executive Summary
[2-3 sentence summary of what happened]

## Impact
- Services affected: [List]
- Users impacted: [Number/percentage]
- Duration: [Time]
- Data impact: [None/Description]

## Timeline
[Detailed timeline in UTC]
- HH:MM - [Event]
- HH:MM - [Action]

## Root Cause
[Detailed explanation of what caused the incident]

## Contributing Factors
- [Factor 1]
- [Factor 2]

## Resolution
[How the incident was resolved]

## What Went Well
- [Things that worked]

## What Went Poorly
- [Things that didn't work]

## Action Items
| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| [Action] | [Name] | [P0/P1/P2] | [Date] | [Open/Done] |

## Lessons Learned
- [Lesson 1]
- [Lesson 2]
```

---

### Follow-up Actions

1. **Create action item tickets** with clear owners and due dates
2. **Update runbooks** based on lessons learned
3. **Improve monitoring/alerting** to catch similar issues earlier
4. **Update documentation** with new procedures
5. **Share learnings** with broader team in all-hands or engineering meeting

---

## Incident Commander Responsibilities

The Incident Commander (IC) is responsible for:

1. **Coordination**: Assemble the right team and delegate tasks
2. **Communication**: Provide regular updates to stakeholders
3. **Decision Making**: Make calls when consensus isn't possible
4. **Documentation**: Ensure timeline and actions are documented
5. **Post-Mortem**: Schedule and facilitate the post-mortem

**IC Rotation:**
- Primary: Current on-call engineer
- Backup: Previous on-call engineer
- Escalation: Engineering manager

---

## Tools and Resources

### Monitoring Dashboards
```bash
# Main monitoring dashboard
open http://localhost:3000/grafana

# Service health checks
npm run health

# System metrics
npm run metrics
```

### Incident Management
- **Ticket System**: [Your system]
- **Status Page**: [Your status page]
- **Communication**: Slack #incidents channel

### Useful Commands
```bash
# Quick system health check
npm run diagnose

# View all running services
docker compose ps

# Check recent deployments
git log --oneline --graph --all --since="24 hours ago"

# Aggregate all service logs
docker compose logs -f

# Check resource usage
docker stats --no-stream
```

---

## Escalation Paths

```
Level 1: On-call Engineer
  ↓ (If no resolution in 30 min or SEV-1)
Level 2: Engineering Lead
  ↓ (If continued escalation needed)
Level 3: Engineering Manager
  ↓ (For critical business impact)
Level 4: VP Engineering / CTO
```

**Contact Information:**
- Maintain current on-call rotation in PagerDuty/OpsGenie
- Keep escalation contacts up to date

---

## Key Metrics

Track these metrics for each incident:

- **MTTD** (Mean Time To Detect): Alert → Detection
- **MTTA** (Mean Time To Acknowledge): Detection → Acknowledgment
- **MTTI** (Mean Time To Investigate): Acknowledgment → Root Cause Identified
- **MTTR** (Mean Time To Resolve): Detection → Resolution
- **MTBF** (Mean Time Between Failures): Resolution → Next Incident

**Goals:**
- MTTD: < 5 minutes
- MTTA: < 2 minutes
- MTTI: < 30 minutes (SEV-1/2)
- MTTR: < 1 hour (SEV-1), < 4 hours (SEV-2)

---

## Appendix

### A. Incident Ticket Template

```
Title: [Brief description]
Severity: [SEV-X]
Status: [OPEN | INVESTIGATING | RESOLVED]
Started: [YYYY-MM-DD HH:MM UTC]
Resolved: [YYYY-MM-DD HH:MM UTC or TBD]

Services Affected:
- [Service 1]
- [Service 2]

Impact:
- [Description of user impact]

Timeline:
- [HH:MM] - [Event/Action]

Root Cause:
- [To be determined / Description]

Resolution:
- [Actions taken]

Follow-up Actions:
- [ ] [Action 1]
- [ ] [Post-mortem scheduled]
```

### B. On-Call Handoff Checklist

- [ ] Review any ongoing incidents
- [ ] Check monitoring dashboards for anomalies
- [ ] Review upcoming deployments
- [ ] Verify access to all critical systems
- [ ] Test pager/alert system
- [ ] Review recent post-mortems
- [ ] Note any known issues or degraded services

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-10-18 | Initial playbook creation | Platform Team |

---

**Questions or Issues?**
Contact: #engineering-ops on Slack
