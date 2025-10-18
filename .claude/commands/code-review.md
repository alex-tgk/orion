---
description: Perform AI-powered code review on current changes
---

# AI Code Review

Run comprehensive AI-powered code review on uncommitted changes or specific files.

## Usage

This command will:
1. Analyze uncommitted changes in your working directory
2. Run security, performance, quality, test, and documentation analysis
3. Provide detailed feedback and suggestions
4. Highlight critical issues that need attention

## What Gets Analyzed

- **Security**: Vulnerabilities, secrets, injection risks
- **Performance**: Algorithm complexity, blocking operations, memory issues
- **Quality**: Code smells, maintainability, best practices
- **Test Coverage**: Missing tests, test quality, edge cases
- **Documentation**: Missing docs, JSDoc completeness, examples

## Output

You'll receive:
- Severity-based issue categorization (critical, high, medium, low)
- Specific fix suggestions
- Auto-fix code snippets where applicable
- Overall recommendation (APPROVE, REQUEST_CHANGES, COMMENT)
- Metrics: complexity, maintainability, security score, test coverage

## Examples

Review all uncommitted changes:
```bash
pnpm ai-review
```

Review specific files:
```bash
pnpm ai-review src/app/service.ts src/app/controller.ts
```

Get review in different format:
```bash
pnpm ai-review --format json
pnpm ai-review --format markdown > review.md
```

## Configuration

Review criteria can be customized in `tools/ai-review/config.json`:
- Adjust severity thresholds
- Enable/disable specific checks
- Configure auto-fix behavior
- Set complexity limits

## Integration with PRs

When you create a pull request, the AI review runs automatically via GitHub Actions and:
- Posts inline comments on specific lines
- Adds a comprehensive review summary
- Labels the PR based on findings
- Blocks merge if critical issues are found

## Learning from Feedback

The AI review system learns from your feedback:
- Accept/reject suggestions to improve future reviews
- Adjusts severity levels based on your preferences
- Reduces false positives over time
- Adapts to your team's coding standards
