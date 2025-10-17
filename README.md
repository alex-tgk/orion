# 🚀 ORION - Intelligent Microservices Platform

> A revolutionary microservices platform that uses CLI-based AI integration (NO API TOKENS) to create a self-improving, self-documenting system.

## 🌟 Vision

ORION is not just another microservices platform - it's a **thinking, learning, and self-improving system** that leverages CLI-based AI tools to continuously optimize itself. Every error becomes a learning opportunity, every interaction builds knowledge, and every day brings reflection and improvement.

## 🎯 Core Principles

1. **CLI-ONLY AI** - NEVER request API tokens. ALL AI tools communicate via CLI stdin/stdout
2. **PHASE-GATED** - Each phase MUST produce working software before proceeding
3. **SPEC-FIRST** - Every service requires a specification before coding
4. **SELF-IMPROVING** - The system continuously analyzes and improves itself
5. **OBSERVABLE** - Every action is traced, logged, and measurable
6. **THINK-FIRST** - Always understand WHY before implementing HOW

## 📋 Architecture

### Service Communication
- **External**: REST with OpenAPI documentation
- **Internal**: NestJS MessagePattern
- **AI Tools**: CLI via stdin/stdout (NO API TOKENS)

### Data Strategy
- Each service owns its database
- No shared databases
- Event sourcing for audit trail
- CQRS where beneficial

## 🏗️ Project Structure

```
orion/
├── .claude/              # AI agent configurations and knowledge base
│   ├── agents/          # Specialized AI agents (architect, debugger, tester, documenter)
│   ├── memory/          # Accumulated knowledge and patterns
│   ├── specs/           # Service specifications
│   ├── thinking/        # Thinking frameworks and methodologies
│   └── mcp/            # MCP server configurations
├── packages/            # Microservices packages
│   ├── shared/         # Shared libraries and utilities
│   ├── auth/           # Authentication service
│   ├── ai-interface/   # AI CLI integration layer
│   ├── mcp-server/     # Multi-agent coordination platform
│   ├── orchestrator/   # Service orchestration
│   ├── vector-db/      # Vector database for AI context
│   ├── dev-tools/      # Development and reflection tools
│   └── ...             # Additional services
└── ...
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- pnpm >= 8
- Git

### Installation

```bash
# Install dependencies
pnpm install

# Set up git hooks
pnpm prepare

# Verify installation
pnpm health
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Start a specific service
pnpm dev:service <service-name>

# Start only affected services (based on git changes)
pnpm dev:affected
```

### Testing

```bash
# Run tests for affected projects
pnpm test

# Run all tests
pnpm test:all

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Code Quality

```bash
# Lint affected projects
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Building

```bash
# Build affected projects
pnpm build

# Build all projects
pnpm build:all

# Production build
pnpm build:prod
```

## 🧠 AI-Powered Features

### Daily Reflection
The system performs daily reflection at 6 PM, analyzing:
- Code commits and changes
- Performance metrics
- Error patterns
- Test coverage
- System health

```bash
# Manually trigger reflection
pnpm reflect
```

### AI Assistance

```bash
# Get AI assistance for current task
pnpm ai:assist

# Get suggestions for next steps
pnpm ai:suggest
```

### Health & Diagnostics

```bash
# Check system health
pnpm health

# View metrics
pnpm metrics

# Diagnose issues
pnpm diagnose
```

## 📊 Development Phases

### ✅ Phase 0: Foundation (Current)
- [x] Nx workspace created
- [x] ESLint + Prettier configured
- [x] .claude/ structure created
- [x] Git initialized
- [x] Base dependencies installed

### 📅 Phase 1: Core Services (Week 1)
- [ ] Auth service with JWT
- [ ] Shared library created
- [ ] Redis integrated
- [ ] Health checks working
- [ ] Rate limiting implemented

### 📅 Phase 2: AI Integration (Week 2)
- [ ] CLI adapters for all tools
- [ ] MCP server running
- [ ] WebSocket communication
- [ ] Error recovery working
- [ ] Thinking detection implemented

### 📅 Phase 3: Self-Management (Week 3)
- [ ] Reflection service active
- [ ] GitHub integration working
- [ ] Automated issue creation
- [ ] Documentation updates automated

### 📅 Phase 4: Observability (Week 4)
- [ ] OpenTelemetry integrated
- [ ] Grafana dashboards created
- [ ] Prometheus metrics exported
- [ ] Distributed tracing working

### 📅 Phase 5: Advanced Features
- [ ] Vector DB integrated
- [ ] Feature flags working
- [ ] Search functionality
- [ ] Analytics dashboard

## 🤝 Contributing

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new authentication service
fix: resolve token expiration issue
docs: update API documentation
refactor: simplify error handling
test: add unit tests for auth service
```

### Development Workflow
1. Create a feature branch
2. Write specifications first
3. Implement with tests
4. Document changes
5. Submit PR

## 📖 Documentation

- **Architecture Decisions**: `.claude/memory/architecture.md`
- **Code Patterns**: `.claude/memory/patterns.md`
- **Debugging Wisdom**: `.claude/memory/debugging-wisdom.md`
- **Thinking Framework**: `.claude/thinking/framework.md`
- **Full Instructions**: `.claude/instructions.md`

## 🔧 Utility Commands

```bash
# Clean build artifacts
pnpm clean

# Check dependency graph
pnpm deps:check

# Migrate to latest Nx version
pnpm migrate

# Generate documentation
pnpm docs:generate

# Serve documentation
pnpm docs:serve
```

## 🎓 Learning & Reflection

ORION learns from every interaction:
- **Error Patterns** - Automatically identifies and documents common issues
- **Performance Insights** - Tracks and optimizes slow operations
- **Code Patterns** - Recognizes and promotes best practices
- **Test Coverage** - Monitors and improves test quality

## 📈 Success Metrics

The system tracks:
- Service health and uptime
- Test coverage (target: 80%+)
- Performance (P95 < 1000ms)
- Error rates (< 1%)
- AI tool connectivity
- Daily reflection consistency

## 🛡️ Security

- JWT-based authentication
- Refresh token rotation
- Rate limiting per user
- Session management in Redis
- No hardcoded secrets
- Secure by default

## 📝 License

MIT

## 🌐 Links

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://nestjs.com)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Built with thinking, designed for growth, powered by AI**

*The journey of a thousand microservices begins with a single commit.*
