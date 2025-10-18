# AI Documentation Generation

The ORION platform includes a comprehensive AI-powered documentation generation system that automatically creates and maintains high-quality documentation for all packages and services.

## Overview

The documentation generator uses Claude AI to analyze code structure, extract API definitions, and generate natural language documentation that follows technical writing best practices.

## Features

### 1. Intelligent Code Analysis

- **TypeScript Analysis**: Deep analysis of TypeScript code including classes, interfaces, functions, and types
- **Decorator Extraction**: Automatic extraction of NestJS decorators (@Controller, @Get, @ApiTags, etc.)
- **Dependency Tracking**: Maps imports, exports, and package dependencies
- **Metrics Calculation**: Computes code complexity, line counts, and documentation coverage

### 2. AI-Enhanced Documentation

The system uses Claude AI to generate:

- **Natural Language Descriptions**: Clear, professional descriptions of code elements
- **Usage Examples**: Practical, real-world code examples
- **Troubleshooting Guides**: Common issues and solutions
- **Best Practices**: Recommended patterns and approaches
- **Migration Instructions**: Step-by-step upgrade guides

### 3. Multiple Documentation Types

#### README Files
- Package overview and purpose
- Installation instructions
- Quick start guide
- API reference
- Configuration options
- Usage examples
- Contributing guidelines

#### API Documentation
- Endpoint definitions with HTTP methods
- Request/response schemas
- Authentication requirements
- Parameter documentation
- Status codes and error responses
- OpenAPI 3.0 compatible output

#### Type Definitions
- Interface documentation
- Type alias descriptions
- Enum value explanations
- Generic type parameters
- Type relationships and inheritance

#### JSDoc Comments
- Function/method descriptions
- Parameter documentation
- Return type descriptions
- Usage examples
- Since/deprecated annotations

#### Architecture Decision Records (ADRs)
- Decision context and rationale
- Alternatives considered
- Consequences (positive and negative)
- Status tracking
- Cross-references

#### Changelogs
- Conventional Commits format
- Grouped by change type
- Linked to issues and PRs
- Version tracking
- Breaking change highlights

#### Migration Guides
- Version-to-version upgrade paths
- Breaking change descriptions
- Step-by-step migration instructions
- Code examples (before/after)
- Rollback procedures

## Architecture

### Components

```
tools/doc-generator/
├── generator.ts              # Main documentation generator service
├── cli.ts                    # Command-line interface
├── config.json              # Documentation standards and settings
├── analyzers/
│   ├── code-analyzer.ts     # TypeScript code analysis
│   └── api-analyzer.ts      # NestJS API endpoint analysis
├── formatters/
│   ├── markdown-formatter.ts # Markdown output formatting
│   └── openapi-formatter.ts  # OpenAPI specification formatting
└── templates/
    ├── readme.hbs           # README template
    ├── api.hbs             # API documentation template
    ├── jsdoc.hbs           # JSDoc comment template
    ├── changelog.hbs       # Changelog template
    ├── migration.hbs       # Migration guide template
    └── adr.hbs             # ADR template
```

### Code Analysis Flow

1. **File Discovery**: Recursively scan package directories for TypeScript files
2. **AST Parsing**: Parse files into TypeScript Abstract Syntax Trees
3. **Element Extraction**: Extract classes, interfaces, functions, decorators
4. **Metadata Collection**: Gather JSDoc comments, type information, locations
5. **Dependency Mapping**: Track imports and exports
6. **Metrics Calculation**: Compute complexity and coverage statistics

### AI Generation Flow

1. **Context Building**: Aggregate code analysis results into structured context
2. **Prompt Construction**: Build prompts for specific documentation types
3. **Claude API Call**: Send requests to Claude with appropriate temperature/tokens
4. **Response Processing**: Extract and format generated content
5. **Template Application**: Merge AI content with templates
6. **Output Generation**: Write formatted documentation to files

## Usage

### Generate All Documentation

```bash
pnpm generate:docs
```

This generates:
- README.md for each package
- API.md for services with controllers
- TYPES.md for type definitions
- CHANGELOG.md tracking changes

### Generate Specific Documentation Type

```bash
# README files only
pnpm generate:readme

# API documentation only
pnpm generate:api-docs
```

### Generate for Specific Package

```bash
pnpm generate:docs --package auth
```

### Validate Documentation

```bash
pnpm docs:validate
```

Checks for:
- Minimum coverage thresholds
- Required sections present
- Valid markdown syntax
- Working links
- Code block language tags

### View Documentation Metrics

```bash
pnpm docs:metrics
```

Shows:
- Coverage percentage
- Freshness (days since last update)
- Completeness (% with examples)
- Element counts

## Configuration

### Documentation Standards

Located in `tools/doc-generator/config.json`:

```json
{
  "documentation": {
    "standards": {
      "style": "technical",
      "tone": "professional",
      "targetAudience": ["developers", "architects", "operators"]
    },
    "quality": {
      "coverage": {
        "minimum": 80,
        "targets": {
          "publicApi": 100,
          "exports": 95,
          "interfaces": 90
        }
      }
    }
  }
}
```

