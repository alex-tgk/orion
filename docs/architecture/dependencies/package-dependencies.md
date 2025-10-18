# Package Dependencies

**Last Updated:** Auto-generated

## Overview

This document describes the NPM package dependencies used across the ORION microservices platform.

## Runtime Dependencies

### Core NestJS Framework

```mermaid
graph TB
    app[ORION Services]
    app --> nestjs_core[@nestjs/core]
    app --> nestjs_common[@nestjs/common]
    app --> nestjs_platform[@nestjs/platform-express]

    nestjs_core --> reflect[reflect-metadata]
    nestjs_core --> rxjs[rxjs]
    nestjs_platform --> express[express]

    style nestjs_core fill:#e74c3c,color:#fff
    style nestjs_common fill:#e74c3c,color:#fff
    style nestjs_platform fill:#e74c3c,color:#fff
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/core` | ^11.1.6 | Core NestJS framework |
| `@nestjs/common` | ^11.1.6 | Common utilities and decorators |
| `@nestjs/platform-express` | ^11.1.6 | Express HTTP server adapter |

### Authentication & Authorization

```mermaid
graph LR
    auth[Auth Service]
    auth --> jwt[@nestjs/jwt]
    auth --> passport[@nestjs/passport]
    auth --> bcrypt[bcrypt]

    jwt --> passport_jwt[passport-jwt]
    passport --> passport_core[passport]

    style auth fill:#3498db,color:#fff
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/jwt` | ^11.0.1 | JWT token generation and validation |
| `@nestjs/passport` | ^11.0.5 | Passport.js integration |
| `passport` | ^0.7.0 | Authentication middleware |
| `passport-jwt` | ^4.0.1 | JWT authentication strategy |
| `bcrypt` | ^6.0.0 | Password hashing |

### Database & ORM

```mermaid
graph TB
    services[Services]
    services --> prisma[@prisma/client]
    prisma --> postgres[(PostgreSQL)]

    style prisma fill:#2ecc71,color:#fff
    style postgres fill:#336791,color:#fff
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | ^6.17.1 | Type-safe database client |
| `prisma` | ^6.17.1 | Database toolkit and migrations |

### Message Queue & Caching

```mermaid
graph LR
    services[Services]
    services --> bull[@nestjs/bull]
    services --> ioredis[ioredis]

    bull --> bull_core[bull]
    bull_core --> redis[(Redis)]
    ioredis --> redis

    style bull fill:#f39c12
    style ioredis fill:#dc382d,color:#fff
    style redis fill:#dc382d,color:#fff
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/bull` | ^11.0.4 | Bull queue integration |
| `bull` | ^4.16.5 | Redis-based queue system |
| `ioredis` | ^5.8.1 | Redis client |

### Real-time Communication

```mermaid
graph TB
    admin[Admin UI]
    admin --> websockets[@nestjs/websockets]
    websockets --> socketio[socket.io]

    style websockets fill:#9b59b6,color:#fff
    style socketio fill:#010101,color:#fff
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/websockets` | ^11.1.6 | WebSocket support |
| `@nestjs/platform-socket.io` | ^11.1.6 | Socket.io adapter |
| `socket.io` | ^4.8.1 | Real-time bidirectional communication |

### API Documentation

```mermaid
graph LR
    services --> swagger[@nestjs/swagger]
    swagger --> swagger_ui[swagger-ui-express]

    style swagger fill:#85ea2d
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/swagger` | ^11.2.1 | OpenAPI/Swagger integration |
| `swagger-ui-express` | ^5.0.1 | Swagger UI middleware |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `class-transformer` | ^0.5.1 | Object transformation |
| `class-validator` | ^0.14.2 | Validation decorators |
| `lodash` | ^4.17.21 | Utility functions |
| `uuid` | ^13.0.0 | UUID generation |
| `axios` | ^1.6.0 | HTTP client |
| `rxjs` | ^7.8.2 | Reactive programming |
| `fp-ts` | ^2.16.11 | Functional programming utilities |

### Security & Monitoring

| Package | Version | Purpose |
|---------|---------|---------|
| `helmet` | ^8.0.0 | Security headers middleware |
| `@nestjs/throttler` | ^6.4.0 | Rate limiting |
| `@sentry/node` | ^10.20.0 | Error tracking and monitoring |

### Configuration & Scheduling

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/config` | ^4.0.2 | Configuration management |
| `@nestjs/schedule` | ^6.0.1 | Cron jobs and scheduling |
| `@nestjs/event-emitter` | ^3.0.1 | Event-driven architecture |

