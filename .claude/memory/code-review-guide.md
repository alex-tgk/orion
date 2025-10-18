# Code Review Guide

**Version**: 1.0
**Last Updated**: 2025-10-18
**Status**: Active

## Overview

Code reviews are a critical part of maintaining code quality, sharing knowledge, and ensuring consistency across the ORION platform. This guide defines expectations for both pull request authors and reviewers.

## Core Principles

1. **Be Kind and Professional**: Review code, not people
2. **Be Thorough**: Quality over speed (but don't block progress)
3. **Be Constructive**: Suggest solutions, not just problems
4. **Be Timely**: Respond within SLA (24 hours standard, 4 hours for hotfixes)
5. **Be Educational**: Explain the "why" behind feedback
6. **Be Open**: Accept that multiple approaches can be valid

## For Pull Request Authors

### Before Creating a PR

#### 1. Self-Review Checklist

Complete this checklist before requesting review:

- [ ] **Code Quality**
  - [ ] Code follows project style guide
  - [ ] No debug/console logs left in code
  - [ ] No commented-out code blocks
  - [ ] Meaningful variable and function names
  - [ ] Complex logic has explanatory comments
  - [ ] No magic numbers (use constants)

- [ ] **Testing**
  - [ ] All tests passing locally: `pnpm test:all`
  - [ ] New tests added for new features
  - [ ] Edge cases covered
  - [ ] Test coverage meets threshold (>80%)
  - [ ] Integration tests updated if needed

- [ ] **Documentation**
  - [ ] README updated if public API changed
  - [ ] TypeDoc comments added to public methods
  - [ ] CHANGELOG.md updated
  - [ ] API documentation updated
  - [ ] Inline comments explain "why", not "what"

- [ ] **GitHub Spec Kit Compliance**
  - [ ] Spec exists in `.claude/specs/`
  - [ ] Implementation matches spec
  - [ ] Spec validated: `pnpm spec:validate`
  - [ ] Spec coverage checked: `pnpm spec:coverage`

- [ ] **Code Standards**
  - [ ] Linting passes: `pnpm lint`
  - [ ] Type checking passes: `pnpm type-check`
  - [ ] Prettier formatting applied
  - [ ] No TypeScript `any` types introduced
  - [ ] Proper error handling

- [ ] **Security**
  - [ ] No secrets or credentials in code
  - [ ] Input validation implemented
  - [ ] SQL injection prevention
  - [ ] XSS prevention (for frontend)
  - [ ] Dependencies audited: `npm audit`

- [ ] **Performance**
  - [ ] No N+1 database queries
  - [ ] Proper indexing considered
  - [ ] Caching implemented where beneficial
  - [ ] Resource cleanup (connections, files, etc.)

#### 2. PR Description Best Practices

Write a comprehensive PR description:

```markdown
## What does this PR do?
[Clear, concise explanation]

## Why is this needed?
[Business value or technical necessity]

## How does it work?
[High-level technical approach]

## Testing performed:
- [x] Unit tests
- [x] Integration tests
- [x] Manual testing in development
- [x] Tested with Docker Compose

## Screenshots/Demo:
[If UI changes, include before/after screenshots]

## Related links:
- Spec: .claude/specs/user-service.md
- Issue: #123
- Design doc: [link]
```

#### 3. Preparing for Review

- **Keep PRs focused**: One feature/fix per PR
- **Keep PRs small**: < 400 lines changed (ideal)
- **Split large changes**: Create dependent PRs if needed
- **Add context**: Link to specs, issues, design docs
- **Highlight concerns**: Call out areas needing special attention
- **Tag reviewers**: Use CODEOWNERS or tag specific experts

### During Review

#### Responding to Feedback

**DO** ✅:
- Respond to all comments (even if just "👍")
- Ask for clarification if feedback is unclear
- Discuss alternative approaches professionally
- Make requested changes or explain why not
- Thank reviewers for their time and feedback
- Re-request review after addressing feedback

**DON'T** ❌:
- Take feedback personally
- Ignore or dismiss comments
- Mark conversations as resolved without addressing
- Push back without good technical reasons
- Make unrelated changes during review
- Force push and lose comment context

#### Example Responses

Good responses:
```
✅ "Great catch! Fixed in abc123."
✅ "I considered that approach, but went with X because Y. What do you think?"
✅ "Could you elaborate on this? I'm not sure I understand the concern."
✅ "Good idea! I'll create a follow-up issue for that: #456"
```

Poor responses:
```
❌ "This is fine as-is."
❌ "Not important."
❌ "Will fix later."
❌ "That's just your opinion."
```

### After Approval

1. **Merge promptly**: Don't let approved PRs sit
2. **Delete branch**: Clean up merged branches
3. **Monitor deployment**: Watch CI/CD pipeline
4. **Verify in staging**: Test deployed changes
5. **Update issues**: Close related issues
6. **Communicate**: Notify stakeholders if needed

## For Reviewers

### Review SLA Expectations

| PR Type | Response Time | Detail Level |
|---------|--------------|--------------|
| Hotfix | < 4 hours | High priority, thorough but fast |
| Feature | < 24 hours | Comprehensive review |
| Refactor | < 24 hours | Focus on correctness |
| Documentation | < 48 hours | Focus on clarity |
| Chore | < 48 hours | Quick review |

### Review Process

#### 1. Initial Assessment (5 minutes)

Before deep review:

- [ ] Check PR description completeness
- [ ] Verify CI/CD pipeline passed
- [ ] Check PR size (< 400 lines ideal)
- [ ] Identify if you're the right reviewer
- [ ] Set aside adequate time (15-30 min per PR)

#### 2. Code Review Checklist

Use this systematic approach:

##### Architecture & Design
- [ ] Changes align with system architecture
- [ ] Follows established patterns and conventions
- [ ] No architectural anti-patterns
- [ ] Proper separation of concerns
- [ ] Appropriate abstraction level
- [ ] Scalability considered

##### Code Quality
- [ ] Code is readable and maintainable
- [ ] Naming is clear and consistent
- [ ] Functions are focused (single responsibility)
- [ ] DRY principle followed (no duplication)
- [ ] Complexity is reasonable (cyclomatic complexity)
- [ ] Error handling is comprehensive

##### Testing
- [ ] Test coverage is adequate (>80%)
- [ ] Tests are meaningful (not just coverage metrics)
- [ ] Edge cases are tested
- [ ] Error scenarios are tested
- [ ] Tests are maintainable
- [ ] Integration tests added if needed

##### Security
- [ ] No security vulnerabilities introduced
- [ ] Input validation implemented
- [ ] Authentication/authorization correct
- [ ] No hardcoded secrets
- [ ] SQL injection prevention
- [ ] XSS prevention (frontend)
- [ ] CSRF protection (if applicable)

##### Performance
- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] Proper indexing strategy
- [ ] Caching used appropriately
- [ ] No memory leaks
- [ ] Async operations handled correctly

