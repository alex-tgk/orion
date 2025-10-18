# ORION Project Overview

## Purpose
ORION is an intelligent microservices platform that uses CLI-based AI integration to create a self-improving, self-documenting system. It's designed to be a thinking, learning, and self-improving system that leverages CLI-based AI tools to continuously optimize itself.

## Core Principles
1. **CLI-ONLY AI** - All AI tools communicate via CLI stdin/stdout (NO API TOKENS)
2. **PHASE-GATED** - Each phase must produce working software before proceeding
3. **SPEC-FIRST** - Every service requires a specification before coding
4. **SELF-IMPROVING** - The system continuously analyzes and improves itself
5. **OBSERVABLE** - Every action is traced, logged, and measurable
6. **THINK-FIRST** - Always understand WHY before implementing HOW

## Tech Stack
- **Runtime**: Node.js >= 18
- **Package Manager**: pnpm >= 8
- **Monorepo Tool**: Nx (v21.6.5)
- **Framework**: NestJS (v11.x)
- **Language**: TypeScript 5.9.3 with strict mode enabled
- **Database ORM**: Prisma (v6.17.1)
- **Cache/Session**: Redis via ioredis
- **Authentication**: JWT with Passport
- **Message Queue**: Bull with Redis
- **WebSockets**: Socket.IO
- **Functional Programming**: fp-ts
- **Testing**: Jest
- **Code Quality**: ESLint 9 (flat config), Prettier
- **Git Hooks**: Husky + lint-staged
- **Commit Convention**: Commitlint with Conventional Commits

## Architecture
- **External Communication**: REST with OpenAPI documentation
- **Internal Communication**: NestJS MessagePattern
- **AI Tools**: CLI via stdin/stdout (NO API TOKENS)
- **Data Strategy**: Each service owns its database, no shared databases, event sourcing for audit trail

## Project Type
Nx monorepo with multiple NestJS microservices organized as packages.
