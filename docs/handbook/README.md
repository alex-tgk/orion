# ORION Developer Handbook

Welcome to the ORION Developer Handbook - your comprehensive guide to building, maintaining, and contributing to the ORION microservices platform.

## Table of Contents

### Getting Started
- [Getting Started Guide](./getting-started.md) - Environment setup, prerequisites, and first-time setup

### Development
- [Development Workflow](./development-workflow.md) - Daily workflow, branching, commits, and PRs
- [Coding Standards](./coding-standards.md) - TypeScript, NestJS patterns, and best practices
- [Testing Guide](./testing.md) - Testing philosophy and patterns

### Operations
- [Debugging Guide](./debugging.md) - Tools, techniques, and troubleshooting
- [Deployment Guide](./deployment.md) - Deployment process and rollback procedures

## Quick Links

### Essential Commands
```bash
# Development
pnpm dev                    # Start all services
pnpm dev:service <name>     # Start specific service

# Testing
pnpm test                   # Run affected tests
pnpm test:all              # Run all tests
pnpm test:coverage         # Run with coverage

# Quality
pnpm lint                   # Lint code
pnpm format                # Format code
pnpm type-check            # Type check

# Build
pnpm build                  # Build affected
pnpm build:all             # Build all
```

### Key Resources
- [Project README](../../README.md)
- [Architecture Documentation](../architecture/)
- [API Documentation](../api/)
- [Contributing Guide](../contributing/)

## Platform Overview

ORION is an intelligent microservices platform that uses CLI-based AI integration to create a self-improving, self-documenting system.

### Core Principles
1. **CLI-ONLY AI** - All AI tools communicate via CLI stdin/stdout
2. **PHASE-GATED** - Each phase must produce working software
3. **SPEC-FIRST** - Every service requires a specification before coding
4. **SELF-IMPROVING** - The system continuously analyzes and improves itself
5. **OBSERVABLE** - Every action is traced, logged, and measurable
6. **THINK-FIRST** - Always understand WHY before implementing HOW

### Technology Stack

**Backend**
- Runtime: Node.js 18+
- Framework: NestJS
- Language: TypeScript 5.9+
- Package Manager: pnpm 10+

**Data**
- Database: PostgreSQL (Prisma ORM)
- Cache: Redis
- Message Queue: Bull

**Testing**
- Framework: Jest
- E2E: Playwright
- Coverage Target: 80%+

**DevOps**
- Monorepo: Nx
- CI/CD: GitHub Actions, GitLab CI
- Containers: Docker
- Orchestration: Kubernetes (Helm)

## Project Structure

```
orion/
├── .claude/                # AI agent configurations
│   ├── agents/            # Specialized AI agents
│   ├── memory/            # Accumulated knowledge
│   ├── specs/             # Service specifications
│   └── mcp/              # MCP server configurations
├── packages/              # Microservices
│   ├── shared/           # Shared libraries
│   ├── auth/             # Authentication service
│   ├── user/             # User management
│   ├── gateway/          # API Gateway
│   ├── notifications/    # Notification service
│   └── ...               # Additional services
├── docs/                  # Documentation
├── scripts/              # Utility scripts
└── k8s/                  # Kubernetes manifests
```

## Getting Help

### Documentation
- Start with [Getting Started](./getting-started.md) if you're new
- Check [Debugging Guide](./debugging.md) for common issues
- Review [Testing Guide](./testing.md) for testing questions

### AI Assistance
```bash
# Get AI help for current task
pnpm ai:assist

# Get suggestions for next steps
pnpm ai:suggest

# Run diagnostics
pnpm diagnose
```

### System Health
```bash
# Check system health
pnpm health

# View metrics
pnpm metrics
```

## Contributing

We welcome contributions! Please:
1. Read the [Development Workflow](./development-workflow.md)
2. Follow [Coding Standards](./coding-standards.md)
3. Write tests per [Testing Guide](./testing.md)
4. Submit PRs using our template

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: This handbook
- **AI Help**: `pnpm ai:assist`

## License

MIT

---

**Built with thinking, designed for growth, powered by AI**

Last Updated: 2025-10-18
