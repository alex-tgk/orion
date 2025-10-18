# Git Workflow & Branching Strategy

**Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Active

## Overview

ORION follows a **simplified GitHub Flow** strategy optimized for continuous deployment and microservices architecture. This document defines our branching model, workflow processes, and best practices.

## Branch Structure

### Protected Branches

#### `main` - Production Branch
- **Purpose**: Production-ready code
- **Protection**: Fully protected
- **Deployment**: Auto-deploys to production
- **Requirements**:
  - Minimum 1 approved review
  - All CI checks must pass
  - Branch must be up-to-date
  - No direct commits allowed

#### `develop` - Integration Branch (Optional)
- **Purpose**: Integration testing and staging
- **Protection**: Protected
- **Deployment**: Auto-deploys to staging
- **Requirements**:
  - All CI checks must pass
  - Optional review requirement

### Working Branches

All development work happens on feature branches following these naming conventions:

#### Feature Branches: `feature/*`
```
feature/user-authentication
feature/notification-system
feature/admin-dashboard
```
- **Purpose**: New features and enhancements
- **Base**: Created from `main`
- **Merge**: Back to `main` via PR
- **Lifespan**: Short-lived (< 1 week ideal)

#### Fix Branches: `fix/*`
```
fix/auth-token-expiry
fix/database-connection-leak
fix/frontend-validation
```
- **Purpose**: Bug fixes
- **Base**: Created from `main`
- **Merge**: Back to `main` via PR

#### Hotfix Branches: `hotfix/*`
```
hotfix/critical-security-patch
hotfix/production-crash
```
- **Purpose**: Critical production fixes
- **Base**: Created from `main`
- **Merge**: Back to `main` via PR (expedited review)
- **Priority**: Highest - reviewed and deployed ASAP

#### Refactor Branches: `refactor/*`
```
refactor/auth-service-structure
refactor/database-queries
```
- **Purpose**: Code refactoring (no feature changes)
- **Base**: Created from `main`
- **Merge**: Back to `main` via PR

#### Release Branches: `release/*`
```
release/v1.2.0
release/v2.0.0
```
- **Purpose**: Release preparation and versioning
- **Base**: Created from `main`
- **Merge**: Back to `main` via PR
- **Usage**: For version bumps, changelog updates, final testing

## Workflow Process

### 1. Starting New Work

```bash
# Update your local main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/user-authentication

# Or use the naming helper
git checkout -b feature/$(whoami)/user-authentication
```

### 2. Development

```bash
# Make changes and commit frequently
git add .
git commit -m "feat: implement JWT authentication"

# Push to remote regularly
git push origin feature/user-authentication

# Keep branch updated with main
git fetch origin
git rebase origin/main
```

### 3. Creating Pull Request

```bash
# Ensure all tests pass locally
pnpm test:all
pnpm lint
pnpm type-check

# Push final changes
git push origin feature/user-authentication

# Create PR via GitHub UI or CLI
gh pr create --base main --head feature/user-authentication
```

### 4. Code Review Process

1. **Author Responsibilities**:
   - Fill out PR template completely
   - Link related issues
   - Ensure CI passes
   - Self-review code
   - Respond to feedback promptly

2. **Reviewer Responsibilities**:
   - Review within 24 hours (4 hours for hotfixes)
   - Check spec compliance
   - Verify test coverage
   - Approve or request changes with clear feedback

3. **Review Checklist**:
   - [ ] Code quality and maintainability
   - [ ] Test coverage adequate
   - [ ] Documentation updated
   - [ ] No security vulnerabilities
   - [ ] Performance considerations
   - [ ] Spec compliance

### 5. Merging

```bash
# Once approved, merge via GitHub UI or CLI
gh pr merge --squash --delete-branch

# Or use merge commit for complex features
gh pr merge --merge --delete-branch
```

**Merge Strategies**:
- **Squash Merge** (Default): For small features and fixes
- **Merge Commit**: For large features with meaningful commit history
- **Rebase Merge**: Rarely used, only for linear history requirements

### 6. Post-Merge

```bash
# Delete local branch
git checkout main
git pull origin main
git branch -d feature/user-authentication

# Verify deployment
pnpm health
```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, whitespace)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Changes to build system or dependencies
- `ci`: Changes to CI/CD configuration
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Scope (Optional)

Indicates the package or area of change:
- `auth`: Authentication service
- `gateway`: API Gateway
- `user`: User service
- `notifications`: Notification service
- `admin-ui`: Admin UI
- `shared`: Shared packages
- `ci`: CI/CD changes

### Examples

```bash
# Feature with scope
feat(auth): implement JWT refresh token rotation

# Bug fix
fix(gateway): resolve rate limiting issue for authenticated users

# Breaking change
feat(user)!: migrate to UUID primary keys

BREAKING CHANGE: User IDs changed from integer to UUID format.
Migration script required.

# Documentation
docs: add API documentation for auth service

# Multiple paragraphs
feat(notifications): add email notification support

Implement email notification system with:
- Template engine integration
- Queue-based processing
- Retry mechanism

Closes #123
```

