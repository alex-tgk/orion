# Documentation Strategy Specification

**Version:** 1.0.0
**Status:** Approved
**Last Updated:** 2025-10-18
**Owner:** Engineering Team

---

## Overview

This document defines the comprehensive documentation strategy for the ORION platform, following GitHub Spec Kit best practices and ensuring all stakeholders have access to accurate, up-to-date information.

---

## Documentation Principles

### 1. Documentation as Code
- Stored in version control (Git)
- Reviewed like code (PRs)
- Tested and validated
- Versioned with the codebase

### 2. Single Source of Truth
- One authoritative location per topic
- Cross-link rather than duplicate
- Maintain consistency across docs

### 3. Audience-Driven
- Tailored to specific roles
- Progressive disclosure
- Quick start → Deep dive paths

### 4. Living Documentation
- Updated with code changes
- Regular review cycles
- Automated validation where possible

---

## Documentation Structure

```
orion/
├── .claude/                          # Claude Code & MCP integration
│   ├── playbooks/                    # Incident response playbooks
│   │   ├── incident-response.md
│   │   ├── service-down.md
│   │   ├── database-issues.md
│   │   ├── high-load.md
│   │   └── security-incident.md
│   ├── specs/                        # Service specifications
│   │   ├── documentation-strategy.md
│   │   ├── gateway-service.md
│   │   ├── notification-service.md
│   │   └── user-service.md
│   └── mcp/                          # MCP configuration
│       ├── config.json
│       └── IMPLEMENTATION_GUIDE.md
│
├── docs/                             # Main documentation
│   ├── DOCUMENTATION_INDEX.md        # Master documentation index
│   ├── HANDBOOK.md                   # Developer handbook
│   │
│   ├── onboarding/                   # Onboarding guides
│   │   ├── ONBOARDING.md
│   │   ├── setup-development-environment.md
│   │   ├── architecture-overview.md
│   │   ├── coding-standards.md
│   │   └── troubleshooting-guide.md
│   │
│   ├── api/                          # API documentation
│   │   ├── README.md
│   │   ├── authentication.md
│   │   ├── rate-limiting.md
│   │   ├── versioning.md
│   │   ├── error-handling.md
│   │   ├── openapi.json
│   │   └── services/
│   │       ├── auth.md
│   │       ├── user.md
│   │       ├── notification.md
│   │       └── admin-ui.md
│   │
│   ├── architecture/                 # Architecture docs
│   │   ├── adrs/                     # Architecture Decision Records
│   │   │   ├── 001-microservices-architecture.md
│   │   │   ├── 002-event-driven-communication.md
│   │   │   ├── 003-database-per-service.md
│   │   │   └── 004-api-gateway-pattern.md
│   │   └── diagrams/                 # Architecture diagrams
│   │       ├── system-architecture.md
│   │       ├── service-dependencies.md
│   │       ├── authentication-flow.md
│   │       └── event-flow.md
│   │
│   └── operations/                   # Operations guides
│       ├── deployment.md
│       ├── monitoring.md
│       ├── logging.md
│       └── on-call.md
│
└── packages/                         # Service-specific docs
    └── [service]/
        ├── README.md
        └── docs/
```

---

## Documentation Types

### 1. Specifications (.claude/specs/)
**Purpose**: Detailed technical specifications for services and features

**Format**: Markdown with structured sections
**Audience**: Engineers, architects
**Update Frequency**: As features are designed

**Template**:
```markdown
# [Service Name] Specification

**Version:** X.X.X
**Status:** Draft | Approved | Deprecated
**Owner:** [Team/Person]
**Dependencies:** [List dependencies]

## Overview
## Service Details
## API Endpoints
## Database Schema
## Events
## Performance Requirements
## Security
## Testing
## Deployment
## Open Questions
## Changelog
```

---

### 2. Incident Playbooks (.claude/playbooks/)
**Purpose**: Step-by-step guides for handling operational incidents

**Format**: Runbook-style with commands and decision trees
**Audience**: On-call engineers, SREs
**Update Frequency**: After each incident (lessons learned)

**Key Components**:
- Quick reference commands
- Diagnosis steps
- Resolution strategies
- Verification procedures
- Prevention measures
- Escalation criteria

---

### 3. Onboarding Guides (docs/onboarding/)
**Purpose**: Help new team members get productive quickly

**Format**: Progressive guides with checklists
**Audience**: New hires, contractors
**Update Frequency**: Quarterly or when processes change

**Includes**:
- Day-by-day schedule
- Setup instructions
- Architecture overview
- Coding standards
- Troubleshooting

---

### 4. API Documentation (docs/api/)
**Purpose**: Complete API reference for consumers

**Format**: OpenAPI/Swagger + Markdown guides
**Audience**: API consumers, frontend developers
**Update Frequency**: With each API change

**Structure**:
- Getting started guide
- Authentication
- Rate limiting
- Versioning
- Error handling
- Service-specific endpoints
- OpenAPI specification

---

### 5. Architecture Documentation (docs/architecture/)
**Purpose**: System design decisions and diagrams

**Format**: ADRs (markdown) + Mermaid diagrams
**Audience**: Engineers, architects, stakeholders
**Update Frequency**: When architecture changes

**ADR Template**:
```markdown
# ADR-XXX: [Title]

**Status:** Proposed | Accepted | Deprecated
**Date:** YYYY-MM-DD
**Deciders:** [List]

## Context
## Decision
## Consequences
## Alternatives Considered
## References
```