## Development Dependencies

### Build Tools

```mermaid
graph TB
    dev[Development]
    dev --> nx[Nx]
    dev --> webpack[@nx/webpack]
    dev --> typescript[TypeScript]

    nx --> jest[@nx/jest]
    nx --> eslint[@nx/eslint]

    style nx fill:#143055,color:#fff
    style typescript fill:#3178c6,color:#fff
```

| Package | Version | Purpose |
|---------|---------|---------|
| `nx` | ^21.6.5 | Monorepo build system |
| `@nx/workspace` | ^21.6.5 | Nx workspace tools |
| `@nx/nest` | ^21.6.5 | NestJS integration |
| `@nx/webpack` | 21.6.5 | Webpack integration |
| `typescript` | ^5.9.3 | TypeScript compiler |

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | Testing framework |
| `@nx/jest` | ^21.6.5 | Nx Jest integration |
| `ts-jest` | ^29.4.5 | TypeScript transformer for Jest |
| `@nestjs/testing` | ^11.0.0 | NestJS testing utilities |
| `supertest` | ^7.1.4 | HTTP assertion library |
| `@testing-library/react` | ^16.3.0 | React testing utilities |
| `@testing-library/jest-dom` | ^6.9.1 | Custom Jest matchers |

### Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^9.37.0 | JavaScript linter |
| `@nx/eslint` | ^21.6.5 | Nx ESLint integration |
| `prettier` | ^3.6.2 | Code formatter |
| `husky` | ^9.1.7 | Git hooks |
| `lint-staged` | ^16.2.4 | Run linters on staged files |
| `@commitlint/cli` | ^20.1.0 | Commit message linting |

### Documentation

| Package | Version | Purpose |
|---------|---------|---------|
| `typedoc` | ^0.26.0 | TypeScript documentation generator |
| `@compodoc/compodoc` | ^1.1.25 | NestJS documentation tool |
| `typedoc-plugin-markdown` | ^4.0.0 | Markdown output for TypeDoc |

### Dependency Analysis

| Package | Version | Purpose |
|---------|---------|---------|
| `dependency-cruiser` | ^17.1.0 | Dependency validation and visualization |
| `madge` | ^8.0.0 | Circular dependency detection |

## Dependency Tree

For a complete dependency tree, run:

```bash
pnpm list --depth=3
```

Or view the auto-generated report:

```bash
cat docs/architecture/dependencies/reports/package-tree.json
```

## Package Update Strategy

### Update Schedule

- **Patch updates:** Automatically via Dependabot (weekly)
- **Minor updates:** Review and update monthly
- **Major updates:** Review quarterly, test thoroughly

### Security Updates

Security vulnerabilities are addressed immediately:

```bash
npm audit
pnpm audit --fix
```

### Version Pinning

- **Production dependencies:** Use caret ranges (`^x.y.z`)
- **Development dependencies:** Use caret ranges (`^x.y.z`)
- **Critical packages:** Consider exact versions for stability

## Forbidden Dependencies

The following dependencies are forbidden by policy:

1. Unmaintained packages (archived or deprecated)
2. Packages with known security vulnerabilities
3. Packages with incompatible licenses
4. Direct imports between services (use `@orion/shared`)

See `.dependency-cruiser.js` for enforcement rules.

## Dependency Visualization

Generate visual dependency graphs:

```bash
# Run full analysis
npm run analyze:deps

# Interactive visualization
open tools/dependency-graph/index.html
```

## Related Documentation

- [Service Dependencies](./service-dependencies.md)
- [Database Dependencies](./database-dependencies.md)
- [Circular Dependencies](./circular-dependencies.md)
- [Dependency Management Guide](../../development/dependency-management.md)