## Branch Protection Rules

### Main Branch Protection

Configure in GitHub repository settings:

```yaml
main:
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
  required_status_checks:
    strict: true
    contexts:
      - "quality / Lint, Type Check, Format"
      - "test / Unit Tests"
      - "security / Security Scan"
      - "build / Build Docker Image"
  enforce_admins: true
  restrictions: null
  required_linear_history: false
  allow_force_pushes: false
  allow_deletions: false
```

### Develop Branch Protection

```yaml
develop:
  required_status_checks:
    strict: true
    contexts:
      - "quality / Lint, Type Check, Format"
      - "test / Unit Tests"
  enforce_admins: false
  allow_force_pushes: false
  allow_deletions: false
```

## Special Workflows

### Hotfix Workflow

For critical production issues:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-patch

# Make fix and commit
git add .
git commit -m "fix: patch critical security vulnerability"

# Push and create PR
git push origin hotfix/critical-security-patch
gh pr create --base main --label hotfix --label priority:critical

# Request immediate review from security team
gh pr edit --add-reviewer @security-team
```

**Hotfix Requirements**:
- Label: `hotfix` and `priority:critical`
- Review time: < 4 hours
- Deployment: Immediately after merge
- Post-deployment: Verify fix in production

### Release Workflow

For version releases:

```bash
# Create release branch
git checkout main
git pull origin main
git checkout -b release/v1.2.0

# Update version numbers
npm version minor
pnpm version:bump

# Update CHANGELOG.md
pnpm changelog:generate

# Commit changes
git add .
git commit -m "chore: prepare v1.2.0 release"

# Create PR
git push origin release/v1.2.0
gh pr create --base main --label release

# After merge, tag release
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

### Multi-Service Changes

When changes affect multiple services:

```bash
# Create feature branch
git checkout -b feature/unified-logging

# Make changes to multiple packages
# packages/auth/
# packages/gateway/
# packages/shared/

# Test affected services
pnpm nx affected:test
pnpm nx affected:build

# Create single PR covering all changes
# Link related specs from .claude/specs/
```

## GitHub Spec Kit Integration

### Spec-Driven Development

1. **Create Spec First**:
   ```bash
   # Create spec in .claude/specs/
   touch .claude/specs/user-service.md
   ```

2. **Implement from Spec**:
   ```bash
   git checkout -b feature/user-service
   # Implement according to spec
   ```

3. **Validate Spec Compliance**:
   ```bash
   pnpm spec:validate
   pnpm spec:coverage
   ```

4. **Update Spec in PR**:
   - Include spec updates in same PR
   - Mark spec checklist items in PR template
   - Use `/spec-sync` slash command to verify

## Best Practices

### DO ✅

- **Commit frequently** with meaningful messages
- **Push regularly** to backup your work
- **Keep branches short-lived** (< 1 week)
- **Rebase on main** before creating PR
- **Write descriptive PR descriptions**
- **Link related issues** using keywords (Closes #123)
- **Add tests** for all changes
- **Update documentation** when needed
- **Follow conventional commits** strictly
- **Delete merged branches** promptly

### DON'T ❌

- **Don't commit directly** to main or develop
- **Don't force push** to shared branches
- **Don't push secrets** or credentials
- **Don't commit large binary files**
- **Don't merge without review**
- **Don't skip CI checks**
- **Don't leave stale branches**
- **Don't rewrite published history**

## Troubleshooting

### Merge Conflicts

```bash
# Update your branch
git fetch origin
git rebase origin/main

# Resolve conflicts in your editor
# Mark as resolved
git add .
git rebase --continue

# Force push (only to your feature branch)
git push --force-with-lease origin feature/your-branch
```

### Accidentally Committed to Main

```bash
# Create a branch with your changes
git branch feature/accidental-commit

# Reset main to remote
git checkout main
git reset --hard origin/main

# Switch to your feature branch
git checkout feature/accidental-commit
git push origin feature/accidental-commit
```

### Lost Commits

```bash
# Find lost commits
git reflog

# Recover specific commit
git checkout -b recovery SHA
```

## Tools & Automation

### Recommended Tools

- **GitHub CLI**: `gh` for PR management
- **Git aliases**: Speed up common operations
- **Husky**: Pre-commit and commit-msg hooks
- **Commitlint**: Enforce commit conventions
- **Claude Code**: Use slash commands for workflow

### Git Aliases

Add to `.gitconfig`:

```bash
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --graph --oneline --all
  cleanup = "!git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d"
```

### Claude Code Slash Commands

- `/commit-and-push`: Create conventional commit and push
- `/new-service <name>`: Create new service with spec
- `/spec-sync`: Validate spec compliance
- `/deploy <env>`: Deploy to environment

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Code Review Guide](.claude/memory/code-review-guide.md)
- [CODEOWNERS](../../.github/CODEOWNERS)
- [PR Template](../../.github/pull_request_template.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-18 | Initial Git workflow documentation |

---

**Maintained by**: Platform Team (@platform-team)
**Questions?**: Create an issue or contact @platform-team