---

### 6. Operations Guides (docs/operations/)
**Purpose**: Deployment, monitoring, and operational procedures

**Format**: Step-by-step guides
**Audience**: DevOps, SREs, on-call engineers
**Update Frequency**: As processes evolve

---

## Documentation Workflows

### For New Features

```
1. Design Phase
   └─→ Create/update specification in .claude/specs/

2. Development Phase
   └─→ Update API documentation
   └─→ Add code comments
   └─→ Update architecture diagrams if needed

3. Review Phase
   └─→ Include documentation in PR
   └─→ Review docs alongside code

4. Deployment Phase
   └─→ Update operational guides
   └─→ Add troubleshooting entries
   └─→ Update CHANGELOG

5. Post-Deployment
   └─→ Create/update runbooks based on issues
   └─→ Update onboarding if setup changes
```

---

### For Incidents

```
1. During Incident
   └─→ Follow existing playbook
   └─→ Document all actions in incident log

2. Post-Incident
   └─→ Conduct blameless post-mortem
   └─→ Update playbook with lessons learned
   └─→ Add new troubleshooting entries
   └─→ Update monitoring/alerting docs
```

---

### For Architecture Changes

```
1. Proposal
   └─→ Create ADR in docs/architecture/adrs/
   └─→ Set status to "Proposed"

2. Discussion
   └─→ Review with team
   └─→ Capture alternatives considered

3. Decision
   └─→ Update ADR status to "Accepted"
   └─→ Update architecture diagrams
   └─→ Update service specifications

4. Implementation
   └─→ Update code and documentation together
   └─→ Deprecate old ADRs if needed
```

---

## Documentation Standards

### Markdown Formatting

```markdown
# H1 for document title (one per doc)
## H2 for major sections
### H3 for subsections

- Use bullet lists for items
- Use numbered lists for steps

`inline code` for commands and code references

```language
code blocks with language specified
```

**Bold** for emphasis
*Italic* for terms

[Links](url) with descriptive text

| Tables | With | Headers |
|--------|------|---------|
| Data   | Goes | Here    |
```

---

### Code Examples

```typescript
// ✅ Good: Complete, runnable examples
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

// ❌ Bad: Incomplete or incorrect examples
class UserService {
  findById(id) { ... }
}
```

---

### Command Examples

```bash
# Always include full context and expected output
$ npm run test

Expected output:
PASS  packages/auth/src/app/auth.service.spec.ts
  ✓ should create user (125 ms)
  ✓ should validate credentials (89 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

---

## Documentation Maintenance

### Review Schedule

- **Daily**: Incident playbooks (if incidents occurred)
- **Weekly**: API documentation
- **Monthly**: Onboarding guides, handbook
- **Quarterly**: Architecture documentation, ADRs
- **Annually**: Complete documentation audit

---

### Ownership

| Documentation Type | Primary Owner | Backup |
|-------------------|---------------|--------|
| Specifications | Feature owners | Tech lead |
| Incident Playbooks | On-call team | SRE lead |
| Onboarding | Engineering manager | Senior engineers |
| API Documentation | Backend team | Tech lead |
| Architecture | Architecture team | CTO |
| Operations | DevOps team | SRE lead |

---

### Metrics & Quality

**Track**:
- Documentation coverage (% of features documented)
- Freshness (last update date)
- Accuracy (feedback from users)
- Completeness (missing sections)
- Usage (page views, searches)

**Goals**:
- 100% API endpoint documentation
- 90% feature specification coverage
- <30 days since last update for critical docs
- <5% broken links
- >4/5 average user rating

---

## Tools & Automation

### Validation

```bash
# Run documentation linting
npm run docs:lint

# Check for broken links
npm run docs:check-links

# Validate OpenAPI specs
npm run docs:validate-api

# Generate API docs from code
npm run docs:generate
```

---

### Auto-Generation

- **API Documentation**: Generated from Swagger decorators
- **Type Documentation**: Generated from TypeScript
- **Architecture Diagrams**: Mermaid from source
- **Changelog**: Generated from commits

---

## Documentation Templates

Provided in `.claude/templates/`:
- `adr-template.md` - Architecture Decision Record
- `spec-template.md` - Service Specification
- `playbook-template.md` - Incident Playbook
- `api-endpoint-template.md` - API Endpoint Documentation

---

## Success Criteria

### For Developers
- Can setup environment without help: <1 hour
- Can find answer without asking: >80%
- Can contribute documentation easily: >90%

### For Operations
- Can resolve incidents using playbooks: >90%
- Mean time to find solution: <5 minutes

### For API Consumers
- Can integrate without support: >70%
- API documentation rated helpful: >4/5

---

## Continuous Improvement

### Feedback Loop

```
User encounters issue
   ↓
Can't find answer in docs
   ↓
Creates feedback/issue
   ↓
Documentation updated
   ↓
Change reviewed and merged
   ↓
User notified of update
```

---

### Documentation Debt

Track and prioritize:
- Missing documentation
- Outdated information
- Incomplete guides
- Broken examples
- Poor organization

**Review quarterly** and allocate time to address.

---

## Related Documents

- [Documentation Index](../docs/DOCUMENTATION_INDEX.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Coding Standards](../docs/onboarding/coding-standards.md)

---

**Last Updated:** 2025-10-18
**Version:** 1.0.0
**Status:** Approved
