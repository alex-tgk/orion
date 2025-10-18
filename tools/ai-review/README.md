# AI Code Review Engine

Intelligent, AI-powered code review system for the ORION platform using Claude 3.5 Sonnet.

## Features

- 🔒 **Security Analysis**: Detect vulnerabilities, secrets, and security issues
- ⚡ **Performance Analysis**: Identify performance bottlenecks and optimization opportunities
- 📊 **Quality Analysis**: Check code quality, maintainability, and best practices
- ✅ **Test Analysis**: Ensure comprehensive test coverage
- 📝 **Documentation Analysis**: Verify API documentation completeness
- 🤖 **AI-Powered**: Context-aware suggestions using Claude 3.5 Sonnet
- 🎯 **Auto-Fix**: Automatic fix suggestions for common issues
- 📈 **Learning Engine**: Improves over time based on feedback
- 📊 **Metrics Tracking**: Monitor review effectiveness and trends

## Installation

```bash
cd tools/ai-review
pnpm install
pnpm build
```

## Configuration

Set required environment variables:

```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GITHUB_TOKEN="your-github-token"
```

Configure review criteria in `config.json`:

```json
{
  "review": {
    "model": "claude-3-5-sonnet-20241022",
    "autoFix": {
      "enabled": true,
      "confidence": 0.8
    }
  }
}
```

## Usage

### CLI Commands

Run comprehensive review:
```bash
pnpm ai-review review --pr-number 123
```

Run specific analyzer:
```bash
pnpm ai-review analyze --type security --files "src/**/*.ts"
```

Generate review summary:
```bash
pnpm ai-review summary --review-file review.json --format markdown
```

Post review to GitHub:
```bash
pnpm ai-review post-review --pr-number 123 --review-file review.json
```

### Programmatic API

```typescript
import { ReviewEngine } from '@orion/ai-review';

const config = require('./config.json');
const engine = new ReviewEngine(config);

// Review a pull request
const review = await engine.reviewPullRequest(123, 'owner', 'repo');

// Post review to GitHub
await engine.postReview(123, 'owner', 'repo', review);
```

## GitHub Actions Integration

The system automatically runs on pull requests via GitHub Actions:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

See `.github/workflows/ai-code-review.yml` for full workflow.

## Analyzers

### Security Analyzer

Detects:
- Hardcoded secrets
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication issues
- OWASP Top 10 vulnerabilities

### Performance Analyzer

Identifies:
- Algorithm complexity
- N+1 query problems
- Synchronous blocking
- Memory leaks
- Inefficient loops

### Quality Analyzer

Checks:
- Code smells
- Best practices
- Maintainability
- Duplicate code
- SOLID principles

### Test Analyzer

Evaluates:
- Missing test files
- Test quality
- Coverage gaps
- Edge cases
- Error scenarios

### Documentation Analyzer

Verifies:
- JSDoc completeness
- Parameter documentation
- Return value docs
- Usage examples
- Complex function explanations

## Severity Levels

- 🚨 **Critical**: Must fix before merge (blocks PR)
- ⚠️ **High**: Should fix before merge
- 💡 **Medium**: Recommended improvements
- 📝 **Low**: Nice to have enhancements
- ℹ️ **Info**: Informational only

## Learning Engine

The system learns from your feedback:

```bash
# Provide feedback
pnpm ai-review feedback \
  --issue-type "missing-test" \
  --category "test" \
  --accepted false \
  --feedback "Not needed for DTO"

# View learning stats
pnpm ai-review stats
```

## Metrics

Track review effectiveness:

```bash
# View metrics
pnpm ai-review metrics

# Export metrics
pnpm ai-review metrics --format json > metrics.json
```

Metrics include:
- Review count
- Issues found/fixed
- False positive rate
- Review time
- Acceptance rate

## Configuration Reference

### Review Settings

```json
{
  "review": {
    "enabled": true,
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 8000,
    "temperature": 0.3,
    "autoFix": {
      "enabled": true,
      "confidence": 0.8,
      "categories": ["formatting", "imports"]
    }
  }
}
```

### Analyzer Settings

```json
{
  "analyzers": {
    "security": {
      "enabled": true,
      "thresholds": {
        "critical": 0,
        "high": 2,
        "medium": 5
      }
    }
  }
}
```

### GitHub Integration

```json
{
  "github": {
    "postComments": true,
    "postSummary": true,
    "addLabels": true,
    "maxCommentsPerFile": 10
  }
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint

# Build
pnpm build
```

## Architecture

```
tools/ai-review/
├── src/
│   ├── analyzers/          # Specialized analyzers
│   │   ├── security-analyzer.ts
│   │   ├── performance-analyzer.ts
│   │   ├── quality-analyzer.ts
│   │   ├── test-analyzer.ts
│   │   └── documentation-analyzer.ts
│   ├── engine/             # Core review engine
│   │   ├── review-engine.ts
│   │   └── learning-engine.ts
│   ├── reporters/          # Output formatters
│   │   ├── markdown-reporter.ts
│   │   ├── json-reporter.ts
│   │   └── console-reporter.ts
│   ├── utils/              # Utilities
│   │   └── metrics-collector.ts
│   ├── types/              # TypeScript types
│   │   └── index.ts
│   ├── cli.ts              # CLI interface
│   └── index.ts            # Main entry point
├── config.json             # Configuration
├── package.json
└── tsconfig.json
```

## Examples

See sample reviews in `docs/development/sample-reviews/`:
- Security review example
- Performance review example
- Comprehensive review example

## Troubleshooting

### Common Issues

**API Key Error**
```bash
export ANTHROPIC_API_KEY="your-key"
```

**Too Many False Positives**
- Enable learning engine
- Adjust thresholds in config
- Provide feedback on issues

**Slow Reviews**
- Reduce maxTokens
- Disable verbose analyzers
- Use file exclusions

### Debug Mode

```bash
AI_REVIEW_DEBUG=true pnpm ai-review review --pr-number 123
```

## Contributing

1. Add custom analyzers in `src/analyzers/`
2. Update config schema in `config.json`
3. Add tests for new features
4. Update documentation

## Resources

- [Full Documentation](../../docs/development/ai-code-review.md)
- [GitHub Workflow](../../.github/workflows/ai-code-review.yml)
- [Sample Reviews](../../docs/development/sample-reviews/)

## License

MIT - See LICENSE file for details
