# GitHub Spec Kit Methodology for Orion Project

## Overview
This document defines the strict GitHub Spec Kit methodology that MUST be followed for all development in the Orion project.

## Core Principles

### 1. Main Branch Development
- **ALL** development happens on the `main` branch
- No feature branches allowed - use feature flags instead
- Commits must be atomic and frequent

### 2. Specification-First Development
Every feature MUST start with a specification:

```markdown
## Spec: [Feature Name]
**ID**: SPEC-[YYYY-MM-DD]-[NUMBER]
**Status**: Draft | In Review | Approved | Implementing | Complete
**Author**: [Name]
**Reviewers**: [Names]

### Problem Statement
[Clear description of the problem being solved]

### Proposed Solution
[Detailed solution approach]

### Implementation Plan
- [ ] Step 1: [Description]
- [ ] Step 2: [Description]
- [ ] Step 3: [Description]

### Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Testing Strategy
[How this will be tested]
```

### 3. Issue-Driven Development
Every change MUST be tied to an issue:

```markdown
## Issue Template
**Type**: Bug | Feature | Chore | Documentation
**Priority**: P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Spec**: SPEC-[ID] (if applicable)
**Estimated**: [Time estimate]

### Description
[What needs to be done]

### Acceptance Criteria
- [ ] AC 1
- [ ] AC 2
- [ ] AC 3

### Technical Notes
[Implementation details]
```

### 4. Commit Standards

#### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructure
- `perf`: Performance improvement
- `test`: Testing
- `chore`: Maintenance
- `spec`: Specification update

**Example**:
```
feat(auth): implement JWT token refresh

- Added refresh token endpoint
- Updated token expiry to 15 minutes
- Added token rotation mechanism

Spec: SPEC-2024-01-15-001
Issue: #123
```

### 5. Code Review Process

1. **Self-Review Checklist**:
   - [ ] Code follows project standards
   - [ ] Tests are included and passing
   - [ ] Documentation is updated
   - [ ] Spec requirements are met
   - [ ] No console.logs or debug code

2. **Peer Review Requirements**:
   - Minimum 1 reviewer for all changes
   - Reviewers must verify spec compliance
   - All comments must be resolved

### 6. Testing Requirements

**Coverage Targets**:
- Unit Tests: 80% minimum
- Integration Tests: Required for all APIs
- E2E Tests: Required for critical paths

### 7. Documentation Standards

Every component MUST have:
1. README.md with setup and usage
2. API documentation (OpenAPI/Swagger)
3. Architecture Decision Records (ADRs)
4. Change logs

### 8. Feature Flags

Instead of branches, use feature flags:

```typescript
// feature-flags.config.ts
export const FEATURES = {
  NEW_AUTH_FLOW: process.env.FEATURE_NEW_AUTH_FLOW === 'true',
  ADVANCED_MONITORING: process.env.FEATURE_ADVANCED_MONITORING === 'true',
};

// Usage
if (FEATURES.NEW_AUTH_FLOW) {
  // New implementation
} else {
  // Current implementation
}
```

## Enforcement

This methodology is enforced through:
1. Git hooks (see `.githooks/`)
2. CI/CD pipelines (see `.github/workflows/`)
3. Automated tooling (see `.claude/tools/`)
4. Code review checklists

## Quick Reference

### Daily Workflow
1. Pull latest from main: `git pull origin main`
2. Create/update spec: `.specs/features/[feature-name].md`
3. Create issue linking to spec
4. Make atomic commits with proper messages
5. Push frequently to main
6. Monitor CI/CD for issues

### Command Shortcuts
```bash
# Create new spec
npm run spec:new [feature-name]

# Validate spec compliance
npm run spec:validate

# Check commit message
npm run commit:check

# Run pre-commit checks
npm run pre-commit
```

## Resources
- [GitHub Flow Documentation](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Feature Flags Best Practices](https://martinfowler.com/articles/feature-toggles.html)