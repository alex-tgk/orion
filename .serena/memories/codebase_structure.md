# ORION Codebase Structure

## Top-Level Directory Structure
```
orion/
├── .claude/              # AI agent configurations and knowledge base
│   ├── agents/          # Specialized AI agents (architect, debugger, tester, documenter)
│   ├── memory/          # Accumulated knowledge and patterns
│   ├── specs/           # Service specifications
│   ├── thinking/        # Thinking frameworks and methodologies
│   └── mcp/            # MCP server configurations
├── packages/            # Microservices packages (monorepo)
├── prisma/             # Database schemas and migrations
├── .husky/             # Git hooks
├── .nx/                # Nx cache and workspace data
├── node_modules/       # Dependencies
└── ...                 # Configuration files
```

## Packages (Microservices)
The `packages/` directory contains all microservices:
- **shared**: Shared libraries and utilities
- **auth**: Authentication service with JWT and session management
- **auth-e2e**: E2E tests for auth service
- **ai-interface**: AI CLI integration layer
- **mcp-server**: Multi-agent coordination platform
- **orchestrator**: Service orchestration
- **vector-db**: Vector database for AI context
- **dev-tools**: Development and reflection tools
- **gateway**: API gateway
- **analytics**: Analytics service
- **notifications**: Notification service
- **webhooks**: Webhook handling
- **admin-ui**: Administrative UI
- **search**: Search functionality
- **storage**: Storage service
- **audit**: Audit logging
- **scheduler**: Task scheduling
- **cache**: Caching layer
- **config**: Configuration management
- **secrets**: Secret management
- **logger**: Logging utilities
- **migrations**: Database migrations

## Configuration Files
- `package.json`: Root package with workspace scripts
- `nx.json`: Nx workspace configuration
- `tsconfig.base.json`: Base TypeScript configuration with path aliases
- `eslint.config.js`: ESLint flat config (v9)
- `.prettierrc`: Prettier formatting rules
- `commitlint.config.js`: Commit message linting rules
- `.lintstagedrc.json`: Lint-staged configuration for pre-commit hooks
- `jest.preset.js`: Jest testing presets
- `.env`: Environment variables (not committed)
- `.env.example`: Environment variable examples

## Path Aliases
TypeScript path aliases are defined in `tsconfig.base.json`:
- `@orion/shared` → `packages/shared/src/index.ts`

Additional aliases are likely defined per package.