##### Documentation
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] README updated if needed
- [ ] CHANGELOG updated
- [ ] Spec compliance verified

##### GitHub Spec Kit
- [ ] Implementation matches spec
- [ ] Spec is up-to-date
- [ ] No spec violations
- [ ] Coverage report looks good

#### 3. Providing Feedback

##### Feedback Categories

Use these prefixes to clarify feedback importance:

- **🔴 CRITICAL**: Must fix (blocks merge)
  ```
  🔴 CRITICAL: This creates a SQL injection vulnerability.
  Use parameterized queries instead: db.query('SELECT * FROM users WHERE id = ?', [userId])
  ```

- **🟡 IMPORTANT**: Should fix (can merge with agreement)
  ```
  🟡 IMPORTANT: This N+1 query will cause performance issues at scale.
  Consider using eager loading or a join.
  ```

- **🟢 SUGGESTION**: Nice to have (optional)
  ```
  🟢 SUGGESTION: This could be more concise using array destructuring:
  const { id, name, email } = user;
  ```

- **💡 QUESTION**: Seeking clarification
  ```
  💡 QUESTION: Why did you choose approach X over Y?
  ```

- **🎓 EDUCATIONAL**: Teaching moment (non-blocking)
  ```
  🎓 EDUCATIONAL: FYI, TypeScript 5.0 introduced const type parameters
  which could simplify this: function foo<const T>(...).
  Not necessary to change now, but keep it in mind for future.
  ```

- **👍 PRAISE**: Positive feedback
  ```
  👍 PRAISE: Excellent test coverage! Love the edge cases you covered.
  ```

##### Effective Feedback Examples

**Poor feedback**:
```
❌ "This is wrong."
❌ "Use a different approach."
❌ "This won't work."
```

**Good feedback**:
```
✅ "This approach has issue X. Consider using Y instead because Z."
✅ "This works but could be improved by... [specific suggestion]"
✅ "Have you considered [alternative]? It might be better because..."
```

**Excellent feedback**:
```
🌟 "Great implementation! One concern: this could cause issue X in scenario Y.

Suggestion:
```typescript
// Instead of this:
const result = await db.query('SELECT * FROM users');
return result.filter(u => u.active);

// Consider this (more efficient):
const result = await db.query('SELECT * FROM users WHERE active = true');
return result;
```

This avoids loading inactive users into memory.

What do you think?"
```

#### 4. Review Patterns

##### The Sandwich Method

1. Start with something positive
2. Provide constructive criticism
3. End with encouragement

Example:
```
👍 Great work on the authentication flow! The token refresh logic is solid.

🟡 IMPORTANT: The password validation could be stronger. Current regex
allows weak passwords. Consider using a library like `zxcvbn` for
better password strength estimation.

Looking forward to seeing this merged! Let me know if you need help
with the validation library.
```

##### Ask, Don't Tell

Frame suggestions as questions when appropriate:

```
❌ "Change this to use async/await."
✅ "Have you considered using async/await here? It might be more readable."

❌ "This is inefficient."
✅ "Could this be optimized by caching the result?"
```

### When to Approve vs Request Changes

#### Approve ✅

- All critical issues addressed
- Code meets quality standards
- Tests are comprehensive
- Documentation is adequate
- Minor suggestions are truly optional

#### Request Changes 🔴

