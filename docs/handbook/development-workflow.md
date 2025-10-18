# Development Workflow

This guide describes the daily development workflow, branching strategy, commit conventions, and PR process for the ORION platform.

## Table of Contents

1. [Daily Development Workflow](#daily-development-workflow)
2. [Branch Strategy](#branch-strategy)
3. [Commit Conventions](#commit-conventions)
4. [Pull Request Process](#pull-request-process)
5. [Code Review Guidelines](#code-review-guidelines)
6. [Release Process](#release-process)

## Daily Development Workflow

### Morning Routine

```bash
# 1. Update your local repository
git checkout main
git pull origin main

# 2. Check system health
pnpm health

# 3. Check for dependency updates
git status
pnpm install

# 4. View what needs to be done
# Check GitHub Issues, project board, or sprint planning
```

### Starting a New Task

```bash
# 1. Create a feature branch
git checkout -b feat/your-feature-name

# 2. Ensure you have the latest changes
git fetch origin
git rebase origin/main

# 3. Start development server
pnpm dev

# Or start specific service
pnpm dev:service <service-name>
```

### During Development

```bash
# Run tests frequently
pnpm test

# Check code quality
pnpm lint
pnpm type-check

# Format code
pnpm format

# Run affected tests only (faster)
nx affected:test

# Watch mode for TDD
nx test <service> --watch
```

### Before Committing

```bash
# 1. Run linter and formatter
pnpm lint:fix
pnpm format

# 2. Run tests
pnpm test

# 3. Check types
pnpm type-check

# 4. Review your changes
git diff

# 5. Stage changes
git add <files>

# Note: Pre-commit hooks will automatically run lint and format
```

### End of Day

```bash
# 1. Commit your work (even if not complete)
git commit -m "wip: description of progress"

# 2. Push to backup your work
git push origin feat/your-feature-name

# 3. Update task board/tracking
# - Move cards to "In Progress"
# - Add comments on blockers
```

## Branch Strategy

We use **Git Flow** with modifications for our microservices architecture.

### Branch Types

#### Main Branches

**`main`** (Protected)
- Production-ready code only
- All tests must pass
- Requires PR approval
- Auto-deployed to production

**`develop`** (Protected) - Currently not used, we deploy from main
- Integration branch
- Pre-production testing
- Requires PR approval

#### Supporting Branches

**Feature Branches: `feat/feature-name`**
```bash
# Create from: main
# Merge to: main
# Naming: feat/short-description

git checkout -b feat/user-authentication
git checkout -b feat/notification-retry-logic
```

**Bug Fix Branches: `fix/bug-name`**
```bash
# Create from: main or affected branch
# Merge to: main
# Naming: fix/short-description

git checkout -b fix/token-expiration-issue
git checkout -b fix/database-connection-leak
```

**Hotfix Branches: `hotfix/critical-issue`**
```bash
# Create from: main
# Merge to: main
# Naming: hotfix/short-description

git checkout -b hotfix/security-vulnerability
git checkout -b hotfix/production-crash
```

**Documentation Branches: `docs/topic`**
```bash
# Create from: main
# Merge to: main
# Naming: docs/short-description

git checkout -b docs/api-documentation
git checkout -b docs/deployment-guide
```

**Refactor Branches: `refactor/component`**
```bash
# Create from: main
# Merge to: main
# Naming: refactor/short-description

git checkout -b refactor/auth-service-structure
git checkout -b refactor/error-handling
```

### Branch Naming Convention

**Pattern:** `<type>/<short-description>`

**Examples:**
- `feat/websocket-notifications`
- `fix/memory-leak-redis`
- `docs/testing-guide`
- `refactor/user-repository`
- `test/integration-auth`
- `chore/update-dependencies`

**Rules:**
- Use lowercase
- Use hyphens, not underscores
- Be descriptive but concise
- Include issue number if applicable: `feat/123-add-2fa`

### Working with Branches

#### Creating a Branch

```bash
# Create and switch to new branch
git checkout -b feat/my-feature

# Push to remote
git push -u origin feat/my-feature
```

#### Keeping Branch Updated

```bash
# Rebase on main (preferred for clean history)
git fetch origin
git rebase origin/main

# Resolve conflicts if any
# ... fix conflicts ...
git add <resolved-files>
git rebase --continue

# Push (force push required after rebase)
git push --force-with-lease
```

#### Syncing with Main

```bash
# Option 1: Rebase (cleaner history, preferred)
git checkout feat/my-feature
git fetch origin
git rebase origin/main

# Option 2: Merge (preserves history)
git checkout feat/my-feature
git merge origin/main
```

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of:

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add JWT refresh token rotation` |
| `fix` | Bug fix | `fix: resolve memory leak in Redis client` |
| `docs` | Documentation changes | `docs: update API documentation` |
| `style` | Code style changes | `style: format code with Prettier` |
| `refactor` | Code refactoring | `refactor: simplify error handling` |
| `perf` | Performance improvements | `perf: optimize database queries` |
| `test` | Test changes | `test: add unit tests for auth service` |
| `build` | Build system changes | `build: update webpack configuration` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |
| `chore` | Other changes | `chore: update dependencies` |
| `revert` | Revert previous commit | `revert: revert commit abc123` |

### Scope (Optional)

The scope specifies the package/service affected:

- `auth` - Authentication service
- `user` - User service
- `gateway` - API Gateway
- `notifications` - Notification service
- `shared` - Shared library
- `admin-ui` - Admin interface
- `e2e` - End-to-end tests

**Examples:**
```
feat(auth): add two-factor authentication
fix(gateway): resolve circuit breaker timeout
docs(shared): add JSDoc comments to utilities
```

### Subject

- Use imperative, present tense: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Maximum 50 characters

**Good:**
```
feat: add user email verification
fix: resolve token expiration bug
```

**Bad:**
```
feat: Added user email verification feature.
fix: Fixed the bug with tokens
```

### Body (Optional)

- Explain WHAT and WHY, not HOW
- Use imperative, present tense
- Wrap at 72 characters
- Separate from subject with blank line

**Example:**
```
feat(auth): add refresh token rotation

Implement automatic refresh token rotation to improve security.
Each time a refresh token is used, a new one is issued and the
old one is invalidated.

This prevents replay attacks if refresh tokens are compromised.
```

### Footer (Optional)

Reference issues and breaking changes:

```
feat(api): redesign authentication endpoints

BREAKING CHANGE: /auth/login now returns different response format

Closes #123
Relates to #456
```

### Examples

**Feature:**
```
feat(notifications): add email template system

Implement template-based email notifications with variable
substitution and internationalization support.

Closes #234
```

**Bug Fix:**
```
fix(gateway): prevent memory leak in circuit breaker

The circuit breaker was holding references to completed requests.
Clear request history after threshold is reached.

Fixes #567
```

**Documentation:**
```
docs: add deployment guide

Add comprehensive guide for deploying ORION to production
environments including Docker, Kubernetes, and cloud platforms.
```

**Breaking Change:**
```
feat(auth)!: change JWT token structure

BREAKING CHANGE: JWT tokens now include additional claims.
Existing tokens will be invalid after this update.

Migration: Users will need to re-authenticate.

Closes #890
```

### Commit Workflow

```bash
# 1. Stage changes
git add <files>

# 2. Commit with conventional message
git commit -m "feat(auth): add password reset functionality"

# Note: commit-msg hook validates format automatically

# 3. If commit message is complex, use editor
git commit
# Opens editor for multi-line message
```

### Commit Message Validation

Our `commit-msg` hook validates:
- ✓ Type is valid
- ✓ Subject is present
- ✓ Subject starts with lowercase
- ✓ Subject has no period at end
- ✓ Subject is under 100 characters

**If validation fails:**
```bash
# Edit the last commit message
git commit --amend

# Or force commit (not recommended)
git commit --no-verify
```

## Pull Request Process

### Before Creating a PR

**1. Self-Review Checklist**
```bash
# All tests pass
pnpm test:all

# Code is formatted
pnpm format

# No linter errors
pnpm lint

# Types are correct
pnpm type-check

# Build succeeds
pnpm build
```

**2. Update Documentation**
- [ ] README updated if needed
- [ ] API docs updated
- [ ] TypeDoc comments added
- [ ] CHANGELOG updated

**3. Spec Compliance** (for features)
- [ ] Spec exists in `.claude/specs/`
- [ ] Implementation matches spec
- [ ] Acceptance criteria met

### Creating the PR

```bash
# 1. Push your branch
git push origin feat/your-feature

# 2. Go to GitHub/GitLab

# 3. Click "Create Pull Request"

# 4. Use the PR template (auto-populated)

# 5. Fill in all sections:
#    - Description
#    - Type of Change
#    - Related Issues
#    - Testing checklist
#    - Documentation checklist
```

### PR Title Format

Follow conventional commit format:

```
feat(auth): add password reset functionality
fix(gateway): resolve timeout in circuit breaker
docs: update deployment guide
```

### PR Description Template

Our PR template includes:

```markdown
## Description
Clear description of changes

## Type of Change
- [ ] feat: New feature
- [ ] fix: Bug fix
- [ ] docs: Documentation
- [ ] refactor: Code refactoring
- [ ] test: Test updates

## Related Issues
Closes #123

## GitHub Spec Kit Compliance
- [ ] Spec exists in .claude/specs/
- [ ] Implementation matches spec
- [ ] All acceptance criteria met

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests passing
- [ ] Coverage maintained

## Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] TypeDoc comments added
- [ ] CHANGELOG updated

## Code Quality
- [ ] Self-review completed
- [ ] No linter warnings
- [ ] No TypeScript errors

## Security
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Auth checks in place

## Breaking Changes
None / Description of breaking changes

## Additional Context
Any additional information
```

### PR Labels

Apply appropriate labels:

**Type:**
- `feature` - New feature
- `bug` - Bug fix
- `documentation` - Documentation changes
- `enhancement` - Enhancement to existing feature
- `refactor` - Code refactoring

**Priority:**
- `critical` - Critical issue/feature
- `high` - High priority
- `medium` - Medium priority
- `low` - Low priority

**Status:**
- `in-progress` - Work in progress
- `ready-for-review` - Ready for review
- `changes-requested` - Changes requested
- `approved` - Approved

**Size:**
- `size/XS` - < 10 lines changed
- `size/S` - 10-99 lines changed
- `size/M` - 100-499 lines changed
- `size/L` - 500-999 lines changed
- `size/XL` - 1000+ lines changed

### PR Review Process

**1. Automated Checks (must pass)**
- ✓ Linting
- ✓ Type checking
- ✓ Unit tests
- ✓ Integration tests
- ✓ E2E tests (if applicable)
- ✓ Build
- ✓ Coverage threshold

**2. Code Review (1-2 reviewers)**
- Code quality
- Test coverage
- Documentation
- Security considerations
- Performance impact
- Spec compliance

**3. Addressing Feedback**
```bash
# Make requested changes
# ... edit files ...

# Commit changes
git add <files>
git commit -m "refactor: address review feedback"

# Push updates
git push origin feat/your-feature
```

**4. Approval and Merge**
- Requires 1-2 approvals (based on repo settings)
- All checks must pass
- No unresolved conversations
- Up to date with main branch

### Merging Strategies

**Squash and Merge (Preferred)**
- Combines all commits into one
- Cleaner history
- Use for most PRs

**Rebase and Merge**
- Preserves individual commits
- Linear history
- Use for well-structured commit history

**Merge Commit**
- Creates merge commit
- Preserves full history
- Use rarely (complex merges)

## Code Review Guidelines

### As a Reviewer

**What to Review:**

1. **Functionality**
   - Does it work as intended?
   - Are edge cases handled?
   - Is error handling robust?

2. **Code Quality**
   - Is code readable and maintainable?
   - Are patterns consistent?
   - Is complexity justified?

3. **Testing**
   - Are tests comprehensive?
   - Do tests actually test behavior?
   - Is coverage adequate?

4. **Documentation**
   - Are comments clear?
   - Is API documented?
   - Are changes documented?

5. **Security**
   - Are inputs validated?
   - Are secrets secured?
   - Are permissions checked?

6. **Performance**
   - Are there obvious bottlenecks?
   - Are queries optimized?
   - Is caching appropriate?

**Providing Feedback:**

```markdown
# Good feedback examples:

## Suggestion with rationale
Consider using Promise.all() here instead of sequential awaits.
This would improve performance by running operations in parallel.

## Question for clarification
What happens if the user is not found? Should we throw an error
or return null?

## Praise for good code
Nice use of the factory pattern here! This makes testing much easier.

## Request for changes with example
This function is doing too much. Consider splitting it:
```typescript
// Instead of this
async function processUser(userData) { ... }

// Consider this
async function validateUserData(userData) { ... }
async function saveUser(validData) { ... }
async function sendWelcomeEmail(user) { ... }
```

**Review Comments Prefixes:**

- `[BLOCKING]` - Must be fixed before merge
- `[SUGGESTION]` - Optional improvement
- `[QUESTION]` - Need clarification
- `[NITPICK]` - Minor style issue
- `[PRAISE]` - Positive feedback

### As an Author

**Responding to Reviews:**

```markdown
# Address each comment

## For changes made:
✅ Fixed - Changed to use Promise.all() as suggested

## For disagreements:
I chose sequential processing here because we need to maintain
order. If operation B fails, we shouldn't run operation C.

## For questions:
If user is not found, we throw NotFoundException which returns
404 to the client.

## Request changes:
Could you clarify what you mean by "simplify this logic"?
I'm not sure which part is complex.
```

**Best Practices:**
- Respond to all comments
- Don't take feedback personally
- Ask questions if unclear
- Update PR description if scope changed
- Mark conversations as resolved when fixed

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1 (patch - bug fix)
1.0.1 → 1.1.0 (minor - new feature, backward compatible)
1.1.0 → 2.0.0 (major - breaking change)
```

### Creating a Release

```bash
# 1. Update version in package.json
npm version patch  # or minor, major

# 2. Update CHANGELOG.md
# Add all changes since last release

# 3. Commit version bump
git commit -am "chore: bump version to 1.2.3"

# 4. Create tag
git tag -a v1.2.3 -m "Release v1.2.3"

# 5. Push changes and tags
git push origin main
git push origin v1.2.3

# 6. Create GitHub release
# Go to GitHub → Releases → Draft new release
# Use CHANGELOG content for release notes
```

### Release Notes Template

```markdown
## 🚀 What's New

### Features
- feat(auth): add two-factor authentication (#123)
- feat(notifications): email template system (#234)

### Bug Fixes
- fix(gateway): resolve circuit breaker timeout (#345)
- fix(auth): token expiration edge case (#456)

### Documentation
- docs: add deployment guide (#567)
- docs: update API documentation (#678)

## 🔧 Maintenance

### Refactoring
- refactor(user): simplify repository layer (#789)

### Dependencies
- chore: update NestJS to 11.1.6 (#890)

## 📊 Statistics

- X commits
- Y pull requests merged
- Z contributors

## 🙏 Contributors

Thanks to all contributors!
```

## Quick Reference

### Common Commands

```bash
# Branch management
git checkout -b feat/my-feature
git push -u origin feat/my-feature
git fetch origin
git rebase origin/main

# Commits
git add <files>
git commit -m "feat: description"
git commit --amend
git push --force-with-lease

# PR workflow
git push origin feat/my-feature
# Create PR on GitHub/GitLab

# After PR approval
git checkout main
git pull origin main
git branch -d feat/my-feature
```

### Commit Message Examples

```bash
feat(auth): add password reset functionality
fix(gateway): resolve memory leak in circuit breaker
docs: update testing guide with new examples
refactor(user): extract validation logic to separate module
test(notifications): add integration tests for email service
chore: update dependencies to latest versions
```

---

**Remember:** Good workflow practices lead to better code quality, easier collaboration, and fewer bugs in production!
