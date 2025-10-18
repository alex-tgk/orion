# AI Documentation Generator

Intelligent documentation generation system for the ORION microservices platform.

## Features

- **Code Analysis**: Deep TypeScript AST analysis
- **API Documentation**: NestJS controller endpoint extraction
- **AI Enhancement**: Claude-powered natural language generation
- **Multiple Formats**: Markdown, HTML, JSON, OpenAPI
- **Quality Metrics**: Coverage, freshness, completeness tracking
- **Auto-Update**: CI/CD integration with drift detection

## Quick Start

```bash
# Generate all documentation
pnpm generate:docs

# Generate for specific package
pnpm generate:docs --package auth

# Validate documentation
pnpm docs:validate

# Show metrics
pnpm docs:metrics
```

## Architecture

```
doc-generator/
├── generator.ts          # Main service
├── cli.ts               # CLI interface
├── config.json          # Configuration
├── analyzers/           # Code analysis
│   ├── code-analyzer.ts
│   └── api-analyzer.ts
├── formatters/          # Output formatting
│   ├── markdown-formatter.ts
│   ├── openapi-formatter.ts
│   └── html-formatter.ts
└── templates/           # Documentation templates
    ├── readme.hbs
    ├── api.hbs
    ├── jsdoc.hbs
    ├── changelog.hbs
    ├── migration.hbs
    └── adr.hbs
```

## Configuration

Edit `config.json` to customize:

- Documentation standards (style, tone, audience)
- Quality thresholds (coverage, completeness)
- AI settings (model, temperature, tokens)
- Output formats and destinations
- Template selections

## Documentation Types

### README Files
- Package overview
- Installation guide
- API reference
- Examples

### API Documentation
- Endpoint definitions
- Request/response schemas
- Authentication
- Examples

### Type Definitions
- Interfaces
- Type aliases
- Enums
- Generics

### JSDoc Comments
- Function descriptions
- Parameter docs
- Return types
- Examples

### ADRs
- Decision context
- Alternatives
- Consequences
- Status

### Changelogs
- Version history
- Breaking changes
- Migration paths

## AI Features

Uses Claude AI for:
- Natural language descriptions
- Code examples
- Troubleshooting guides
- Best practices
- Migration instructions

## Quality Metrics

### Coverage
% of exported elements with documentation

**Targets:**
- Public API: 100%
- Exports: 95%
- Interfaces: 90%

### Freshness
Days since last update

**Thresholds:**
- Green: < 7 days
- Yellow: 7-30 days
- Red: > 30 days

### Completeness
% with examples and full documentation

## CI/CD Integration

GitHub Actions workflow automatically:
- Detects code changes
- Regenerates documentation
- Validates completeness
- Creates PRs for updates
- Reports metrics

## CLI Commands

```bash
# Generate documentation
ts-node cli.ts --command generate

# Specific package
ts-node cli.ts --command generate --package auth

# Specific type
ts-node cli.ts --command generate --type readme

# Validate
ts-node cli.ts --command validate

# Show metrics
ts-node cli.ts --command metrics

# Help
ts-node cli.ts --help
```

## Development

### Adding New Analyzers

1. Create analyzer in `analyzers/`
2. Implement analysis interface
3. Export from `analyzers/index.ts`
4. Use in `generator.ts`

### Adding New Formatters

1. Create formatter in `formatters/`
2. Implement formatting methods
3. Export from `formatters/index.ts`
4. Add to output options

### Adding New Templates

1. Create Handlebars template in `templates/`
2. Define template variables
3. Register in `config.json`
4. Use in generator

## Best Practices

1. **Write JSDoc First**: Add comments before generating
2. **Review AI Output**: Always verify generated content
3. **Keep Examples Current**: Update for API changes
4. **Link Related Docs**: Cross-reference documentation
5. **Version Appropriately**: Track in changelogs

## Troubleshooting

### Low Coverage

```bash
pnpm generate:docs --verbose
```

### AI Generation Fails

Check `ANTHROPIC_API_KEY` environment variable.

### Documentation Drift

```bash
pnpm generate:docs --sync
```

### Invalid Markdown

```bash
pnpm docs:validate --fix
```

## License

MIT