- Security vulnerabilities present
- Critical bugs found
- Test coverage insufficient
- Breaking changes undocumented
- Spec compliance violated
- Performance issues

#### Comment (No Approval) 💬

- Waiting for discussion
- Need clarification
- Providing educational feedback
- Not the primary reviewer

## Review Anti-Patterns to Avoid

### Bike-shedding
Spending excessive time on trivial issues (naming, formatting) while missing important problems.

**Solution**: Use automated tools (Prettier, ESLint) for trivial issues. Focus on logic, architecture, and security.

### Nitpicking
Focusing on minor style preferences rather than substance.

**Solution**: Follow the style guide. Personal preferences that conflict with standards should be ignored.

### Review Theater
Approving without actually reviewing.

**Solution**: Always do thorough review. If you don't have time, ask someone else or decline the review.

### Gate Keeping
Blocking PRs unnecessarily or being overly critical.

**Solution**: Remember the goal is to ship quality code, not perfect code. Not every suggestion needs to block merge.

### Ghosting
Requesting changes then not following up.

**Solution**: Set reminders to check back on PRs. Re-review within 4 hours of updates.

## Complex Review Scenarios

### Large PRs (> 400 lines)

1. **Request split** if possible
2. **Review in chunks**: Focus on one file/module at a time
3. **Prioritize critical paths**: Review security, data handling first
4. **Set expectations**: "This will take 1-2 hours to review properly"

### Urgent Hotfixes

1. **Respond immediately** (< 4 hours SLA)
2. **Focus on fix correctness** over perfection
3. **Verify tests** cover the bug
4. **Plan follow-up** for tech debt if needed
5. **Expedite approval** if fix is correct

### Disagreements

1. **Discuss synchronously** (call/chat) if multiple comment exchanges
2. **Involve third party** if needed (tech lead, architect)
3. **Document decision** in PR comments
4. **Defer to author** if both approaches are valid
5. **Create follow-up issue** if significant refactor needed

### First-time Contributors

1. **Be extra welcoming** and encouraging
2. **Explain conventions** clearly
3. **Provide examples** for requested changes
4. **Offer to pair** if struggling
5. **Over-communicate** expectations

## Tools & Automation

### GitHub Features to Use

- **Suggest changes**: Use GitHub's code suggestion feature
- **Line comments**: Comment on specific lines
- **Review comments**: Use "Start a review" to batch feedback
- **Request changes**: Formal "request changes" review
- **Link issues**: Reference related issues (#123)
- **Add labels**: Tag PR type (security, performance, etc.)

### Claude Code Integration

Use slash commands to assist review:

```bash
# Analyze code quality
/code-review packages/auth/src/auth.service.ts

# Check spec compliance
/spec-sync auth

# Suggest improvements
/refactor packages/auth/src/auth.service.ts
```

## Review Metrics

Track these metrics to improve review process:

### Team Metrics
- Average review time
- PR size trends
- Review iteration count
- Time to merge
- Bug escape rate

### Personal Metrics
- PRs reviewed per week
- Average review depth
- Feedback acceptance rate
- Review SLA compliance

## Escalation Process

When to escalate:

1. **Security concerns**: Tag @security-team immediately
2. **Architecture concerns**: Tag @architecture-team
3. **Performance concerns**: Tag @sre-team
4. **Deadlock**: Tag tech lead or manager
5. **Urgent production issue**: Tag on-call engineer

## References

- [Git Workflow](.claude/memory/git-workflow.md)
- [CODEOWNERS](../../.github/CODEOWNERS)
- [PR Template](../../.github/pull_request_template.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [Code Style Guide](../../docs/code-style.md)

## Review Examples

### Example 1: Constructive Feedback

**Bad**:
```
This is inefficient and needs to be rewritten.
```

**Good**:
```
🟡 IMPORTANT: This implementation has O(n²) complexity because of the
nested loops (lines 45-52). For large datasets, this could be slow.

Suggestion: Use a Map for O(1) lookups:
```typescript
const userMap = new Map(users.map(u => [u.id, u]));
const enrichedOrders = orders.map(o => ({
  ...o,
  user: userMap.get(o.userId)
}));
```

This reduces complexity to O(n). What do you think?
```

### Example 2: Security Review

```
🔴 CRITICAL: SQL injection vulnerability on line 78.

Current code:
```typescript
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

This allows attackers to inject SQL. Use parameterized queries:
```typescript
const query = 'SELECT * FROM users WHERE email = ?';
const result = await db.query(query, [email]);
```

See: [SQL Injection Prevention Guide](link)

This must be fixed before merge.
```

### Example 3: Architectural Feedback

```
🟡 IMPORTANT: This creates a circular dependency between auth and user services.

auth → user → auth (line 23, line 45)

Consider:
1. Extract shared types to @orion/shared
2. Use events for cross-service communication
3. Refactor to remove the cyclic dependency

Let's discuss the best approach. cc @architecture-team
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-18 | Initial code review guide |

---

**Maintained by**: Platform Team (@platform-team)
**Questions?**: Create an issue or contact @platform-team
**Feedback**: This guide is a living document. Suggest improvements via PR!