### AI Configuration

```json
{
  "generation": {
    "ai": {
      "enabled": true,
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "temperature": 0.3,
      "maxTokens": 2000
    }
  }
}
```

Lower temperature (0.3) ensures consistent, factual documentation.

## Quality Metrics

### Coverage
Percentage of exported code elements with documentation.

**Formula**: `(documented elements / total exported elements) × 100`

**Targets**:
- Public API: 100%
- Exports: 95%
- Interfaces: 90%
- Types: 85%

### Freshness
How up-to-date documentation is relative to code changes.

**Calculation**: Days since last documentation update vs. last code change

**Thresholds**:
- Green: < 7 days
- Yellow: 7-30 days
- Red: > 30 days

### Completeness
Percentage of elements with examples and comprehensive docs.

**Includes**:
- Description present
- Examples provided
- Parameters documented
- Return types described

## Continuous Integration

### Automated Checks

The GitHub Actions workflow (`.github/workflows/documentation-update.yml`) automatically:

1. **On Push to Main**:
   - Detects code changes
   - Regenerates affected documentation
   - Creates PR if documentation drift detected

2. **On Pull Requests**:
   - Validates documentation completeness
   - Checks coverage thresholds
   - Comments with metrics
   - Flags documentation drift

3. **Scheduled Runs**:
   - Weekly documentation refresh
   - Stale documentation detection
   - Metrics reporting

### Manual Triggers

```bash
# Force regeneration
pnpm generate:docs --force

# Validate with auto-fix
pnpm docs:validate --fix

# Generate with specific AI model
ANTHROPIC_MODEL=claude-3-opus-20240229 pnpm generate:docs
```

## Best Practices

### For Generated Documentation

1. **Review AI Output**: Always review AI-generated content for accuracy
2. **Add Context**: Enhance generated docs with project-specific details
3. **Update Examples**: Ensure examples use current APIs and patterns
4. **Link Related Docs**: Cross-reference related documentation
5. **Version Appropriately**: Update version numbers in changelogs

### For Code Comments

1. **Write JSDoc First**: Add JSDoc comments before generating docs
2. **Be Descriptive**: Explain "why" not just "what"
3. **Include Examples**: Add @example tags for complex functions
4. **Document Parameters**: Describe each parameter's purpose
5. **Note Side Effects**: Document any side effects or mutations

### For Templates

1. **Consistent Structure**: Maintain consistent section ordering
2. **Clear Headings**: Use descriptive, hierarchical headings
3. **Code Highlighting**: Specify languages for all code blocks
4. **Working Examples**: Ensure all examples are runnable
5. **Version Compatibility**: Note version requirements

## Advanced Features

### Diagram Generation

The system can generate Mermaid diagrams:

```typescript
// Automatically generates class diagram from:
class AuthService {
  constructor(private userRepo: UserRepository) {}
  async login(credentials: LoginDto) { }
}
```

### API Client Generation

Generate API clients from OpenAPI specs:

```bash
pnpm generate:api-client --service auth --output ./clients
```

### Changelog Automation

Auto-generate changelogs from git commits:

```bash
pnpm generate:changelog --from v1.0.0 --to v1.1.0
```

### Documentation Search Index

Build searchable index of all documentation:

```bash
pnpm docs:index
```

## Troubleshooting

### Issue: Low Documentation Coverage

**Solution**: Run with `--verbose` to identify undocumented elements:
```bash
pnpm generate:docs --verbose
```

### Issue: AI Generation Fails

**Solution**: Check ANTHROPIC_API_KEY environment variable:
```bash
echo $ANTHROPIC_API_KEY
```

### Issue: Documentation Drift

**Solution**: Enable auto-update in CI or run manually:
```bash
pnpm generate:docs --sync
```

### Issue: Invalid Markdown

**Solution**: Run validation with auto-fix:
```bash
pnpm docs:validate --fix
```

## Performance Considerations

### Large Codebases

For projects with many packages:
- Use `--package` flag for incremental updates
- Enable caching of analysis results
- Run in parallel for multiple packages

### API Rate Limits

Claude API has rate limits:
- Cache generated content
- Batch related documentation
- Use lower token limits for simple docs

### Build Time Optimization

```bash
# Quick generation (no AI)
pnpm generate:docs --no-ai

# Only changed files
pnpm generate:docs --changed
```

## Future Enhancements

Planned features:
- [ ] Multi-language documentation (i18n)
- [ ] Interactive API playground
- [ ] Video tutorial generation
- [ ] Diagram auto-generation from architecture
- [ ] Documentation versioning
- [ ] Search and analytics
- [ ] PDF export
- [ ] Integration with Confluence/Notion

## References

- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [NestJS Documentation](https://docs.nestjs.com/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Architecture Decision Records](https://adr.github.io/)
- [Claude API Documentation](https://docs.anthropic.com/)

## Support

For issues or questions:
- Open an issue in the repository
- Check existing documentation in `/docs`
- Review configuration in `tools/doc-generator/config.json`
- Run diagnostics: `pnpm docs:validate --verbose`
